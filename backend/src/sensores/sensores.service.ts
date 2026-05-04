import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Sensor } from './entities/sensor.entity';
import { LecturaSensor } from './entities/lectura-sensor.entity';
import { Alerta } from '../alertas/entities/alerta.entity';

@Injectable()
export class SensoresService {
  private readonly logger = new Logger(SensoresService.name);

  constructor(
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
    @InjectRepository(LecturaSensor)
    private readonly lecturaRepo: Repository<LecturaSensor>,
    @InjectRepository(Alerta)
    private readonly alertaRepo: Repository<Alerta>,
  ) {}

  /** Devuelve todos los sensores activos de un lote */
  async listarPorLote(loteId: string): Promise<Sensor[]> {
    return this.sensorRepo.find({
      where: { lote: { id: loteId }, activo: true },
      order: { instalado_en: 'ASC' },
    });
  }

  /**
   * Devuelve las lecturas de los últimas N horas para todos los sensores
   * de un lote, ordenadas cronológicamente.
   *
   * @param loteId - UUID del lote
   * @param horas  - Ventana temporal (1-168)
   */
  async ultimasLecturas(loteId: string, horas = 24): Promise<LecturaSensor[]> {
    const desde = new Date(Date.now() - horas * 60 * 60 * 1000);

    return this.lecturaRepo
      .createQueryBuilder('l')
      .innerJoinAndSelect('l.sensor', 's')
      .innerJoin('s.lote', 'lote', 'lote.id = :loteId', { loteId })
      .where('l.registrado_en >= :desde', { desde })
      .andWhere('l.es_anomalia = false')
      .orderBy('l.registrado_en', 'ASC')
      .take(500) // límite de seguridad
      .getMany();
  }

  /**
   * Registra lecturas masivas. Aplica detección básica de anomalías:
   * un valor es anómalo si supera 3 desviaciones estándar del historial
   * reciente (últimas 100 lecturas del sensor).
   */
  async registrarLecturas(
    lecturas: Array<{
      sensor_id: string;
      valor: number;
      registrado_en?: string;
      fuente?: string;
    }>,
  ): Promise<number> {
    const entidades: Partial<LecturaSensor>[] = await Promise.all(
      lecturas.map(async (l) => {
        const esAnomalia = await this.detectarAnomalia(l.sensor_id, l.valor);
        if (esAnomalia) {
          this.logger.warn(
            `Posible anomalía en sensor ${l.sensor_id}: valor=${l.valor}`,
          );
        }
        return {
          sensor: { id: l.sensor_id } as Sensor,
          valor: l.valor,
          registrado_en: l.registrado_en
            ? new Date(l.registrado_en)
            : new Date(),
          fuente: (l.fuente ?? 'simulado') as any,
          es_anomalia: esAnomalia,
        };
      }),
    );

    await this.lecturaRepo.save(entidades);
    return entidades.length;
  }

  /**
   * Detecta si un valor es anómalo comparando con la media ± 3σ
   * de las últimas 100 lecturas del sensor.
   */
  private async detectarAnomalia(
    sensorId: string,
    valor: number,
  ): Promise<boolean> {
    const historial = await this.lecturaRepo.find({
      where: { sensor: { id: sensorId }, es_anomalia: false },
      order: { registrado_en: 'DESC' },
      take: 100,
      select: ['valor'],
    });

    if (historial.length < 10) return false; // no hay suficiente historial

    const valores = historial.map((l) => Number(l.valor));
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    const desviacion = Math.sqrt(
      valores.reduce((s, v) => s + (v - media) ** 2, 0) / valores.length,
    );

    return Math.abs(valor - media) > 3 * desviacion;
  }

  /**
   * Lista alertas activas o todas las de un lote.
   * @param loteId - UUID del lote
   * @param soloActivas - Si true, solo retorna alertas no resueltas
   */
  async listarAlertas(loteId: string, soloActivas = true): Promise<Alerta[]> {
    const where: any = { lote: { id: loteId } };
    if (soloActivas) where.resuelta = false;

    return this.alertaRepo.find({
      where,
      order: { generada_en: 'DESC' },
      take: 50,
    });
  }

  /** Marca una alerta como resuelta */
  async resolverAlerta(
    alertaId: string,
    usuarioId: string,
  ): Promise<Alerta> {
    const alerta = await this.alertaRepo.findOneOrFail({
      where: { id: alertaId },
    });
    alerta.resuelta = true;
    alerta.reconocida_en = new Date();
    alerta.reconocida_por = { id: usuarioId } as any;
    return this.alertaRepo.save(alerta);
  }

  /** Obtiene estadísticas de un sensor en un período */
  async estadisticasSensor(
    sensorId: string,
    horas = 24,
  ): Promise<{ min: number; max: number; promedio: number; total: number }> {
    const desde = new Date(Date.now() - horas * 60 * 60 * 1000);

    const result = await this.lecturaRepo
      .createQueryBuilder('l')
      .select('MIN(l.valor)', 'min')
      .addSelect('MAX(l.valor)', 'max')
      .addSelect('AVG(l.valor)', 'promedio')
      .addSelect('COUNT(*)', 'total')
      .where('l.sensor_id = :sensorId', { sensorId })
      .andWhere('l.registrado_en >= :desde', { desde })
      .andWhere('l.es_anomalia = false')
      .getRawOne();

    return {
      min: parseFloat(result.min ?? '0'),
      max: parseFloat(result.max ?? '0'),
      promedio: parseFloat(result.promedio ?? '0'),
      total: parseInt(result.total ?? '0'),
    };
  }
}
