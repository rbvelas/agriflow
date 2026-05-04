import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LotesService, CrearLoteDto } from './lotes.service';

@Controller('api/lotes')
@UseGuards(JwtAuthGuard)
export class LotesController {
  constructor(private readonly lotesService: LotesService) {}

  @Post()
  async crear(@Body() dto: CrearLoteDto) {
    return { data: await this.lotesService.crear(dto), error: null };
  }

  @Get('finca/:fincaId')
  async listar(@Param('fincaId') fincaId: string) {
    const lotes = await this.lotesService.listarPorFinca(fincaId);
    return { data: lotes, meta: { total: lotes.length }, error: null };
  }

  @Get(':id')
  async obtener(@Param('id') id: string) {
    const lote = await this.lotesService.obtenerPorId(id);
    const temporadaActiva = lote.temporadas?.find(t => t.estado === 'activa');
    return { 
      data: {
        ...lote,
        temporada_activa_id: temporadaActiva?.id ?? null
      }, 
      error: null 
    };
  }
}
