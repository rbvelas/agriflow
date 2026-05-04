import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lote } from '../../lotes/entities/lote.entity';
import { Temporada } from '../../temporadas/entities/temporada.entity';

@Entity('evento_riego')
export class EventoRiego {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lote, (l) => l.eventos_riego, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'lote_id' })
  lote: Lote;

  @ManyToOne(() => Temporada, (t) => t.eventos_riego, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'temporada_id' })
  temporada: Temporada;

  @Column({ name: 'fecha_hora', type: 'timestamptz' })
  fecha_hora: Date;

  @Column({
    name: 'lamina_recomendada_mm',
    type: 'decimal',
    precision: 8,
    scale: 2,
  })
  lamina_recomendada_mm: number;

  @Column({
    name: 'lamina_aplicada_mm',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  lamina_aplicada_mm: number;

  @Column({ length: 80, nullable: true })
  metodo: string;

  @Column({ default: false })
  completado: boolean;

  @Column({ type: 'text', nullable: true })
  notas: string;
}
