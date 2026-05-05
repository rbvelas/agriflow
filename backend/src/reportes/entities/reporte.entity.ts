import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity';
import { Finca } from '../../fincas/entities/finca.entity';

export type TipoReporte =
  | 'operacional_diario'
  | 'operacional_semanal'
  | 'gestion_mensual'
  | 'ejecutivo';

export type EstadoReporte =
  | 'pendiente'
  | 'generando'
  | 'listo'
  | 'error';

@Entity('reporte')
export class Reporte {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Usuario, (u) => u.reportes, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'generado_por' })
  generado_por: Usuario;

  @ManyToOne(() => Finca, (f) => f.reportes, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'finca_id' })
  finca: Finca;

  @ManyToOne(() => Lote, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'lote_id' })
  lote: Lote;

  @Column({
    type: 'enum',
    enum: ['operacional_diario', 'operacional_semanal', 'gestion_mensual', 'ejecutivo'],
  })
  tipo: TipoReporte;

  @Column({ name: 'periodo_inicio', type: 'date' })
  periodo_inicio: Date;

  @Column({ name: 'periodo_fin', type: 'date' })
  periodo_fin: Date;

  @Column({ name: 'ruta_archivo', type: 'text', nullable: true })
  ruta_archivo: string;

  @CreateDateColumn({ name: 'generado_en', type: 'timestamptz' })
  generado_en: Date;

  @Column({
    type: 'enum',
    enum: ['pendiente', 'generando', 'listo', 'error'],
    default: 'pendiente',
  })
  estado: EstadoReporte;
}