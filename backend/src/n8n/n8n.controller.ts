import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LecturaSensor } from '../sensores/entities/lectura-sensor.entity';
import { Alerta } from '../alertas/entities/alerta.entity';
import { PrediccionRendimiento } from '../predicciones/entities/prediccion-rendimiento.entity';
import { WorkflowEjecucion } from './entities/workflow-ejecucion.entity';

// ─── DTOs de entrada ──────────────────────────────────────────────────────────

interface LecturaDto {
  sensor_id: string;
  valor: number;
  registrado_en?: string;
  fuente?: 'sensor_fisico' | 'simulado' | 'api_externa' | 'interpolado';
}

interface PrediccionDto {
  temporada_id: string;
  rendimiento_estimado_kg_ha: number;
  intervalo_inferior_kg_ha: number;
  intervalo_superior_kg_ha: number;
  confianza_porcentaje: number;
  features_usadas: Record<string, unknown>;
}

interface AlertaDto {
  lote_id: string;
  tipo: string;
  severidad: 'baja' | 'media' | 'alta' | 'critica';
  mensaje: string;
}

interface WorkflowLogDto {
  nombre_workflow: string;
  estado: 'exitoso' | 'error';
  metadata?: Record<string, unknown>;
  error_mensaje?: string;
}

/**
 * Controlador de webhooks para n8n.
 * Todos los endpoints validan el token Bearer compartido
 * (N8N_WEBHOOK_SECRET) para prevenir peticiones no autorizadas.
 *
 * Endpoints expuestos:
 *   POST /api/webhooks/n8n/lecturas       — Ingesta masiva de sensores
 *   POST /api/webhooks/n8n/predicciones   — Guardar predicción ML
 *   POST /api/webhooks/n8n/alertas        — Registrar alerta de umbral
 *   POST /api/webhooks/n8n/workflow-log   — Log de ejecución de workflow
 */
@Controller('api/webhooks/n8n')
export class N8nController {
  private readonly logger = new Logger(N8nController.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(LecturaSensor)
    private readonly lecturaRepo: Repository<LecturaSensor>,
    @InjectRepository(Alerta)
    private readonly alertaRepo: Repository<Alerta>,
    @InjectRepository(PrediccionRendimiento)
    private readonly prediccionRepo: Repository<PrediccionRendimiento>,
    @InjectRepository(WorkflowEjecucion)
    private readonly workflowRepo: Repository<WorkflowEjecucion>,
  ) {}

  // ─── Autorización ─────────────────────────────────────────────────────────
  private autorizar(authHeader: string): void {
    const expected = `Bearer ${this.config.get<string>('N8N_WEBHOOK_SECRET', 'dev_token')}`;
    if (!authHeader || authHeader !== expected) {
      throw new UnauthorizedException('Token de webhook n8n inválido');
    }
  }

  // ─── Webhook 1: Lecturas de sensores ──────────────────────────────────────
  /**
   * Recibe un array de lecturas de sensores desde el Workflow 1 de n8n.
   * Acepta hasta 500 lecturas por lote para evitar timeouts.
   */
  @Post('lecturas')
  @HttpCode(HttpStatus.CREATED)
  async recibirLecturas(
    @Headers('authorization') auth: string,
    @Body() body: { lecturas: LecturaDto[] },
  ) {
    this.autorizar(auth);

    const lecturas = (body.lecturas ?? []).slice(0, 500);
    this.logger.log(`n8n → ${lecturas.length} lecturas recibidas`);

    const entidades = lecturas.map((l) =>
      this.lecturaRepo.create({
        sensor: { id: l.sensor_id } as any,
        valor: l.valor,
        registrado_en: l.registrado_en ? new Date(l.registrado_en) : new Date(),
        fuente: l.fuente ?? 'simulado',
      }),
    );

    await this.lecturaRepo.save(entidades);
    return { data: { insertados: entidades.length }, meta: { ok: true }, error: null };
  }

  // ─── Webhook 2: Predicción ML ─────────────────────────────────────────────
  /**
   * Recibe el resultado del modelo ML ejecutado desde el Workflow 2 nocturno.
   * Persiste la predicción y la asocia a la temporada indicada.
   */
  @Post('predicciones')
  @HttpCode(HttpStatus.CREATED)
  async recibirPrediccion(
    @Headers('authorization') auth: string,
    @Body() body: PrediccionDto,
  ) {
    this.autorizar(auth);
    this.logger.log(`n8n → predicción temporada ${body.temporada_id}: ${body.rendimiento_estimado_kg_ha} kg/ha`);

    const pred = await this.prediccionRepo.save(
      this.prediccionRepo.create({
        temporada: { id: body.temporada_id } as any,
        rendimiento_estimado_kg_ha: body.rendimiento_estimado_kg_ha,
        intervalo_inferior_kg_ha: body.intervalo_inferior_kg_ha,
        intervalo_superior_kg_ha: body.intervalo_superior_kg_ha,
        confianza_porcentaje: body.confianza_porcentaje,
        features_usadas: body.features_usadas ?? {},
        version_modelo: 'v1.0-n8n',
      }),
    );

    return { data: pred, meta: { ok: true }, error: null };
  }

  // ─── Webhook 3: Alertas ───────────────────────────────────────────────────
  /**
   * Recibe alertas generadas por umbrales detectados en el Workflow 3.
   * Registra la alerta en BD y la asocia al lote correspondiente.
   */
  @Post('alertas')
  @HttpCode(HttpStatus.CREATED)
  async recibirAlerta(
    @Headers('authorization') auth: string,
    @Body() body: AlertaDto,
  ) {
    this.autorizar(auth);
    this.logger.warn(
      `n8n → alerta ${body.severidad} en lote ${body.lote_id}: ${body.tipo}`,
    );

    const alerta = await this.alertaRepo.save(
      this.alertaRepo.create({
        lote: { id: body.lote_id } as any,
        tipo: body.tipo,
        severidad: body.severidad,
        mensaje: body.mensaje,
      }),
    );

    return { data: alerta, meta: { ok: true }, error: null };
  }

  // ─── Webhook 4: Log de workflow ───────────────────────────────────────────
  /**
   * Permite que n8n registre el estado final de una ejecución de workflow.
   * Útil para auditoría y diagnóstico desde el dashboard.
   */
  @Post('workflow-log')
  @HttpCode(HttpStatus.CREATED)
  async registrarLog(
    @Headers('authorization') auth: string,
    @Body() body: WorkflowLogDto,
  ) {
    this.autorizar(auth);

    const log = await this.workflowRepo.save(
      this.workflowRepo.create({
        nombre_workflow: body.nombre_workflow,
        estado: body.estado,
        finalizado_en: new Date(),
        metadata: body.metadata ?? {},
        error_mensaje: body.error_mensaje,
      }),
    );

    return { data: log, meta: { ok: true }, error: null };
  }
}
