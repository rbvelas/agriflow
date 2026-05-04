import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Lote } from '../../lotes/entities/lote.entity';
import { LecturaSensor } from './lectura-sensor.entity';

export type TipoSensor =
  | 'temperatura'
  | 'humedad_suelo'
  | 'precipitacion'
  | 'ndvi'
  | 'viento'
  | 'radiacion_solar';

@Entity('sensor')
export class Sensor {
  @Column({ primary: true, generated: 'uuid' })
  id: string;

  @ManyToOne(() => Lote, (l) => l.sensores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lote_id' })
  lote: Lote;

  @Column({
    type: 'enum',
    enum: ['temperatura', 'humedad_suelo', 'precipitacion', 'ndvi', 'viento', 'radiacion_solar'],
  })
  tipo: TipoSensor;

  @Column({ length: 20 })
  unidad: string;

  @Column({ length: 100, nullable: true })
  modelo: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitud: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitud: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'instalado_en', type: 'timestamptz' })
  instalado_en: Date;

  @OneToMany(() => LecturaSensor, (l) => l.sensor)
  lecturas: LecturaSensor[];
}
