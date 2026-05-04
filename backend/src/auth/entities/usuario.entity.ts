import {
  Entity,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { BaseEntity } from '../../common/entities/base.entity';
import { Finca } from '../../fincas/entities/finca.entity';
import { Reporte } from '../../reportes/entities/reporte.entity';
import { Alerta } from '../../alertas/entities/alerta.entity';
import { Rol } from './rol.entity';

@Entity('usuario')
export class Usuario extends BaseEntity {
  @Column({ length: 120 })
  nombre: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ name: 'hash_contrasena', length: 255 })
  hash_contrasena: string;

  @Column({ default: true })
  activo: boolean;

  /** Hashea la contraseña automáticamente antes de persistir */
  @BeforeInsert()
  @BeforeUpdate()
  async hashearContrasena() {
    if (this.hash_contrasena && !this.hash_contrasena.startsWith('$2b$')) {
      this.hash_contrasena = await bcrypt.hash(this.hash_contrasena, 12);
    }
  }

  /** Compara contraseña en texto plano con el hash almacenado */
  async validarContrasena(contrasena: string): Promise<boolean> {
    return bcrypt.compare(contrasena, this.hash_contrasena);
  }

  @ManyToMany(() => Rol, { eager: true })
  @JoinTable({
    name: 'usuario_rol',
    joinColumn: { name: 'usuario_id' },
    inverseJoinColumn: { name: 'rol_id' },
  })
  roles: Rol[];

  @OneToMany(() => Finca, (finca) => finca.propietario)
  fincas: Finca[];

  @OneToMany(() => Reporte, (r) => r.generado_por)
  reportes: Reporte[];

  @OneToMany(() => Alerta, (a) => a.reconocida_por)
  alertas_reconocidas: Alerta[];
}
