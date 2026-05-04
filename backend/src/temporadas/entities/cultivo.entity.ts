import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Temporada } from '../../temporadas/entities/temporada.entity';

@Entity('cultivo')
export class Cultivo extends BaseEntity {
  @Column({ length: 100, unique: true })
  nombre: string;

  @Column({ name: 'nombre_cientifico', length: 200, nullable: true })
  nombre_cientifico: string;

  @Column({ name: 'dias_ciclo' })
  dias_ciclo: number;

  @Column({ name: 'kc_inicial', type: 'decimal', precision: 4, scale: 2, default: 0.3 })
  kc_inicial: number;

  @Column({ name: 'kc_medio', type: 'decimal', precision: 4, scale: 2, default: 1.2 })
  kc_medio: number;

  @Column({ name: 'kc_final', type: 'decimal', precision: 4, scale: 2, default: 0.55 })
  kc_final: number;

  @Column({
    name: 'rendimiento_potencial_kg_ha',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  rendimiento_potencial_kg_ha: number;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @OneToMany(() => Temporada, (t) => t.cultivo)
  temporadas: Temporada[];
}
