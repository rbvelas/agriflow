import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Usuario } from '../../auth/entities/usuario.entity';
import { Lote } from '../../lotes/entities/lote.entity';
import { Reporte } from '../../reportes/entities/reporte.entity';

@Entity('finca')
export class Finca extends BaseEntity {
  @ManyToOne(() => Usuario, (u) => u.fincas, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'propietario_id' })
  propietario: Usuario;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitud: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitud: number;

  @Column({
    name: 'hectareas_total',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  hectareas_total: number;

  @Column({ length: 100, nullable: true })
  departamento: string;

  @Column({ length: 100, nullable: true })
  municipio: string;

  @OneToMany(() => Lote, (l) => l.finca)
  lotes: Lote[];

  @OneToMany(() => Reporte, (r) => r.finca)
  reportes: Reporte[];
}
