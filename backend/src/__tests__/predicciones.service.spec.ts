import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, HttpException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { PrediccionesService } from '../predicciones/predicciones.service';
import { PrediccionRendimiento } from '../predicciones/entities/prediccion-rendimiento.entity';
import { Temporada } from '../temporadas/entities/temporada.entity';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uuid = '00000000-0000-0000-0000-000000000001';

function crearPrediccionMock(
  overrides: Partial<PrediccionRendimiento> = {},
): PrediccionRendimiento {
  return {
    id: uuid,
    rendimiento_estimado_kg_ha: 8240,
    intervalo_inferior_kg_ha: 7100,
    intervalo_superior_kg_ha: 9380,
    confianza_porcentaje: 82.5,
    features_usadas: {},
    version_modelo: 'v1.0',
    generado_en: new Date(),
    temporada: { id: uuid } as Temporada,
    ...overrides,
  } as PrediccionRendimiento;
}

function crearTemporadaMock(): Temporada {
  return {
    id: uuid,
    fecha_siembra: new Date('2024-11-01'),
    lote: {
      id: uuid,
      hectareas: 12.5,
      tipo_suelo: 'franco arenoso',
      sensores: [
        {
          tipo: 'temperatura',
          lecturas: [
            {
              valor: 25.0,
              registrado_en: new Date(),
              es_anomalia: false,
              sensor: { tipo: 'temperatura' },
            },
          ],
        },
        {
          tipo: 'humedad_suelo',
          lecturas: [
            {
              valor: 52.0,
              registrado_en: new Date(),
              es_anomalia: false,
              sensor: { tipo: 'humedad_suelo' },
            },
          ],
        },
      ],
    },
  } as unknown as Temporada;
}

// ─── Mocks de repositorio ─────────────────────────────────────────────────────
const mockPrediccionRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

const mockTemporadaRepo = {
  findOne: jest.fn(),
};

const mockHttpService = {
  post: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, def?: string) =>
    key === 'ML_SERVICE_URL' ? 'http://localhost:8000' : def,
  ),
};

// ─── Test suite ───────────────────────────────────────────────────────────────
describe('PrediccionesService', () => {
  let service: PrediccionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrediccionesService,
        { provide: getRepositoryToken(PrediccionRendimiento), useValue: mockPrediccionRepo },
        { provide: getRepositoryToken(Temporada), useValue: mockTemporadaRepo },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PrediccionesService>(PrediccionesService);
    jest.clearAllMocks();
  });

  // ─── Cache válido ─────────────────────────────────────────────────────────
  describe('obtenerPrediccion — cache', () => {
    it('retorna predicción en caché si fue generada hace menos de 24h', async () => {
      const prediccionReciente = crearPrediccionMock({
        generado_en: new Date(Date.now() - 30 * 60 * 1000), // 30 min atrás
      });
      mockPrediccionRepo.findOne.mockResolvedValue(prediccionReciente);

      const resultado = await service.obtenerPrediccion(uuid);

      expect(resultado).toEqual(prediccionReciente);
      // El ML service NO debe ser llamado
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('llama al ML service cuando la predicción tiene más de 24h', async () => {
      const prediccionVieja = crearPrediccionMock({
        generado_en: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25h atrás
      });
      mockPrediccionRepo.findOne.mockResolvedValue(prediccionVieja);
      mockTemporadaRepo.findOne.mockResolvedValue(crearTemporadaMock());

      const mlRespuesta = {
        rendimiento_estimado_kg_ha: 8500,
        intervalo_inferior_kg_ha: 7200,
        intervalo_superior_kg_ha: 9800,
        confianza_porcentaje: 84.2,
        version_modelo: 'v1.0',
      };
      mockHttpService.post.mockReturnValue(of({ data: mlRespuesta }));

      const nueva = crearPrediccionMock({ rendimiento_estimado_kg_ha: 8500 });
      mockPrediccionRepo.create.mockReturnValue(nueva);
      mockPrediccionRepo.save.mockResolvedValue(nueva);

      const resultado = await service.obtenerPrediccion(uuid);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/predict',
        expect.objectContaining({ features: expect.any(Object) }),
        expect.any(Object),
      );
      expect(resultado.rendimiento_estimado_kg_ha).toBe(8500);
    });

    it('genera nueva predicción cuando no existe ninguna en BD', async () => {
      mockPrediccionRepo.findOne.mockResolvedValue(null);
      mockTemporadaRepo.findOne.mockResolvedValue(crearTemporadaMock());

      const mlRespuesta = {
        rendimiento_estimado_kg_ha: 7800,
        intervalo_inferior_kg_ha: 6500,
        intervalo_superior_kg_ha: 9100,
        confianza_porcentaje: 78.0,
        version_modelo: 'v1.0',
      };
      mockHttpService.post.mockReturnValue(of({ data: mlRespuesta }));

      const nueva = crearPrediccionMock({ rendimiento_estimado_kg_ha: 7800 });
      mockPrediccionRepo.create.mockReturnValue(nueva);
      mockPrediccionRepo.save.mockResolvedValue(nueva);

      const resultado = await service.obtenerPrediccion(uuid);
      expect(resultado).toBeDefined();
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Errores ──────────────────────────────────────────────────────────────
  describe('obtenerPrediccion — errores', () => {
    it('lanza NotFoundException si la temporada no existe', async () => {
      mockPrediccionRepo.findOne.mockResolvedValue(null);
      mockTemporadaRepo.findOne.mockResolvedValue(null);

      await expect(service.obtenerPrediccion('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza HttpException 503 si el ML service falla', async () => {
      mockPrediccionRepo.findOne.mockResolvedValue(null);
      mockTemporadaRepo.findOne.mockResolvedValue(crearTemporadaMock());
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      await expect(service.obtenerPrediccion(uuid)).rejects.toThrow(HttpException);
    });
  });

  // ─── Historial ────────────────────────────────────────────────────────────
  describe('listarPredicciones', () => {
    it('retorna las predicciones ordenadas por fecha descendente', async () => {
      const predicciones = [
        crearPrediccionMock({ generado_en: new Date('2025-04-30') }),
        crearPrediccionMock({ generado_en: new Date('2025-04-29') }),
      ];
      mockPrediccionRepo.find.mockResolvedValue(predicciones);

      const resultado = await service.listarPredicciones(uuid, 30);

      expect(resultado).toHaveLength(2);
      expect(mockPrediccionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { temporada: { id: uuid } },
          order: { generado_en: 'DESC' },
          take: 30,
        }),
      );
    });

    it('respeta el límite indicado', async () => {
      mockPrediccionRepo.find.mockResolvedValue([]);
      await service.listarPredicciones(uuid, 5);
      expect(mockPrediccionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });
});
