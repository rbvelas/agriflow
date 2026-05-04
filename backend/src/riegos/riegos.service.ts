import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EventoRiego } from './entities/evento-riego.entity';
import { LecturaSensor } from '../sensores/entities/lectura-sensor.entity';
import { Temporada } from '../temporadas/entities/temporada.entity';

export interface RecomendacionRiego {
  lamina_recomendada_mm: number;
  et0_estimada: number;
  etc_estimada: number;
  deficit_hidrico: number;
  precipitacion_efectiva: number;
  justificacion: string;
}

@Injectable()
export class RiegosService {
  private readonly logger = new Logger(RiegosService.name);

  constructor(
    @InjectRepository(EventoRiego)
    private readonly riegoRepo: Repository<EventoRiego>,
    @InjectRepository(LecturaSensor)
    private readonly lecturaRepo: Repository<LecturaSensor>,
    @InjectRepository(Temporada)
    private readonly temporadaRepo: Repository<Temporada>,
  ) {}

  /**
   * Calcula la lámina de riego recomendada usando el método FAO-56 simplificado.
   *
   * Fórmula: ETc = ET0 × Kc
   * Lámina neta = ETc - Precipitación efectiva
   *
   * @param temporadaId - UUID de la temporada activa
   */
  async calcularRecomendacion(
    temporadaId: string,
  ): Promise<RecomendacionRiego> {
    const temporada = await this.temporadaRepo.findOne({
      where: { id: temporadaId },
      relations: ['cultivo', 'lote', 'lote.sensores', 'lote.sensores.lecturas'],
    });

    if (!temporada) {
      throw new Error(`Temporada ${temporadaId} no encontrada`);
    }

    // Obtener lecturas de las últimas 24h
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lecturas = await this.lecturaRepo
      .createQueryBuilder('l')
      .innerJoinAndSelect('l.sensor', 's')
      .innerJoin('s.lote', 'lote', 'lote.id = :loteId', {
        loteId: temporada.lote.id,
      })
      .where('l.registrado_en >= :desde', { desde: hace24h })
      .andWhere('l.es_anomalia = false')
      .getMany();

    // Extraer valores por tipo de sensor
    const temperaturas = lecturas
      .filter((l) => l.sensor.tipo === 'temperatura')
      .map((l) => Number(l.valor));
    const precipitaciones = lecturas
      .filter((l) => l.sensor.tipo === 'precipitacion')
      .map((l) => Number(l.valor));
    const humedades = lecturas
      .filter((l) => l.sensor.tipo === 'humedad_suelo')
      .map((l) => Number(l.valor));

    const tempMedia =
      temperaturas.length > 0
        ? temperaturas.reduce((a, b) => a + b, 0) / temperaturas.length
        : 25;
    const precipTotal = precipitaciones.reduce((a, b) => a + b, 0);
    const humedadMedia =
      humedades.length > 0
        ? humedades.reduce((a, b) => a + b, 0) / humedades.length
        : 50;

    // ET0 estimada por fórmula de Hargreaves simplificada (sin radiación solar)
    // ET0 ≈ 0.0023 × (Tmedia + 17.8) × √(Tmax - Tmin) × Ra
    // Versión simplificada con temperatura media:
    // Kc según fase del cultivo (días desde siembra)
    const diasSiembra = Math.floor(
      (Date.now() - new Date(temporada.fecha_siembra).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const kc = this.obtenerKc(
      temporada.cultivo.kc_inicial,
      temporada.cultivo.kc_medio,
      temporada.cultivo.kc_final,
      temporada.cultivo.dias_ciclo,
      diasSiembra,
    );

    // Asegurarse que et0 y etc son números
    const et0 = Math.max(0, 0.408 * (0.82 * tempMedia - 4.2));
    const etc = Number(et0) * Number(kc);
    const precipEfectiva = Number(precipTotal) * 0.75;

    // Déficit hídrico basado en humedad del suelo
    const capacidadCampo = 60; // %VWC típico
    const puntoMarchitez = 25; // %VWC típico
    const aguaDisponible = Math.max(0, humedadMedia - puntoMarchitez);
    const aguaMax = capacidadCampo - puntoMarchitez;
    const factorAgotamiento = Math.max(
      0,
      1 - aguaDisponible / (aguaMax || 1),
    );

    // Lámina neta = ETc - precipitación efectiva, ajustada por déficit del suelo
    const laminaNeta = Math.max(
      0,
      etc - precipEfectiva + factorAgotamiento * 10,
    );

    const kcValue = Number(kc);
    const et0Value = Number(et0);
    const etcValue = Number(etc);
    const humedadMediaValue = Number(humedadMedia);
    const deficitValue = Number(factorAgotamiento * 100);

    return {
      lamina_recomendada_mm: Math.round(laminaNeta * 10) / 10,
      et0_estimada: Math.round(et0Value * 100) / 100,
      etc_estimada: Math.round(etcValue * 100) / 100,
      deficit_hidrico: Math.round(deficitValue),
      precipitacion_efectiva: Math.round(precipEfectiva * 10) / 10,
      justificacion: `ET0=${et0Value.toFixed(2)}mm, Kc=${kcValue.toFixed(2)}, ETc=${etcValue.toFixed(2)}mm. Humedad suelo: ${humedadMediaValue.toFixed(1)}%VWC. Déficit: ${deficitValue.toFixed(0)}%.`,
    };
  }

  /**
   * Calcula el coeficiente de cultivo Kc según la fase fenológica.
   * Interpolación lineal entre las tres fases FAO-56.
   */
  private obtenerKc(
    kcIni: number,
    kcMed: number,
    kcFin: number,
    diasCiclo: number,
    diasActuales: number,
  ): number {
    // Convertir a número porque TypeORM devuelve decimales como strings
    const ini = Number(kcIni);
    const med = Number(kcMed);
    const fin = Number(kcFin);
    const ciclo = Number(diasCiclo);

    const fase1 = ciclo * 0.2;
    const fase2 = ciclo * 0.5;
    const fase3 = ciclo * 0.8;

    if (diasActuales <= fase1) return ini;
    if (diasActuales <= fase2) {
      const t = (diasActuales - fase1) / (fase2 - fase1);
      return ini + t * (med - ini);
    }
    if (diasActuales <= fase3) return med;
    const t = (diasActuales - fase3) / (ciclo - fase3);
    return med + t * (fin - med);
  }

  /** Registra la recomendación de riego y opcionalmente el riego aplicado */
  async registrarEvento(data: {
    loteId: string;
    temporadaId?: string;
    laminaRecomendadaMm: number;
    laminaAplicadaMm?: number;
    metodo?: string;
    notas?: string;
  }): Promise<EventoRiego> {
    const evento = this.riegoRepo.create({
      lote: { id: data.loteId },
      temporada: data.temporadaId ? { id: data.temporadaId } : undefined,
      fecha_hora: new Date(),
      lamina_recomendada_mm: data.laminaRecomendadaMm,
      lamina_aplicada_mm: data.laminaAplicadaMm,
      metodo: data.metodo ?? 'goteo',
      completado: data.laminaAplicadaMm !== undefined,
      notas: data.notas,
    });
    return this.riegoRepo.save(evento);
  }

  /** Lista eventos de riego de un lote en un período */
  async listarEventos(
    loteId: string,
    desde: Date,
    hasta: Date,
  ): Promise<EventoRiego[]> {
    return this.riegoRepo.find({
      where: {
        lote: { id: loteId },
        fecha_hora: Between(desde, hasta),
      },
      order: { fecha_hora: 'DESC' },
    });
  }
}
