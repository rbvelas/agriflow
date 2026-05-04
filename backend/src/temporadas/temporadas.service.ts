import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Temporada, EstadoTemporada } from './entities/temporada.entity';
import { Cultivo } from './entities/cultivo.entity';
import { Sensor } from '../sensores/entities/sensor.entity';
import { LecturaSensor } from '../sensores/entities/lectura-sensor.entity';
import { PrediccionRendimiento } from '../predicciones/entities/prediccion-rendimiento.entity';

export interface CrearTemporadaDto {
  loteId: string;
  cultivoId: string;
  fecha_siembra: string; // ISO date
  fecha_cosecha_estimada?: string;
  notas?: string;
}

@Injectable()
export class TemporadasService {
  private readonly logger = new Logger(TemporadasService.name);

  constructor(
    @InjectRepository(Temporada)
    private readonly temporadaRepo: Repository<Temporada>,
    @InjectRepository(Cultivo)
    private readonly cultivoRepo: Repository<Cultivo>,
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
    @InjectRepository(LecturaSensor)
    private readonly lecturaRepo: Repository<LecturaSensor>,
    @InjectRepository(PrediccionRendimiento)
    private readonly prediccionRepo: Repository<PrediccionRendimiento>,
  ) {}

  async crear(dto: CrearTemporadaDto): Promise<Temporada> {
    const temporada = this.temporadaRepo.create({
      lote: { id: dto.loteId } as any,
      cultivo: { id: dto.cultivoId } as any,
      fecha_siembra: new Date(dto.fecha_siembra) as any,
      fecha_cosecha_estimada: dto.fecha_cosecha_estimada
        ? (new Date(dto.fecha_cosecha_estimada) as any)
        : undefined,
      notas: dto.notas,
      estado: 'activa',
    });
    
    const guardada = await this.temporadaRepo.save(temporada);
    
    // 🔥 GENERACIÓN AUTOMÁTICA DE DATOS INICIALES
    try {
      await this.inicializarDatosDemo(guardada.id, dto.loteId);
    } catch (err) {
      this.logger.error(`Error inicializando datos demo: ${err.message}`);
    }

    return guardada;
  }

  /**
   * Crea sensores, lecturas y una predicción inicial para que el dashboard
   * no se vea vacío al iniciar una temporada.
   */
  private async inicializarDatosDemo(temporadaId: string, loteId: string) {
    this.logger.log(`Inicializando datos demo para lote ${loteId}...`);

    // 1. Crear sensores básicos si no existen
    const tipos = [
      { tipo: 'temperatura', unidad: '°C' },
      { tipo: 'humedad_suelo', unidad: '%VWC' },
      { tipo: 'radiacion_solar', unidad: 'W/m²' },
    ];

    const sensores: Sensor[] = [];
    for (const t of tipos) {
      let s = await this.sensorRepo.findOne({ where: { lote: { id: loteId }, tipo: t.tipo as any } });
      if (!s) {
        s = this.sensorRepo.create({
          lote: { id: loteId } as any,
          tipo: t.tipo as any,
          unidad: t.unidad,
          modelo: 'AgriFlow Sim-V1',
          activo: true,
        });
        s = await this.sensorRepo.save(s);
      }
      sensores.push(s);
    }

    // 2. Generar lecturas de las últimas 24h
    const ahora = Date.now();
    const lecturas: Partial<LecturaSensor>[] = [];
    
    for (const s of sensores) {
      for (let i = 0; i < 24; i++) {
        const fecha = new Date(ahora - i * 60 * 60 * 1000);
        let valor = 0;
        if (s.tipo === 'temperatura') valor = 22 + Math.random() * 8;
        if (s.tipo === 'humedad_suelo') valor = 35 + Math.random() * 20;
        if (s.tipo === 'radiacion_solar') valor = Math.random() * 800;

        lecturas.push({
          sensor: s,
          valor: parseFloat(valor.toFixed(2)),
          registrado_en: fecha,
          fuente: 'simulado',
        });
      }
    }
    await this.lecturaRepo.save(lecturas);

    // 3. Crear primera predicción de rendimiento
    const pred = this.prediccionRepo.create({
      temporada: { id: temporadaId } as any,
      rendimiento_estimado_kg_ha: 7500 + Math.random() * 1500,
      intervalo_inferior_kg_ha: 6800,
      intervalo_superior_kg_ha: 9200,
      confianza_porcentaje: 82.5,
      features_usadas: { inicialización: 'automática' },
      version_modelo: 'v1.0-auto',
    });
    await this.prediccionRepo.save(pred);
    
    this.logger.log(`Datos demo inicializados con éxito.`);
  }

  async listarActivas(): Promise<Temporada[]> {
    return this.temporadaRepo.find({
      where: { estado: 'activa' },
      relations: ['lote', 'cultivo', 'predicciones'],
      order: { fecha_siembra: 'DESC' },
    });
  }

  async obtenerPorId(id: string): Promise<Temporada> {
    const t = await this.temporadaRepo.findOne({
      where: { id },
      relations: ['lote', 'cultivo', 'predicciones', 'eventos_riego'],
    });
    if (!t) throw new NotFoundException(`Temporada ${id} no encontrada`);
    return t;
  }

  async cambiarEstado(id: string, estado: EstadoTemporada): Promise<Temporada> {
    await this.temporadaRepo.update(id, { estado });
    return this.obtenerPorId(id);
  }

  async listarCultivos(): Promise<Cultivo[]> {
    return this.cultivoRepo.find({ order: { nombre: 'ASC' } });
  }

  async registrarCosecha(
    id: string,
    rendimientoReal: number,
    fechaCosecha?: string,
  ): Promise<Temporada> {
    await this.temporadaRepo.update(id, {
      rendimiento_real_kg_ha: rendimientoReal,
      fecha_cosecha_real: fechaCosecha
        ? (new Date(fechaCosecha) as any)
        : (new Date() as any),
      estado: 'cosechada',
    });
    return this.obtenerPorId(id);
  }
}
