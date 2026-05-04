import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('rol')
export class Rol {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;
}
