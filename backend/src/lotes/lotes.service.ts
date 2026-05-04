// lotes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lote } from './entities/lote.entity';

export interface CrearLoteDto {
  fincaId: string;
  nombre: string;
  hectareas: number;
  tipo_suelo?: string;
  latitud_centroide?: number;
  longitud_centroide?: number;
}

@Injectable()
export class LotesService {
  constructor(
    @InjectRepository(Lote) private readonly loteRepo: Repository<Lote>,
  ) {}

  async crear(dto: CrearLoteDto): Promise<Lote> {
    const lote = this.loteRepo.create({
      ...dto,
      finca: { id: dto.fincaId } as any,
    });
    return this.loteRepo.save(lote);
  }

  async listarPorFinca(fincaId: string): Promise<Lote[]> {
    return this.loteRepo.find({
      where: { finca: { id: fincaId }, activo: true },
      relations: ['sensores'],
      order: { creado_en: 'ASC' },
    });
  }

  async obtenerPorId(id: string): Promise<Lote> {
    const lote = await this.loteRepo.findOne({
      where: { id },
      relations: ['finca', 'sensores', 'temporadas', 'temporadas.cultivo'],
    });
    if (!lote) throw new NotFoundException(`Lote ${id} no encontrado`);
    return lote;
  }

  async desactivar(id: string): Promise<void> {
    await this.loteRepo.update(id, { activo: false });
  }
}
