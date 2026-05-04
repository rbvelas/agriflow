import { Controller, Get, Post, Param, Body, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TemporadasService, CrearTemporadaDto } from './temporadas.service';
import { EstadoTemporada } from './entities/temporada.entity';

@Controller('api/temporadas')
@UseGuards(JwtAuthGuard)
export class TemporadasController {
  constructor(private readonly svc: TemporadasService) {}

  @Post()
  async crear(@Body() dto: CrearTemporadaDto) {
    return { data: await this.svc.crear(dto), error: null };
  }

  @Get('activas')
  async activas() {
    const lista = await this.svc.listarActivas();
    return { data: lista, meta: { total: lista.length }, error: null };
  }

  @Get('cultivos')
  async cultivos() {
    const lista = await this.svc.listarCultivos();
    return { data: lista, error: null };
  }

  @Get(':id')
  async obtener(@Param('id') id: string) {
    return { data: await this.svc.obtenerPorId(id), error: null };
  }

  @Patch(':id/estado')
  async estado(@Param('id') id: string, @Body() body: { estado: EstadoTemporada }) {
    return { data: await this.svc.cambiarEstado(id, body.estado), error: null };
  }

  @Patch(':id/cosecha')
  async cosecha(
    @Param('id') id: string,
    @Body() body: { rendimiento_real_kg_ha: number; fecha_cosecha?: string },
  ) {
    const t = await this.svc.registrarCosecha(
      id,
      body.rendimiento_real_kg_ha,
      body.fecha_cosecha,
    );
    return { data: t, error: null };
  }
}
