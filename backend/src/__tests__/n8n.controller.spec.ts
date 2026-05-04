import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { N8nController } from '../n8n/n8n.controller';
import { LecturaSensor } from '../sensores/entities/lectura-sensor.entity';
import { Alerta } from '../alertas/entities/alerta.entity';
import { PrediccionRendimiento } from '../predicciones/entities/prediccion-rendimiento.entity';
import { WorkflowEjecucion } from '../n8n/entities/workflow-ejecucion.entity';

const TOKEN_VALIDO = 'Bearer test_secret_token';

const makeRepo = () => ({
  create: jest.fn((x) => x),
  save: jest.fn((x) => Promise.resolve({ id: 'nuevo-uuid', ...x })),
});

describe('N8nController', () => {
  let controller: N8nController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [N8nController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((k: string, def?: string) =>
              k === 'N8N_WEBHOOK_SECRET' ? 'test_secret_token' : def,
            ),
          },
        },
        { provide: getRepositoryToken(LecturaSensor), useValue: makeRepo() },
        { provide: getRepositoryToken(Alerta), useValue: makeRepo() },
        { provide: getRepositoryToken(PrediccionRendimiento), useValue: makeRepo() },
        { provide: getRepositoryToken(WorkflowEjecucion), useValue: makeRepo() },
      ],
    }).compile();

    controller = module.get<N8nController>(N8nController);
    jest.clearAllMocks();
  });

  // ─── Autorización ─────────────────────────────────────────────────────────
  it('rechaza petición sin token', async () => {
    await expect(
      controller.recibirLecturas('', { lecturas: [] }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza token incorrecto', async () => {
    await expect(
      controller.recibirLecturas('Bearer token_malo', { lecturas: [] }),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ─── Lecturas ─────────────────────────────────────────────────────────────
  describe('POST /lecturas', () => {
    it('inserta lecturas correctamente y retorna conteo', async () => {
      const body = {
        lecturas: [
          { sensor_id: 'uuid-1', valor: 25.5, fuente: 'simulado' as const },
          { sensor_id: 'uuid-2', valor: 48.3, fuente: 'simulado' as const },
        ],
      };
      const resp = await controller.recibirLecturas(TOKEN_VALIDO, body);
      expect(resp.data.insertados).toBe(2);
      expect(resp.error).toBeNull();
    });

    it('acepta hasta 500 lecturas (trunca el excedente)', async () => {
      const lecturas = Array.from({ length: 600 }, (_, i) => ({
        sensor_id: `uuid-${i}`,
        valor: 20 + i * 0.01,
      }));
      const resp = await controller.recibirLecturas(TOKEN_VALIDO, { lecturas });
      expect(resp.data.insertados).toBe(500);
    });
  });

  // ─── Predicciones ─────────────────────────────────────────────────────────
  describe('POST /predicciones', () => {
    it('persiste predicción y retorna el objeto guardado', async () => {
      const body = {
        temporada_id: 'temp-uuid',
        rendimiento_estimado_kg_ha: 8500,
        intervalo_inferior_kg_ha: 7200,
        intervalo_superior_kg_ha: 9800,
        confianza_porcentaje: 84.2,
        features_usadas: { temperatura_promedio: 25 },
      };
      const resp = await controller.recibirPrediccion(TOKEN_VALIDO, body);
      expect(resp.data).toBeDefined();
      expect(resp.error).toBeNull();
    });
  });

  // ─── Alertas ──────────────────────────────────────────────────────────────
  describe('POST /alertas', () => {
    it('crea alerta crítica correctamente', async () => {
      const body = {
        lote_id: 'lote-uuid',
        tipo: 'humedad_critica',
        severidad: 'critica' as const,
        mensaje: 'Humedad del suelo por debajo del punto de marchitez',
      };
      const resp = await controller.recibirAlerta(TOKEN_VALIDO, body);
      expect(resp.data).toBeDefined();
      expect(resp.error).toBeNull();
    });
  });

  // ─── Workflow log ──────────────────────────────────────────────────────────
  describe('POST /workflow-log', () => {
    it('registra log de workflow exitoso', async () => {
      const body = {
        nombre_workflow: 'ingesta_sensores',
        estado: 'exitoso' as const,
        metadata: { lecturas_procesadas: 45 },
      };
      const resp = await controller.registrarLog(TOKEN_VALIDO, body);
      expect(resp.data).toBeDefined();
    });
  });
});
