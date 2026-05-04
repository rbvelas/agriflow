import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export type EstadoWorkflow =
  | 'iniciado'
  | 'en_proceso'
  | 'exitoso'
  | 'error'
  | 'cancelado';

@Entity('workflow_ejecucion')
export class WorkflowEjecucion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nombre_workflow', length: 100 })
  nombre_workflow: string;

  @Column({
    type: 'enum',
    enum: ['iniciado', 'en_proceso', 'exitoso', 'error', 'cancelado'],
    default: 'iniciado',
  })
  estado: EstadoWorkflow;

  @CreateDateColumn({ name: 'iniciado_en', type: 'timestamptz' })
  iniciado_en: Date;

  @Column({ name: 'finalizado_en', type: 'timestamptz', nullable: true })
  finalizado_en: Date;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ name: 'error_mensaje', type: 'text', nullable: true })
  error_mensaje: string;
}
