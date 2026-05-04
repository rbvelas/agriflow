import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RiegosService } from './riegos.service';

@Controller('api/riegos')
@UseGuards(JwtAuthGuard)
export class RiegosController {
  constructor(private readonly riegosService: RiegosService) {}

  /** GET /api/riegos/temporada/:id/recomendacion — calcula lámina FAO-56 */
  @Get('temporada/:id/recomendacion')
  async recomendacion(@Param('id', ParseUUIDPipe) id: string) {
    const rec = await this.riegosService.calcularRecomendacion(id);
    return { data: rec, error: null };
  }

  /** POST /api/riegos/eventos — registra un evento de riego */
  @Post('eventos')
  async registrar(
    @Body()
    body: {
      loteId: string;
      temporadaId?: string;
      laminaRecomendadaMm: number;
      laminaAplicadaMm?: number;
      metodo?: string;
      notas?: string;
    },
  ) {
    const evento = await this.riegosService.registrarEvento(body);
    return { data: evento, error: null };
  }

  /** GET /api/riegos/lote/:loteId — historial de eventos */
  @Get('lote/:loteId')
  async listar(
    @Param('loteId', ParseUUIDPipe) loteId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    const desdeDate = desde ? new Date(desde) : new Date(Date.now() - 30 * 86400_000);
    const hastaDate = hasta ? new Date(hasta) : new Date();
    const eventos = await this.riegosService.listarEventos(loteId, desdeDate, hastaDate);
    return { data: eventos, meta: { total: eventos.length }, error: null };
  }
}
