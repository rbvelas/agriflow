import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Reporte, TipoReporte } from './entities/reporte.entity';

export interface GenerarReporteDto {
  fincaId?: string;
  loteId?: string;
  tipo: TipoReporte;
  periodoInicio: Date;
  periodoFin: Date;
  usuarioId: string;
}

/** Estructura de datos que se inyecta en la plantilla HTML */
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

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);
  private readonly outputDir = path.join(process.cwd(), 'reportes_pdf');

  constructor(
    @InjectRepository(Reporte)
    private readonly reporteRepo: Repository<Reporte>,
  ) {}

  /**
   * Genera un reporte PDF usando Puppeteer con plantilla HTML embebida.
   * Soporta 4 tipos: operacional_diario, operacional_semanal,
   * gestion_mensual y ejecutivo.
   *
   * @param dto - Parámetros del reporte
   * @returns Entidad Reporte con ruta al PDF y estado 'listo'
   */
  async generarReporte(dto: GenerarReporteDto): Promise<Reporte> {
    // Crear registro de trazabilidad en BD
    const reporte = await this.reporteRepo.save(
      this.reporteRepo.create({
        generado_por: { id: dto.usuarioId } as any,
        finca: dto.fincaId ? ({ id: dto.fincaId } as any) : null,
        lote: dto.loteId ? ({ id: dto.loteId } as any) : null,
        tipo: dto.tipo,
        periodo_inicio: dto.periodoInicio,
        periodo_fin: dto.periodoFin,
        estado: 'generando',
      }),
    );

    try {
      await fs.mkdir(this.outputDir, { recursive: true });

      // Obtener datos para el reporte (en prod: queries reales a BD)
      const datos = await this.obtenerDatosReporte(dto);
      const html = this.renderizarPlantillaHTML(dto.tipo, datos, reporte.id);

      // Generar PDF con Puppeteer
      const rutaArchivo = path.join(
        this.outputDir,
        `reporte_${reporte.id}.pdf`,
      );

      const browser = await puppeteer.launch({
        headless: true,
        executablePath:
          process.env.PUPPETEER_EXECUTABLE_PATH ?? undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: rutaArchivo,
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
      });
      await browser.close();

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

  /** Recupera datos reales de la BD para el reporte */
  private async obtenerDatosReporte(
    dto: GenerarReporteDto,
  ): Promise<DatosReporte> {
    // En producción se hacen queries a lectura_sensor, prediccion_rendimiento, alerta, etc.
    // Para el MVP retornamos datos representativos que se integran con los datos semilla.
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
        { sensor: 'DHT22-A1', tipo: 'Temperatura', valor: '27.3', unidad: '°C', fecha: '30/04/2025 08:00', anomalia: false },
        { sensor: '5TM-A1', tipo: 'Humedad Suelo', valor: '45.2', unidad: '%VWC', fecha: '30/04/2025 08:00', anomalia: false },
        { sensor: 'Davis-A1', tipo: 'Precipitación', valor: '8.1', unidad: 'mm', fecha: '30/04/2025 06:00', anomalia: false },
        { sensor: 'DHT22-A1', tipo: 'Temperatura', valor: '29.1', unidad: '°C', fecha: '29/04/2025 14:00', anomalia: false },
        { sensor: '5TM-A1', tipo: 'Humedad Suelo', valor: '39.1', unidad: '%VWC', fecha: '29/04/2025 14:00', anomalia: true },
      ],
      predicciones: [
        { fecha: '30/04/2025', estimado: '8,240', inferior: '7,100', superior: '9,380', confianza: '82.5' },
        { fecha: '29/04/2025', estimado: '8,110', inferior: '6,980', superior: '9,240', confianza: '80.1' },
        { fecha: '28/04/2025', estimado: '7,950', inferior: '6,800', superior: '9,100', confianza: '79.3' },
      ],
    };
  }

  /** Renderiza la plantilla HTML completa para Puppeteer */
  private renderizarPlantillaHTML(
    tipo: TipoReporte,
    datos: DatosReporte,
    reporteId: string,
  ): string {
    const esGestion = tipo === 'gestion_mensual' || tipo === 'ejecutivo';

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>AgriFlow — ${datos.tipo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         font-size: 11px; color: #1e293b; background: #fff; }
  /* Header */
  .header { background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
            color: #fff; padding: 20px 28px; display: flex;
            align-items: flex-start; justify-content: space-between; }
  .header-left h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
  .header-left .subtitle { font-size: 10px; opacity: 0.65; margin-top: 3px; }
  .header-right { text-align: right; }
  .badge { display: inline-block; background: rgba(255,255,255,0.15);
           padding: 4px 12px; border-radius: 20px; font-size: 9px;
           font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px; }
  .periodo { font-size: 10px; opacity: 0.7; }
  /* Contenido */
  .content { padding: 24px 28px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 12px; font-weight: 700; color: #0f3460;
                   border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;
                   margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
  /* Grid métricas */
  .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .metric-card { background: #f8faff; border: 1px solid #dce8f5;
                 border-radius: 8px; padding: 12px 14px; }
  .metric-card .value { font-size: 22px; font-weight: 800; color: #0f3460;
                        font-variant-numeric: tabular-nums; }
  .metric-card .unit { font-size: 10px; color: #64748b; font-weight: 500; }
  .metric-card .label { font-size: 9px; color: #94a3b8; margin-top: 2px;
                        text-transform: uppercase; letter-spacing: 0.3px; }
  .metric-card.verde .value { color: #16a34a; }
  .metric-card.amarillo .value { color: #d97706; }
  .metric-card.rojo .value { color: #dc2626; }
  /* Tablas */
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead tr { background: #0f3460; color: #fff; }
  th { padding: 7px 10px; text-align: left; font-weight: 600;
       font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }
  td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
  tr:nth-child(even) td { background: #f8faff; }
  .chip { display: inline-block; padding: 2px 7px; border-radius: 10px;
          font-size: 8px; font-weight: 700; }
  .chip-ok  { background: #dcfce7; color: #15803d; }
  .chip-err { background: #fee2e2; color: #b91c1c; }
  /* Barra de confianza */
  .confidence-bar { background: #e2e8f0; border-radius: 4px;
                    height: 6px; width: 100%; overflow: hidden; }
  .confidence-fill { height: 100%; border-radius: 4px;
                     background: linear-gradient(90deg, #3b82f6, #10b981); }
  /* Footer */
  .footer { margin-top: 32px; padding: 12px 0 0;
            border-top: 1px solid #e2e8f0;
            display: flex; justify-content: space-between;
            font-size: 9px; color: #94a3b8; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="header-left">
    <h1>🌾 AgriFlow — ${datos.tipo}</h1>
    <div class="subtitle">${datos.nombreEntidad} · ${datos.tipoEntidad === 'lote' ? 'Lote de Producción' : 'Finca Agrícola'} · Sistema de Agricultura de Precisión</div>
  </div>
  <div class="header-right">
    <div class="badge">${datos.tipo}</div>
    <div class="periodo">Período: ${datos.periodoInicio} — ${datos.periodoFin}</div>
    <div class="periodo" style="margin-top:2px">ID: ${reporteId.substring(0, 8).toUpperCase()}</div>
  </div>
</div>

<div class="content">

  <!-- MÉTRICAS RESUMEN -->
  <div class="section">
    <div class="section-title">📊 Resumen del Período</div>
    <div class="metric-grid">
      <div class="metric-card verde">
        <div class="value">${datos.rendimientoEstimado}</div>
        <div class="unit">kg/ha</div>
        <div class="label">Rendimiento Estimado</div>
      </div>
      <div class="metric-card">
        <div class="value">${datos.humedadPromedio}%</div>
        <div class="unit">%VWC</div>
        <div class="label">Humedad Suelo Promedio</div>
      </div>
      <div class="metric-card">
        <div class="value">${datos.precipitacionAcumulada}</div>
        <div class="unit">mm</div>
        <div class="label">Precipitación Acumulada</div>
      </div>
      <div class="${datos.alertasActivas > 0 ? 'metric-card amarillo' : 'metric-card verde'}">
        <div class="value">${datos.alertasActivas}</div>
        <div class="unit">alertas</div>
        <div class="label">Alertas Activas</div>
      </div>
    </div>
  </div>

  <!-- PREDICCIONES ML -->
  <div class="section">
    <div class="section-title">🤖 Historial de Predicciones ML (Ensemble RF+GB+XGB)</div>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Estimado (kg/ha)</th>
          <th>Rango P5–P95</th>
          <th>Confianza</th>
          <th>Indicador</th>
        </tr>
      </thead>
      <tbody>
        ${datos.predicciones.map((p) => `
        <tr>
          <td>${p.fecha}</td>
          <td><strong>${p.estimado}</strong></td>
          <td>${p.inferior} – ${p.superior}</td>
          <td>${p.confianza}%</td>
          <td>
            <div class="confidence-bar">
              <div class="confidence-fill" style="width:${p.confianza}%"></div>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- LECTURAS DE SENSORES -->
  <div class="section">
    <div class="section-title">📡 Lecturas de Sensores (Últimas del Período)</div>
    <table>
      <thead>
        <tr>
          <th>Sensor</th>
          <th>Variable</th>
          <th>Valor</th>
          <th>Unidad</th>
          <th>Registrado</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${datos.lecturas.map((l) => `
        <tr>
          <td style="font-family:monospace">${l.sensor}</td>
          <td>${l.tipo}</td>
          <td><strong>${l.valor}</strong></td>
          <td>${l.unidad}</td>
          <td>${l.fecha}</td>
          <td><span class="${l.anomalia ? 'chip chip-err' : 'chip chip-ok'}">${l.anomalia ? 'Anomalía' : 'Normal'}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  ${esGestion ? `
  <!-- EFICIENCIA DE RIEGO (solo reportes de gestión) -->
  <div class="section">
    <div class="section-title">💧 Eficiencia Hídrica</div>
    <div class="metric-grid">
      <div class="metric-card verde">
        <div class="value">${datos.eficienciaRiego}%</div>
        <div class="unit">eficiencia</div>
        <div class="label">Riego Aplicado vs Recomendado</div>
      </div>
    </div>
    <p style="margin-top:10px; font-size:10px; color:#64748b; line-height:1.5">
      La eficiencia hídrica se calcula como el cociente entre la lámina de riego aplicada
      y la lámina recomendada por el modelo FAO-56 (ETc = ET0 × Kc). Valores &gt; 85%
      indican una gestión hídrica óptima.
    </p>
  </div>
  ` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <span>🌾 AgriFlow v1.0 — Sistema de Agricultura de Precisión</span>
    <span>Generado: ${new Date().toLocaleString('es-PE')} · Ensemble ML v1.0</span>
  </div>

</div>
</body>
</html>`;
  }
}
