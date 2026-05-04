import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Lote } from '../../lotes/entities/lote.entity';
import { Usuario } from '../../auth/entities/usuario.entity';

export type SeveridadAlerta = 'baja' | 'media' | 'alta' | 'critica';

@Entity('alerta')
export class Alerta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lote, (l) => l.alertas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lote_id' })
  lote: Lote;

  @Column({ length: 80 })
  tipo: string;

  @Column({
    type: 'enum',
    enum: ['baja', 'media', 'alta', 'critica'],
  })
  severidad: SeveridadAlerta;

  @Column({ type: 'text' })
  mensaje: string;

  @CreateDateColumn({ name: 'generada_en', type: 'timestamptz' })
  generada_en: Date;

  @Column({ name: 'reconocida_en', type: 'timestamptz', nullable: true })
  reconocida_en: Date;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reconocida_por' })
  reconocida_por: Usuario;

  @Column({ default: false })
  resuelta: boolean;
}
