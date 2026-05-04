import {
  Controller, Get, Post, Patch, Body, Param,
  Query, UseGuards, ParseUUIDPipe, ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SensoresService } from './sensores.service';

@Controller('api/sensores')
@UseGuards(JwtAuthGuard)
export class SensoresController {
  constructor(private readonly sensoresService: SensoresService) {}

  /** GET /api/sensores/lote/:loteId — lista sensores activos de un lote */
  @Get('lote/:loteId')
  async listarPorLote(@Param('loteId', ParseUUIDPipe) loteId: string) {
    const sensores = await this.sensoresService.listarPorLote(loteId);
    return { data: sensores, meta: { total: sensores.length }, error: null };
  }

  /** GET /api/sensores/lote/:loteId/lecturas — últimas lecturas de un lote */
  @Get('lote/:loteId/lecturas')
  async ultimasLecturas(
    @Param('loteId', ParseUUIDPipe) loteId: string,
    @Query('horas', new DefaultValuePipe(24), ParseIntPipe) horas: number,
  ) {
    const lecturas = await this.sensoresService.ultimasLecturas(loteId, horas);
    return { data: lecturas, meta: { total: lecturas.length }, error: null };
  }

  /** POST /api/sensores/lecturas — registra lecturas masivas (uso interno/n8n) */
  @Post('lecturas')
  async registrarLecturas(
    @Body() body: { lecturas: Array<{ sensor_id: string; valor: number; registrado_en?: string; fuente?: string }> },
  ) {
    const total = await this.sensoresService.registrarLecturas(body.lecturas ?? []);
    return { data: { insertados: total }, error: null };
  }

  /** GET /api/sensores/:sensorId/estadisticas */
  @Get(':sensorId/estadisticas')
  async estadisticas(
    @Param('sensorId', ParseUUIDPipe) sensorId: string,
    @Query('horas', new DefaultValuePipe(24), ParseIntPipe) horas: number,
  ) {
    const stats = await this.sensoresService.estadisticasSensor(sensorId, horas);
    return { data: stats, error: null };
  }

  /** GET /api/sensores/lote/:loteId/alertas */
  @Get('lote/:loteId/alertas')
  async listarAlertas(
    @Param('loteId', ParseUUIDPipe) loteId: string,
    @Query('soloActivas', new DefaultValuePipe('true')) soloActivas: string,
  ) {
    const alertas = await this.sensoresService.listarAlertas(
      loteId,
      soloActivas !== 'false',
    );
    return { data: alertas, meta: { total: alertas.length }, error: null };
  }

  /** PATCH /api/sensores/alertas/:alertaId/resolver */
  @Patch('alertas/:alertaId/resolver')
  async resolverAlerta(
    @Param('alertaId', ParseUUIDPipe) alertaId: string,
    @Body() body: { usuarioId: string },
  ) {
    const alerta = await this.sensoresService.resolverAlerta(alertaId, body.usuarioId);
    return { data: alerta, error: null };
  }
}
