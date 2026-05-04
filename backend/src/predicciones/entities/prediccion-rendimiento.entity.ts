import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Temporada } from '../../temporadas/entities/temporada.entity';

@Entity('prediccion_rendimiento')
export class PrediccionRendimiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Temporada, (t) => t.predicciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'temporada_id' })
  temporada: Temporada;

  @CreateDateColumn({ name: 'generado_en', type: 'timestamptz' })
  generado_en: Date;

  @Column({
    name: 'rendimiento_estimado_kg_ha',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  rendimiento_estimado_kg_ha: number;

  @Column({
    name: 'intervalo_inferior_kg_ha',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  intervalo_inferior_kg_ha: number;

  @Column({
    name: 'intervalo_superior_kg_ha',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  intervalo_superior_kg_ha: number;

  @Column({
    name: 'confianza_porcentaje',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  confianza_porcentaje: number;

  @Column({ name: 'features_usadas', type: 'jsonb', default: '{}' })
  features_usadas: Record<string, unknown>;

  @Column({ name: 'version_modelo', length: 50, default: 'v1.0' })
  version_modelo: string;
}
