import {
  Controller, Get, Param, Query, UseGuards,
  ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrediccionesService } from './predicciones.service';

@Controller('api/predicciones')
@UseGuards(JwtAuthGuard)
export class PrediccionesController {
  constructor(private readonly svc: PrediccionesService) {}

  /** GET /api/predicciones/temporada/:id — predicción vigente */
  @Get('temporada/:id')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    const pred = await this.svc.obtenerPrediccion(id);
    return { data: pred, error: null };
  }

  /** GET /api/predicciones/temporada/:id/historial */
  @Get('temporada/:id/historial')
  async historial(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limite', new DefaultValuePipe(30), ParseIntPipe) limite: number,
  ) {
    const lista = await this.svc.listarPredicciones(id, limite);
    return { data: lista, meta: { total: lista.length }, error: null };
  }
}
