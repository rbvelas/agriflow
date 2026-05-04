import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Finca } from './entities/finca.entity';
import { Lote } from '../lotes/entities/lote.entity';

export interface CrearFincaDto {
  nombre: string;
  descripcion?: string;
  latitud?: number;
  longitud?: number;
  hectareas_total?: number;
  departamento?: string;
  municipio?: string;
  propietarioId: string;
}

@Injectable()
export class FincasService {
  constructor(
    @InjectRepository(Finca) private readonly fincaRepo: Repository<Finca>,
    @InjectRepository(Lote) private readonly loteRepo: Repository<Lote>,
  ) {}

  async crear(dto: CrearFincaDto): Promise<Finca> {
    const finca = this.fincaRepo.create({
      ...dto,
      propietario: { id: dto.propietarioId } as any,
    });
    return this.fincaRepo.save(finca);
  }

  async listarPorRol(user: any): Promise<Finca[]> {
    const roles = (user.roles?.map((r: any) => 
      (typeof r === 'string' ? r : r.nombre).toLowerCase().trim()
    ) ?? []);
    
    // El Administrador y Técnico ven todas las fincas
    if (roles.includes('administrador') || roles.includes('tecnico')) {
      return this.fincaRepo.find({
        relations: [
          'lotes', 
          'lotes.temporadas', 
          'lotes.temporadas.cultivo', 
          'propietario'
        ],
        order: { creado_en: 'DESC' },
      });
    }
    
    // El Agricultor solo ve las suyas
    return this.fincaRepo.find({
      where: { propietario: { id: user.id } },
      relations: [
        'lotes', 
        'lotes.temporadas', 
        'lotes.temporadas.cultivo'
      ],
      order: { creado_en: 'DESC' },
    });
  }

  async obtenerConLotes(id: string): Promise<Finca> {
    const finca = await this.fincaRepo.findOne({
      where: { id },
      relations: [
        'lotes', 
        'lotes.sensores', 
        'lotes.temporadas', 
        'lotes.temporadas.cultivo',
        'propietario'
      ],
    });
    if (!finca) throw new NotFoundException(`Finca ${id} no encontrada`);
    return finca;
  }

  async actualizar(id: string, dto: Partial<CrearFincaDto>): Promise<Finca> {
    await this.fincaRepo.update(id, dto as any);
    return this.obtenerConLotes(id);
  }

  async eliminar(id: string): Promise<void> {
    const finca = await this.fincaRepo.findOne({ where: { id } });
    if (!finca) throw new NotFoundException(`Finca ${id} no encontrada`);
    await this.fincaRepo.remove(finca);
  }
}
