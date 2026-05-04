import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as PDFDocument from 'pdfkit';
import * as path from 'path';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import { Reporte, TipoReporte } from './entities/reporte.entity';

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
  private readonly outputDir = path.join(process.cwd(), 'reportes_pdf');

  constructor(
    @InjectRepository(Reporte)
    private readonly reporteRepo: Repository<Reporte>,
  ) {}

  async generarReporte(dto: GenerarReporteDto): Promise<Reporte> {
    const reporte = await this.reporteRepo.save(
      this.reporteRepo.create({
        generado_por: { id: dto.usuarioId } as any,
        finca: dto.fincaId ? ({ id: dto.fincaId } as any) : null,
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

      const W = doc.page.width;   // 595
      const M = 28;                // margen lateral
      const CW = W - M * 2;       // ancho de contenido

      // ── HEADER ──────────────────────────────────────────────
      doc.rect(0, 0, W, 72).fill(C.azulOscuro);

      doc.fillColor(C.blanco)
         .font('Helvetica-Bold').fontSize(16)
         .text(`AgriFlow — ${datos.tipo}`, M, 16, { width: CW * 0.65 });

      doc.font('Helvetica').fontSize(8).fillColor('rgba(255,255,255,0.65)')
         .text(
           `${datos.nombreEntidad} · ${datos.tipoEntidad === 'lote' ? 'Lote de Producción' : 'Finca Agrícola'} · Sistema de Agricultura de Precisión`,
           M, 36, { width: CW * 0.65 },
         );

      // Badge
      const badge = datos.tipo;
      const bW = doc.widthOfString(badge) + 16;
      doc.roundedRect(W - M - bW, 14, bW, 16, 8)
         .fill('rgba(255,255,255,0.18)');
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.blanco)
         .text(badge, W - M - bW + 8, 18, { width: bW });

      doc.font('Helvetica').fontSize(8).fillColor('rgba(255,255,255,0.65)')
         .text(`Período: ${datos.periodoInicio} — ${datos.periodoFin}`, W - M - 160, 34, { width: 160, align: 'right' })
         .text(`ID: ${reporteId.substring(0, 8).toUpperCase()}`, W - M - 160, 46, { width: 160, align: 'right' });

      let y = 88; // posición vertical actual

      // ── HELPER: sección título ───────────────────────────────
      const sectionTitle = (titulo: string) => {
        doc.font('Helvetica-Bold').fontSize(10).fillColor(C.azulOscuro)
           .text(titulo, M, y);
        y += 14;
        doc.moveTo(M, y).lineTo(W - M, y).lineWidth(1.5).stroke(C.borde);
        y += 10;
      };

      // ── MÉTRICAS ─────────────────────────────────────────────
      sectionTitle('Resumen del Período');

      const cards = [
        { valor: datos.rendimientoEstimado, unidad: 'kg/ha', label: 'Rendimiento Estimado', color: C.verde },
        { valor: `${datos.humedadPromedio}%`, unidad: '%VWC', label: 'Humedad Suelo Prom.', color: C.azulOscuro },
        { valor: datos.precipitacionAcumulada, unidad: 'mm', label: 'Precipitación Acum.', color: C.azulOscuro },
        { valor: String(datos.alertasActivas), unidad: 'alertas', label: 'Alertas Activas', color: datos.alertasActivas > 0 ? C.amarillo : C.verde },
      ];

      const cW = (CW - 9 * 3) / 4;  // ancho de cada card (4 columnas, 3 gaps)
      cards.forEach((c, i) => {
        const cx = M + i * (cW + 9);
        doc.roundedRect(cx, y, cW, 52, 6).fill(C.fondo);
        doc.roundedRect(cx, y, cW, 52, 6).lineWidth(0.5).stroke(C.borde);
        doc.font('Helvetica-Bold').fontSize(20).fillColor(c.color)
           .text(c.valor, cx + 8, y + 8, { width: cW - 16 });
        doc.font('Helvetica').fontSize(8).fillColor(C.grisMedio)
           .text(c.unidad, cx + 8, y + 30, { width: cW - 16 });
        doc.font('Helvetica').fontSize(7.5).fillColor(C.grisClaro)
           .text(c.label.toUpperCase(), cx + 8, y + 40, { width: cW - 16 });
      });
      y += 66;

      // ── PREDICCIONES ML ──────────────────────────────────────
      sectionTitle('Predicciones ML (Ensemble RF+GB+XGB)');

      // Cabecera tabla
      const predCols = [
        { label: 'Fecha',            w: 70 },
        { label: 'Estimado (kg/ha)', w: 100 },
        { label: 'Rango P5–P95',     w: 130 },
        { label: 'Confianza',        w: 60 },
        { label: 'Indicador',        w: CW - 70 - 100 - 130 - 60 },
      ];

      doc.rect(M, y, CW, 18).fill(C.azulOscuro);
      let cx = M;
      predCols.forEach((col) => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.blanco)
           .text(col.label, cx + 5, y + 5, { width: col.w - 5 });
        cx += col.w;
      });
      y += 18;

      datos.predicciones.forEach((p, idx) => {
        if (idx % 2 === 0) doc.rect(M, y, CW, 18).fill(C.fondo);
        const vals = [p.fecha, p.estimado, `${p.inferior} – ${p.superior}`, `${p.confianza}%`];
        cx = M;
        vals.forEach((v, vi) => {
          const isBold = vi === 1;
          doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
             .fillColor(C.grisOscuro)
             .text(v, cx + 5, y + 5, { width: predCols[vi].w - 5 });
          cx += predCols[vi].w;
        });
        // Barra de confianza
        const barX = cx + 5;
        const barW = predCols[4].w - 14;
        const conf = parseFloat(p.confianza) / 100;
        doc.rect(barX, y + 7, barW, 5).fill('#e2e8f0');
        doc.rect(barX, y + 7, barW * conf, 5).fill(C.azulClaro);
        y += 18;
      });
      y += 14;

      // ── LECTURAS SENSORES ────────────────────────────────────
      sectionTitle('Lecturas de Sensores (Últimas del Período)');

      const sensCols = [
        { label: 'Sensor',    w: 80 },
        { label: 'Variable',  w: 90 },
        { label: 'Valor',     w: 55 },
        { label: 'Unidad',    w: 55 },
        { label: 'Registrado', w: 120 },
        { label: 'Estado',    w: CW - 80 - 90 - 55 - 55 - 120 },
      ];

      doc.rect(M, y, CW, 18).fill(C.azulOscuro);
      cx = M;
      sensCols.forEach((col) => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.blanco)
           .text(col.label, cx + 5, y + 5, { width: col.w - 5 });
        cx += col.w;
      });
      y += 18;

      datos.lecturas.forEach((l, idx) => {
        if (idx % 2 === 0) doc.rect(M, y, CW, 18).fill(C.fondo);
        const vals = [l.sensor, l.tipo, l.valor, l.unidad, l.fecha];
        cx = M;
        vals.forEach((v, vi) => {
          const isBold = vi === 2;
          doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
             .fillColor(C.grisOscuro)
             .text(v, cx + 5, y + 5, { width: sensCols[vi].w - 5 });
          cx += sensCols[vi].w;
        });
        // Chip estado
        const chipColor = l.anomalia ? C.rojo : C.verde;
        const chipBg   = l.anomalia ? '#fee2e2' : '#dcfce7';
        const chipText = l.anomalia ? 'Anomalía' : 'Normal';
        const chipW = 48;
        doc.roundedRect(cx + 4, y + 4, chipW, 12, 5).fill(chipBg);
        doc.font('Helvetica-Bold').fontSize(7).fillColor(chipColor)
           .text(chipText, cx + 4, y + 7, { width: chipW, align: 'center' });
        y += 18;
      });
      y += 14;

      // ── EFICIENCIA HÍDRICA (solo gestión/ejecutivo) ──────────
      const esGestion = tipo === 'gestion_mensual' || tipo === 'ejecutivo';
      if (esGestion) {
        sectionTitle('Eficiencia Hídrica');
        doc.roundedRect(M, y, 120, 52, 6).fill(C.fondo);
        doc.roundedRect(M, y, 120, 52, 6).lineWidth(0.5).stroke(C.borde);
        doc.font('Helvetica-Bold').fontSize(20).fillColor(C.verde)
           .text(`${datos.eficienciaRiego}%`, M + 8, y + 8, { width: 104 });
        doc.font('Helvetica').fontSize(8).fillColor(C.grisMedio)
           .text('eficiencia', M + 8, y + 30, { width: 104 });
        doc.font('Helvetica').fontSize(7.5).fillColor(C.grisClaro)
           .text('RIEGO APLICADO VS RECOMENDADO', M + 8, y + 40, { width: 104 });

        doc.font('Helvetica').fontSize(9).fillColor(C.grisMedio)
           .text(
             'La eficiencia hídrica se calcula como el cociente entre la lámina de riego aplicada y la lámina recomendada por el modelo FAO-56 (ETc = ET0 x Kc). Valores > 85% indican una gestión hídrica óptima.',
             M + 130, y + 8,
             { width: CW - 130, lineGap: 2 },
           );
        y += 70;
      }

      // ── FOOTER ───────────────────────────────────────────────
      const pageHeight = doc.page.height;
      doc.moveTo(M, pageHeight - 28).lineTo(W - M, pageHeight - 28)
         .lineWidth(0.5).stroke(C.borde);
      doc.font('Helvetica').fontSize(8).fillColor(C.grisClaro)
         .text('AgriFlow v1.0 — Sistema de Agricultura de Precisión', M, pageHeight - 20)
         .text(`Generado: ${new Date().toLocaleString('es-PE')} · Ensemble ML v1.0`, M, pageHeight - 20, { align: 'right', width: CW });

      doc.end();
    });
  }

  private async obtenerDatosReporte(dto: GenerarReporteDto): Promise<DatosReporte> {
    return {
      nombreEntidad: dto.loteId ? 'Lote 01 - Sector Norte' : 'Finca La Esperanza',
      tipoEntidad: dto.loteId ? 'lote' : 'finca',
      periodoInicio: dto.periodoInicio.toLocaleDateString('es-PE'),
      periodoFin: dto.periodoFin.toLocaleDateString('es-PE'),
      tipo: dto.tipo.replace(/_/g, ' ').toUpperCase(),
      rendimientoEstimado: '8,240',
      humedadPromedio: '52.3',
      precipitacionAcumulada: '14.0',
      alertasActivas: 2,
      eficienciaRiego: '87.5',
      lecturas: [
        { sensor: 'DHT22-A1', tipo: 'Temperatura',    valor: '27.3', unidad: '°C',    fecha: '30/04/2025 08:00', anomalia: false },
        { sensor: '5TM-A1',   tipo: 'Humedad Suelo',  valor: '45.2', unidad: '%VWC',  fecha: '30/04/2025 08:00', anomalia: false },
        { sensor: 'Davis-A1', tipo: 'Precipitación',  valor: '8.1',  unidad: 'mm',    fecha: '30/04/2025 06:00', anomalia: false },
        { sensor: 'DHT22-A1', tipo: 'Temperatura',    valor: '29.1', unidad: '°C',    fecha: '29/04/2025 14:00', anomalia: false },
        { sensor: '5TM-A1',   tipo: 'Humedad Suelo',  valor: '39.1', unidad: '%VWC',  fecha: '29/04/2025 14:00', anomalia: true  },
      ],
      predicciones: [
        { fecha: '30/04/2025', estimado: '8,240', inferior: '7,100', superior: '9,380', confianza: '82.5' },
        { fecha: '29/04/2025', estimado: '8,110', inferior: '6,980', superior: '9,240', confianza: '80.1' },
        { fecha: '28/04/2025', estimado: '7,950', inferior: '6,800', superior: '9,100', confianza: '79.3' },
      ],
    };
  }
}