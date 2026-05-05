'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { SensorChart } from '@/components/dashboard/SensorChart';
import { PrediccionCard } from '@/components/dashboard/PrediccionCard';
import { AlertasPanel } from '@/components/dashboard/AlertasPanel';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useLote } from '@/components/providers/LoteProvider';
import { getUsuario } from '@/lib/auth';

import { 
  FileDown, 
  Leaf, 
  Droplets, 
  Thermometer, 
  Wind,
  CloudRain,
  ChevronRight,
  RefreshCw,
  Calendar,
  Info
} from 'lucide-react';

export default function DashboardPage() {
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const { toast } = useToast();
  const { loteSeleccionado } = useLote();
  const usuario = getUsuario();

  // Obtener datos detallados del lote incluyendo su temporada activa
  const { data: loteDetalle } = trpc.sensores.listarAlertas.useQuery(
    { loteId: loteSeleccionado?.id ?? '', soloActivas: false },
    { 
      enabled: !!loteSeleccionado?.id,
    }
  );

  // Intentamos obtener la temporada activa del lote
  const [temporadaId, setTemporadaId] = useState<string>('');

  useEffect(() => {
    const cargarTemporada = async () => {
      if (!loteSeleccionado?.id) return;
      const token = localStorage.getItem('agriflow_token');
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/lotes/${loteSeleccionado.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.data?.temporada_activa_id) {
          setTemporadaId(json.data.temporada_activa_id);
        } else {
          setTemporadaId('');
        }
      } catch (e) {
        console.error(e);
      }
    };
    cargarTemporada();
  }, [loteSeleccionado?.id]);

  const LOTE_ID = loteSeleccionado?.id ?? '';
  const FINCA_ID = loteSeleccionado?.fincaId ?? '';
  const USUARIO_ID = usuario?.id ?? '';
  const TEMPORADA_ID = temporadaId;

  // ── Queries tRPC ──────────────────────────────────────────────────
  const { data: prediccionData, isLoading: loadingPred } =
    trpc.predicciones.obtener.useQuery(
      { temporadaId: TEMPORADA_ID },
      { refetchInterval: 60_000, enabled: !!TEMPORADA_ID },
    );

  const { data: lecturasData, isLoading: loadingLecturas } =
    trpc.sensores.ultimasLecturas.useQuery(
      { loteId: LOTE_ID, horas: 24 },
      { refetchInterval: 30_000, enabled: !!LOTE_ID },
    );

  const { data: alertasData } = trpc.sensores.listarAlertas.useQuery(
    { loteId: LOTE_ID, soloActivas: true },
    { refetchInterval: 15_000, enabled: !!LOTE_ID },
  );

  const { data: riegoData } = trpc.riegos.calcularRecomendacion.useQuery(
    { temporadaId: TEMPORADA_ID },
    { refetchInterval: 120_000, enabled: !!TEMPORADA_ID },
  );

  // ── Mutación para generar PDF ─────────────────────────────────────
  const generarReporteMutation = trpc.reportes.generar.useMutation({
    onSuccess: (result) => {
      const reporteId = result.data?.id;
      toast({
        title: '✅ Reporte generado',
        description: `Iniciando descarga...`,
      });
      
      if (reporteId) {
        setTimeout(() => {
          const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/reportes/${reporteId}/descargar`;
          window.open(downloadUrl, '_blank');
          setGenerandoPDF(false);
        }, 1000);
      } else {
        setGenerandoPDF(false);
      }
    },
    onError: (error) => {
      toast({
        title: '❌ Error al generar reporte',
        description: error.message,
        variant: 'destructive',
      });
      setGenerandoPDF(false);
    },
  });

  const handleGenerarReporte = () => {
    if (!LOTE_ID) {
      toast({ title: '⚠️ Error', description: 'Debe seleccionar un lote.', variant: 'destructive' });
      return;
    }
    setGenerandoPDF(true);
    const hoy = new Date();
    const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    generarReporteMutation.mutate({
      loteId: LOTE_ID,
      tipo: 'operacional_semanal',
      periodoInicio: hace7dias.toISOString(),
      periodoFin: hoy.toISOString(),
      usuarioId: USUARIO_ID,
    });
  };

  // ── Transformar lecturas para gráfico ─────────────────────────────
  const lecturas: any[] = lecturasData?.data ?? [];
  const datosGraficoMap: Record<string, { hora: string; temperatura?: number; humedad?: number }> = {};

  for (const lectura of lecturas) {
    const hora = new Date(lectura.registrado_en).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    });
    if (!datosGraficoMap[hora]) datosGraficoMap[hora] = { hora };
    if (lectura.sensor?.tipo === 'temperatura') datosGraficoMap[hora].temperatura = Number(lectura.valor);
    if (lectura.sensor?.tipo === 'humedad_suelo') datosGraficoMap[hora].humedad = Number(lectura.valor);
  }
  const datosGrafico = Object.values(datosGraficoMap);

  const prediccion = prediccionData?.data;
  const ultimaHumedad = lecturas.findLast((l: any) => l.sensor?.tipo === 'humedad_suelo');
  const ultimaTemp = lecturas.findLast((l: any) => l.sensor?.tipo === 'temperatura');

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
            <Calendar size={14} />
            <span>Resumen de Operaciones</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            {loteSeleccionado ? loteSeleccionado.nombre : 'Bienvenido'}
          </h1>
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span className="bg-white px-3 py-1 rounded-full border border-slate-200 text-xs shadow-sm">
              Finca: {loteSeleccionado?.fincaNombre ?? 'Seleccione una'}
            </span>
            {loteSeleccionado && (
              <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100 text-xs font-bold shadow-sm shadow-emerald-50/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Temporada Activa
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 px-4 py-6 rounded-2xl transition-all shadow-sm"
          >
            <RefreshCw size={18} className="mr-2" />
            Sincronizar
          </Button>
          <Button
            onClick={handleGenerarReporte}
            disabled={generandoPDF || !LOTE_ID}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-6 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2"
          >
            {generandoPDF ? <RefreshCw size={18} className="animate-spin" /> : <FileDown size={18} />}
            {generandoPDF ? 'Generando...' : 'Descargar Reporte'}
          </Button>
        </div>
      </div>

      {/* No selection State */}
      {!loteSeleccionado && (
        <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
          <CardContent className="py-24 flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
              <Leaf size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Seleccione un lote para comenzar</h2>
              <p className="text-slate-500 max-w-sm">
                Utilice el menú lateral para seleccionar la unidad productiva que desea monitorear hoy.
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = '/fincas'}
              className="bg-slate-900 text-white hover:bg-slate-800 rounded-2xl px-8 py-6 font-bold flex items-center gap-2"
            >
              Gestionar Fincas <ChevronRight size={18} />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No active season State */}
      {loteSeleccionado && !TEMPORADA_ID && (
        <Card className="bg-white border-amber-200 shadow-xl rounded-[2rem] overflow-hidden">
          <CardContent className="py-16 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
              <Info size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Lote sin temporada activa</h2>
              <p className="text-slate-500 max-w-md">
                Para ver predicciones de IA y recomendaciones de riego, primero debe iniciar una temporada de cultivo.
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = '/fincas'}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-2xl px-8 py-6 font-bold flex items-center gap-2 shadow-lg shadow-amber-100"
            >
              Iniciar Temporada <ChevronRight size={18} />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Grid */}
      {TEMPORADA_ID && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Top Metrics Row */}
          <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              titulo="Rendimiento Estimado"
              valor={prediccion
                ? `${Number(prediccion.rendimiento_estimado_kg_ha).toLocaleString('es-PE', { maximumFractionDigits: 0 })} kg/ha`
                : '—'}
              subtitulo={`Confianza: ${prediccion ? Number(prediccion.confianza_porcentaje).toFixed(1) : '—'}%`}
              icono={Leaf}
              colorVariant="emerald"
              tendencia="up"
              cargando={loadingPred}
            />
            <MetricCard
              titulo="Humedad del Suelo"
              valor={ultimaHumedad ? `${Number(ultimaHumedad.valor).toFixed(1)} %VWC` : '—'}
              subtitulo="Lectura promedio actual"
              icono={Droplets}
              colorVariant="blue"
              tendencia="neutral"
              cargando={loadingLecturas}
            />
            <MetricCard
              titulo="Temperatura Aire"
              valor={ultimaTemp ? `${Number(ultimaTemp.valor).toFixed(1)} °C` : '—'}
              subtitulo="Últimas 24 horas"
              icono={Thermometer}
              colorVariant="amber"
              tendencia="up"
              cargando={loadingLecturas}
            />
            <MetricCard
              titulo="Riego Sugerido"
              valor={riegoData?.data?.lamina_recomendada_mm ? `${Number(riegoData.data.lamina_recomendada_mm).toFixed(1)} mm` : '—'}
              subtitulo="Cálculo FAO-56 diario"
              icono={CloudRain}
              colorVariant="indigo"
              tendencia="neutral"
            />
          </div>

          {/* Charts Section */}
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SensorChart
                titulo="Temperatura (°C) — Últimas 24H"
                datos={datosGrafico}
                clave="temperatura"
                color="#f59e0b"
                unidad="°C"
              />
              <SensorChart
                titulo="Humedad del Suelo (%VWC) — Últimas 24H"
                datos={datosGrafico}
                clave="humedad"
                color="#3b82f6"
                unidad="%VWC"
                umbral={{ valor: 40, etiqueta: 'Mínimo óptimo' }}
              />
            </div>
            
            {/* Alertas Section */}
            <AlertasPanel alertas={alertasData?.data ?? []} />
          </div>

          {/* Sidebar Section in Dashboard */}
          <div className="lg:col-span-1 space-y-6">
            <PrediccionCard prediccion={prediccion} cargando={loadingPred} />
            
            {/* Quick Stats / Info Card */}
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Info size={16} className="text-emerald-600" />
                Info del Cultivo
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                  <span className="text-xs text-slate-500 font-medium">Lote</span>
                  <span className="text-xs font-bold text-slate-900">{loteSeleccionado?.nombre}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                  <span className="text-xs text-slate-500 font-medium">Finca</span>
                  <span className="text-xs font-bold text-slate-900">{loteSeleccionado?.fincaNombre}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">ID Temporada</span>
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                    {TEMPORADA_ID.split('-')[0]}...
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
