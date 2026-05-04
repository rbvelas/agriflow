import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Finca } from '../../fincas/entities/finca.entity';
import { Sensor } from '../../sensores/entities/sensor.entity';
import { Temporada } from '../../temporadas/entities/temporada.entity';
import { EventoRiego } from '../../riegos/entities/evento-riego.entity';
import { Alerta } from '../../alertas/entities/alerta.entity';

@Entity('lote')
export class Lote extends BaseEntity {
  @ManyToOne(() => Finca, (f) => f.lotes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'finca_id' })
  finca: Finca;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  hectareas: number;

  @Column({ name: 'tipo_suelo', length: 80, nullable: true })
  tipo_suelo: string;

  @Column({
    name: 'latitud_centroide',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  latitud_centroide: number;

  @Column({
    name: 'longitud_centroide',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  longitud_centroide: number;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => Sensor, (s) => s.lote)
  sensores: Sensor[];

  @OneToMany(() => Temporada, (t) => t.lote)
  temporadas: Temporada[];

  @OneToMany(() => EventoRiego, (e) => e.lote)
  eventos_riego: EventoRiego[];

  @OneToMany(() => Alerta, (a) => a.lote)
  alertas: Alerta[];
}
