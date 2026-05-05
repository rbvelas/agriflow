import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import * as path from 'path';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import { Reporte, TipoReporte } from './entities/reporte.entity';
import { Lote } from '../lotes/entities/lote.entity';

export interface GenerarReporteDto {
  fincaId?: string;
  loteId?: string;
  tipo: TipoReporte;
  periodoInicio: Date;
  periodoFin: Date;
  usuarioId: string;
}

interface DatosReporte {
  nombreEntidad: string;
  tipoEntidad: 'finca' | 'lote';
  periodoInicio: string;
  periodoFin: string;
  tipo: string;
  rendimientoEstimado: string;
  humedadPromedio: string;
  precipitacionAcumulada: string;
  alertasActivas: number;
  eficienciaRiego: string;
  lecturas: Array<{
    sensor: string;
    tipo: string;
    valor: string;
    unidad: string;
    fecha: string;
    anomalia: boolean;
  }>;
  predicciones: Array<{
    fecha: string;
    estimado: string;
    inferior: string;
    superior: string;
    confianza: string;
  }>;
}

// Paleta de colores AgriFlow
const C = {
  azulOscuro:  '#0f3460',
  azulMedio:   '#16213e',
  verde:       '#16a34a',
  amarillo:    '#d97706',
  rojo:        '#dc2626',
  azulClaro:   '#3b82f6',
  grisOscuro:  '#1e293b',
  grisMedio:   '#64748b',
  grisClaro:   '#94a3b8',
  fondo:       '#f8faff',
  borde:       '#dce8f5',
  blanco:      '#ffffff',
};

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);
  private readonly outputDir = process.env.NODE_ENV === 'production' 
    ? '/tmp/reportes_pdf' 
    : path.join(process.cwd(), 'reportes_pdf');

  constructor(
    @InjectRepository(Reporte)
    private readonly reporteRepo: Repository<Reporte>,
    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,
  ) {}

  async generarReporte(dto: GenerarReporteDto): Promise<Reporte> {
    let fincaId = dto.fincaId;

    // Si es reporte por lote y no viene fincaId, lo buscamos
    if (dto.loteId && !fincaId) {
      const lote = await this.loteRepo.findOne({
        where: { id: dto.loteId },
        relations: ['finca'],
      });
      if (lote && lote.finca) {
        fincaId = lote.finca.id;
      }
    }

    const reporte = await this.reporteRepo.save(
      this.reporteRepo.create({
        generado_por: { id: dto.usuarioId } as any,
        finca: fincaId ? ({ id: fincaId } as any) : null,
        lote: dto.loteId ? ({ id: dto.loteId } as any) : null,
        tipo: dto.tipo,
        periodo_inicio: dto.periodoInicio,
        periodo_fin: dto.periodoFin,
        estado: 'generando',
      }),
    );

    try {
      await fsp.mkdir(this.outputDir, { recursive: true });
      const datos = await this.obtenerDatosReporte(dto);
      const rutaArchivo = path.join(this.outputDir, `reporte_${reporte.id}.pdf`);

      await this.generarPDF(datos, dto.tipo, reporte.id, rutaArchivo);

      this.logger.log(`PDF generado: ${rutaArchivo}`);
      reporte.ruta_archivo = rutaArchivo;
      reporte.estado = 'listo';
      return this.reporteRepo.save(reporte);
    } catch (err: any) {
      this.logger.error(`Error generando PDF: ${err?.message}`);
      reporte.estado = 'error';
      await this.reporteRepo.save(reporte);
      throw new InternalServerErrorException('No se pudo generar el reporte PDF');
    }
  }

  private generarPDF(
    datos: DatosReporte,
    tipo: TipoReporte,
    reporteId: string,
    rutaArchivo: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
      const stream = fs.createWriteStream(rutaArchivo);
      doc.pipe(stream);
      stream.on('finish', resolve);
      stream.on('error', reject);

      const W = doc.page.width;   // 595.28
      const H = doc.page.height;  // 841.89
      const M = 40;               // Margen profesional
      const CW = W - M * 2;

      // FONDO DE PÁGINA
      doc.rect(0, 0, W, H).fill(C.blanco);

      // HEADER DE ALTA FIDELIDAD
      doc.rect(0, 0, W, 100).fill(C.azulOscuro);
      
      // Logo / Nombre
      doc.fillColor(C.blanco)
         .font('Helvetica-Bold').fontSize(22)
         .text('AgriFlow', M, 30);
      
      doc.font('Helvetica').fontSize(10).fillColor('rgba(255,255,255,0.7)')
         .text('INTELIGENCIA AGRÍCOLA DE PRECISIÓN', M, 55);

      // Título del Reporte (Derecha)
      const tipoTxt = datos.tipo.toUpperCase();
      doc.font('Helvetica-Bold').fontSize(14).fillColor(C.blanco)
         .text(tipoTxt, W - M - 200, 35, { width: 200, align: 'right' });

      doc.font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.7)')
         .text(`GENERADO EL ${new Date().toLocaleDateString('es-PE')}`, W - M - 200, 55, { width: 200, align: 'right' });

      let y = 130;

      // SECCIÓN: INFORMACIÓN GENERAL
      doc.font('Helvetica-Bold').fontSize(12).fillColor(C.azulOscuro)
         .text('1. INFORMACIÓN GENERAL', M, y);
      y += 18;
      doc.moveTo(M, y).lineTo(W - M, y).lineWidth(1).stroke(C.borde);
      y += 15;

      // Grid de info
      const infoY = y;
      const drawInfoItem = (label: string, value: string, x: number) => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.grisClaro).text(label.toUpperCase(), x, infoY);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(C.grisOscuro).text(value, x, infoY + 12);
      };

      drawInfoItem('Entidad', datos.nombreEntidad, M);
      drawInfoItem('Tipo', datos.tipoEntidad === 'lote' ? 'LOTE DE PRODUCCIÓN' : 'FINCA AGRÍCOLA', M + 150);
      drawInfoItem('Período', `${datos.periodoInicio} — ${datos.periodoFin}`, M + 320);
      y += 45;

      // SECCIÓN: KPI PRINCIPALES (CARDS)
      doc.font('Helvetica-Bold').fontSize(12).fillColor(C.azulOscuro).text('2. INDICADORES CLAVE (KPI)', M, y);
      y += 25;

      const cards = [
        { val: datos.rendimientoEstimado, unit: 'kg/ha', lab: 'Rendimiento', color: C.verde },
        { val: `${datos.humedadPromedio}%`, unit: 'VWC', lab: 'Humedad Suelo', color: C.azulClaro },
        { val: datos.precipitacionAcumulada, unit: 'mm', lab: 'Precipitación', color: C.azulOscuro },
        { val: `${datos.eficienciaRiego}%`, unit: 'Eficiencia', lab: 'Uso de Agua', color: C.amarillo },
      ];

      const cardW = (CW - 15 * 3) / 4;
      cards.forEach((c, i) => {
        const cx = M + i * (cardW + 15);
        doc.roundedRect(cx, y, cardW, 70, 10).fill(C.fondo);
        doc.roundedRect(cx, y, cardW, 70, 10).lineWidth(0.5).stroke(C.borde);
        
        doc.fillColor(c.color).font('Helvetica-Bold').fontSize(18).text(c.val, cx + 10, y + 15);
        doc.fillColor(C.grisMedio).font('Helvetica').fontSize(8).text(c.unit, cx + 10, y + 35);
        doc.fillColor(C.grisClaro).font('Helvetica-Bold').fontSize(7).text(c.lab.toUpperCase(), cx + 10, y + 48);
      });
      y += 95;

      // SECCIÓN: VISUALIZACIÓN DE DATOS (GRÁFICO)
      doc.font('Helvetica-Bold').fontSize(12).fillColor(C.azulOscuro).text('3. ANÁLISIS DE TENDENCIAS (HUMEDAD VS PREDICCIÓN)', M, y);
      y += 25;

      // Dibujar un mini gráfico de barras/líneas representativo
      const chartH = 120;
      doc.rect(M, y, CW, chartH).fill(C.fondo);
      doc.rect(M, y, CW, chartH).lineWidth(0.5).stroke(C.borde);

      // Ejes
      doc.moveTo(M + 30, y + 10).lineTo(M + 30, y + chartH - 20).lineWidth(1).stroke(C.grisClaro);
      doc.moveTo(M + 30, y + chartH - 20).lineTo(M + CW - 10, y + chartH - 20).lineWidth(1).stroke(C.grisClaro);

      // Datos ficticios para el gráfico basados en las predicciones
      const points = datos.predicciones.length;
      const stepX = (CW - 50) / (points - 1 || 1);
      
      doc.font('Helvetica').fontSize(6).fillColor(C.grisMedio);
      datos.predicciones.forEach((p, i) => {
        const px = M + 35 + i * stepX;
        const val = parseFloat(p.estimado.replace(',', '')) || 0;
        const py = y + chartH - 20 - (val / 10000) * 80;
        
        // Punto
        doc.circle(px, py, 3).fill(C.azulClaro);
        // Etiqueta X
        doc.text(p.fecha.split('/')[0], px - 5, y + chartH - 15);
      });

      // Leyenda
      doc.circle(M + CW - 80, y + 10, 3).fill(C.azulClaro);
      doc.font('Helvetica').fontSize(8).fillColor(C.grisMedio).text('Rendimiento Est.', M + CW - 72, y + 7);

      y += chartH + 30;

      // TABLA DE PREDICCIONES
      doc.font('Helvetica-Bold').fontSize(12).fillColor(C.azulOscuro).text('4. DETALLE DE PREDICCIONES ML', M, y);
      y += 15;

      doc.rect(M, y, CW, 20).fill(C.azulOscuro);
      doc.fillColor(C.blanco).font('Helvetica-Bold').fontSize(9);
      doc.text('FECHA', M + 10, y + 6);
      doc.text('ESTIMADO (KG/HA)', M + 120, y + 6);
      doc.text('INTERVALO CONFIANZA', M + 250, y + 6);
      doc.text('CONFIANZA', M + 430, y + 6);
      y += 20;

      datos.predicciones.forEach((p, i) => {
        if (i % 2 === 0) doc.rect(M, y, CW, 20).fill(C.fondo);
        doc.fillColor(C.grisOscuro).font('Helvetica').fontSize(9);
        doc.text(p.fecha, M + 10, y + 6);
        doc.font('Helvetica-Bold').text(p.estimado, M + 120, y + 6);
        doc.font('Helvetica').text(`${p.inferior} - ${p.superior}`, M + 250, y + 6);
        doc.text(`${p.confianza}%`, M + 430, y + 6);
        y += 20;
      });

      // FOOTER
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.rect(0, H - 40, W, 40).fill(C.fondo);
        doc.fillColor(C.grisClaro).font('Helvetica').fontSize(8)
           .text(`AGRIFLOW — REPORTE DE SISTEMA · ID: ${reporteId.toUpperCase()}`, M, H - 25);
        doc.text(`PÁGINA ${i + 1} DE ${pages.count}`, W - M - 100, H - 25, { align: 'right', width: 100 });
      }

      doc.end();
    });
  }

  private async obtenerDatosReporte(dto: GenerarReporteDto): Promise<DatosReporte> {
    let nombreEntidad = 'AgriFlow System';
    let tipoEntidad: 'finca' | 'lote' = 'finca';

    try {
      if (dto.loteId) {
        const lote = await this.loteRepo.findOne({ where: { id: dto.loteId } });
        if (lote) {
          nombreEntidad = lote.nombre;
          tipoEntidad = 'lote';
        }
      } else if (dto.fincaId) {
        const finca = await this.loteRepo.manager
          .getRepository('finca')
          .findOne({ where: { id: dto.fincaId } } as any);
        if (finca) {
          nombreEntidad = (finca as any).nombre;
          tipoEntidad = 'finca';
        }
      }
    } catch (error) {
      this.logger.error(`Error al obtener nombres de entidades: ${error.message}`);
    }

    // En producción, aquí se consultarían las tablas de lecturas, alertas y predicciones
    // filtrando por lote_id o finca_id y el rango de fechas.
    return {
      nombreEntidad,
      tipoEntidad,
      periodoInicio: dto.periodoInicio.toLocaleDateString('es-PE'),
      periodoFin: dto.periodoFin.toLocaleDateString('es-PE'),
      tipo: dto.tipo.replace(/_/g, ' ').toUpperCase(),
      rendimientoEstimado: '7,510', // Ejemplo dinámico
      humedadPromedio: '38.2',
      precipitacionAcumulada: '12.5',
      alertasActivas: 1,
      eficienciaRiego: '92.0',
      lecturas: [
        { sensor: '5TM-S01', tipo: 'Humedad Suelo', valor: '38.2', unidad: '%VWC', fecha: new Date().toLocaleString('es-PE'), anomalia: false },
        { sensor: 'DHT22-S02', tipo: 'Temperatura', valor: '24.3', unidad: '°C', fecha: new Date().toLocaleString('es-PE'), anomalia: false },
      ],
      predicciones: [
        { fecha: 'Hoy', estimado: '7,510', inferior: '6,900', superior: '8,100', confianza: '82.5' },
        { fecha: 'Mañana', estimado: '7,480', inferior: '6,850', superior: '8,050', confianza: '81.2' },
        { fecha: 'Próx. Semana', estimado: '7,600', inferior: '7,000', superior: '8,200', confianza: '79.5' },
      ],
    };
  }
}