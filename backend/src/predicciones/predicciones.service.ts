import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrediccionRendimiento } from './entities/prediccion-rendimiento.entity';
import { Temporada } from '../temporadas/entities/temporada.entity';

export interface FeatureVector {
  temperatura_promedio: number;
  humedad_suelo_promedio: number;
  precipitacion_acumulada: number;
  dias_desde_siembra: number;
  hectareas: number;
  tipo_suelo_encoded: number;
}

export interface PrediccionMLResponse {
  rendimiento_estimado_kg_ha: number;
  intervalo_inferior_kg_ha: number;
  intervalo_superior_kg_ha: number;
  confianza_porcentaje: number;
  version_modelo: string;
}

/** Mapa de tipo de suelo a código numérico */
const TIPO_SUELO_MAP: Record<string, number> = {
  'franco arenoso': 1,
  'franco arcilloso': 2,
  'franco limoso': 3,
  arenoso: 0,
  arcilloso: 2,
  limoso: 3,
  franco: 1,
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

@Injectable()
export class PrediccionesService {
  private readonly logger = new Logger(PrediccionesService.name);
  private readonly mlUrl: string;

  constructor(
    @InjectRepository(PrediccionRendimiento)
    private readonly prediccionRepo: Repository<PrediccionRendimiento>,
    @InjectRepository(Temporada)
    private readonly temporadaRepo: Repository<Temporada>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.mlUrl = this.configService.get<string>(
      'ML_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  /**
   * Obtiene la predicción vigente para una temporada.
   * Si existe una predicción de menos de 24 horas, la devuelve desde caché.
   * En caso contrario, construye el feature vector, llama al ML service,
   * persiste el resultado y lo retorna.
   */
  async obtenerPrediccion(
    temporadaId: string,
  ): Promise<PrediccionRendimiento> {
    // 1. Intentar caché (predicción < 24h)
    const cached = await this.prediccionRepo.findOne({
      where: { temporada: { id: temporadaId } },
      order: { generado_en: 'DESC' },
      relations: ['temporada'],
    });

    if (cached && Date.now() - cached.generado_en.getTime() < CACHE_TTL_MS) {
      this.logger.debug(`Cache hit para temporada ${temporadaId}`);
      return cached;
    }

    // 2. Construir feature vector desde lecturas reales
    const features = await this.construirFeatureVector(temporadaId);

    // 3. Invocar ML service
    const mlResp = await this.llamarServicioML(features);

    // 4. Persistir y retornar
    const nueva = this.prediccionRepo.create({
      temporada: { id: temporadaId },
      rendimiento_estimado_kg_ha: mlResp.rendimiento_estimado_kg_ha,
      intervalo_inferior_kg_ha: mlResp.intervalo_inferior_kg_ha,
      intervalo_superior_kg_ha: mlResp.intervalo_superior_kg_ha,
      confianza_porcentaje: mlResp.confianza_porcentaje,
      features_usadas: features as unknown as Record<string, unknown>,
      version_modelo: mlResp.version_modelo,
    });

    return this.prediccionRepo.save(nueva);
  }

  /**
   * Construye el vector de características promediando las lecturas
   * de los últimos 30 días del lote asociado a la temporada.
   */
  private async construirFeatureVector(
    temporadaId: string,
  ): Promise<FeatureVector> {
    const temporada = await this.temporadaRepo.findOne({
      where: { id: temporadaId },
      relations: [
        'lote',
        'lote.sensores',
        'lote.sensores.lecturas',
      ],
    });

    if (!temporada) {
      throw new NotFoundException(`Temporada ${temporadaId} no encontrada`);
    }

    const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Lecturas no anómalas de los últimos 30 días
    const lecturas = temporada.lote.sensores.flatMap((s) =>
      (s.lecturas ?? []).filter(
        (l) => new Date(l.registrado_en) >= hace30dias && !l.es_anomalia,
      ).map((l) => ({ ...l, tipo: s.tipo })),
    );

    const byTipo = (tipo: string) =>
      lecturas.filter((l) => l.tipo === tipo).map((l) => Number(l.valor));

    const avg = (arr: number[]): number =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const diasSiembra = Math.floor(
      (Date.now() - new Date(temporada.fecha_siembra).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return {
      temperatura_promedio: avg(byTipo('temperatura')) || 25,
      humedad_suelo_promedio: avg(byTipo('humedad_suelo')) || 50,
      precipitacion_acumulada: byTipo('precipitacion').reduce((a, b) => a + b, 0),
      dias_desde_siembra: Math.max(0, diasSiembra),
      hectareas: Number(temporada.lote.hectareas) || 1,
      tipo_suelo_encoded:
        TIPO_SUELO_MAP[temporada.lote.tipo_suelo?.toLowerCase()] ?? 1,
    };
  }

  /**
   * Llama al microservicio FastAPI en POST /predict.
   * Lanza HttpException 503 si el servicio no responde.
   */
  private async llamarServicioML(
    features: FeatureVector,
  ): Promise<PrediccionMLResponse> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<PrediccionMLResponse>(
          `${this.mlUrl}/predict`,
          { features },
          { timeout: 12_000 },
        ),
      );
      this.logger.log(
        `ML predict → ${data.rendimiento_estimado_kg_ha} kg/ha ` +
          `(confianza: ${data.confianza_porcentaje}%)`,
      );
      return data;
    } catch (err: any) {
      this.logger.error(`Error llamando ML service: ${err?.message}`);
      throw new HttpException(
        'Servicio de predicción ML no disponible',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Lista el historial de predicciones de una temporada,
   * ordenadas de más reciente a más antigua.
   */
  async listarPredicciones(
    temporadaId: string,
    limite = 30,
  ): Promise<PrediccionRendimiento[]> {
    return this.prediccionRepo.find({
      where: { temporada: { id: temporadaId } },
      order: { generado_en: 'DESC' },
      take: limite,
    });
  }
}
