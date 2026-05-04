import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reporte } from './entities/reporte.entity';

@Controller('api/reportes')
export class ReportesController {
  constructor(
    @InjectRepository(Reporte)
    private readonly reporteRepo: Repository<Reporte>,
  ) {}

  /**
   * GET /api/reportes/:id/descargar
   * Sirve el PDF generado como descarga directa.
   * Eliminado el AuthGuard temporalmente para facilitar la descarga directa vía window.open
   */
  @Get(':id/descargar')
  async descargar(@Param('id') id: string, @Res() res: Response) {
    const reporte = await this.reporteRepo.findOne({ where: { id } });

    if (!reporte) throw new NotFoundException(`Reporte ${id} no encontrado`);
    if (reporte.estado !== 'listo' || !reporte.ruta_archivo) {
      throw new NotFoundException('El reporte aún no está disponible');
    }

    if (!fs.existsSync(reporte.ruta_archivo)) {
      throw new NotFoundException('Archivo PDF no encontrado en disco');
    }

    const nombreArchivo = `agriflow_reporte_${id.substring(0, 8)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nombreArchivo}"`,
    );
    fs.createReadStream(reporte.ruta_archivo).pipe(res);
  }

  /** GET /api/reportes — Lista reportes del usuario */
  @Get()
  async listar() {
    const reportes = await this.reporteRepo.find({
      order: { generado_en: 'DESC' },
      take: 20,
    });
    return { data: reportes, error: null };
  }
}
