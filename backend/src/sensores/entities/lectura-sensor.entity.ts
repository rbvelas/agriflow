import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Sensor } from './sensor.entity';

export type FuenteLectura =
  | 'sensor_fisico'
  | 'simulado'
  | 'api_externa'
  | 'interpolado';

@Entity('lectura_sensor')
export class LecturaSensor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Sensor, (s) => s.lecturas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sensor_id' })
  sensor: Sensor;

  @CreateDateColumn({ name: 'registrado_en', type: 'timestamptz' })
  registrado_en: Date;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  valor: number;

  @Column({ name: 'es_anomalia', default: false })
  es_anomalia: boolean;

  @Column({
    type: 'enum',
    enum: ['sensor_fisico', 'simulado', 'api_externa', 'interpolado'],
    default: 'sensor_fisico',
  })
  fuente: FuenteLectura;
}
