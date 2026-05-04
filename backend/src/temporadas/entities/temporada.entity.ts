import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Lote } from '../../lotes/entities/lote.entity';
import { Cultivo } from './cultivo.entity';
import { EventoRiego } from '../../riegos/entities/evento-riego.entity';
import { PrediccionRendimiento } from '../../predicciones/entities/prediccion-rendimiento.entity';

export type EstadoTemporada =
  | 'planificada'
  | 'activa'
  | 'cosechada'
  | 'cancelada';

@Entity('temporada')
export class Temporada extends BaseEntity {
  @ManyToOne(() => Lote, (l) => l.temporadas, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'lote_id' })
  lote: Lote;

  @ManyToOne(() => Cultivo, (c) => c.temporadas, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cultivo_id' })
  cultivo: Cultivo;

  @Column({ name: 'fecha_siembra', type: 'date' })
  fecha_siembra: Date;

  @Column({ name: 'fecha_cosecha_estimada', type: 'date', nullable: true })
  fecha_cosecha_estimada: Date;

  @Column({ name: 'fecha_cosecha_real', type: 'date', nullable: true })
  fecha_cosecha_real: Date;

  @Column({
    name: 'rendimiento_real_kg_ha',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  rendimiento_real_kg_ha: number;

  @Column({
    type: 'enum',
    enum: ['planificada', 'activa', 'cosechada', 'cancelada'],
    default: 'planificada',
  })
  estado: EstadoTemporada;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @OneToMany(() => EventoRiego, (e) => e.temporada)
  eventos_riego: EventoRiego[];

  @OneToMany(() => PrediccionRendimiento, (p) => p.temporada)
  predicciones: PrediccionRendimiento[];
}
