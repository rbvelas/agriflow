'use client';

import { trpc } from '@/lib/trpc';
import { SensorChart } from '@/components/dashboard/SensorChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLote } from '@/components/providers/LoteProvider';
import { cn } from '@/lib/utils';

import { 
  Radio, 
  Thermometer, 
  Droplets, 
  CloudRain, 
  Leaf, 
  Wind, 
  Sun,
  Activity,
  Clock,
  RefreshCw,
  Info,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const tipoConfig: Record<string, { color: string; icon: any; unidad: string; bg: string; text: string }> = {
  temperatura:     { color: '#f59e0b', icon: Thermometer, unidad: '°C',    bg: 'bg-amber-50',   text: 'text-amber-600' },
  humedad_suelo:   { color: '#3b82f6', icon: Droplets,    unidad: '%VWC',  bg: 'bg-blue-50',    text: 'text-blue-600' },
  precipitacion:   { color: '#60a5fa', icon: CloudRain,   unidad: 'mm',    bg: 'bg-sky-50',     text: 'text-sky-600' },
  ndvi:            { color: '#22c55e', icon: Leaf,        unidad: 'NDVI',  bg: 'bg-emerald-50', text: 'text-emerald-600' },
  viento:          { color: '#94a3b8', icon: Wind,        unidad: 'm/s',   bg: 'bg-slate-50',   text: 'text-slate-600' },
  radiacion_solar: { color: '#fbbf24', icon: Sun,         unidad: 'W/m²',  bg: 'bg-yellow-50',  text: 'text-yellow-600' },
};

export default function SensoresPage() {
  const { loteSeleccionado } = useLote();
  const LOTE_ID = loteSeleccionado?.id ?? '';

  const { data: lecturasData, isLoading, refetch } = trpc.sensores.ultimasLecturas.useQuery(
    { loteId: LOTE_ID, horas: 48 },
    { refetchInterval: 30_000, enabled: !!LOTE_ID },
  );

  const lecturas: any[] = lecturasData?.data ?? [];

  // Agrupar lecturas por tipo de sensor
  const porTipo = lecturas.reduce<Record<string, any[]>>((acc, l) => {
    const tipo = l.sensor?.tipo ?? 'otro';
    if (!acc[tipo]) acc[tipo] = [];
    acc[tipo].push(l);
    return acc;
  }, {});

  // Construir series temporales para cada tipo
  const construirSerie = (lecturasTipo: any[]) =>
    lecturasTipo.map((l) => ({
      hora: new Date(l.registrado_en).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      valor: Number(l.valor),
    }));

  // Última lectura de cada tipo
  const ultimaLectura = (tipo: string) => {
    const arr = porTipo[tipo] ?? [];
    return arr.length ? arr[arr.length - 1] : null;
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
            <Radio size={14} className="animate-pulse" />
            <span>Monitoreo en Tiempo Real</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Lecturas de Sensores
          </h1>
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span className="bg-white px-3 py-1 rounded-full border border-slate-200 text-xs shadow-sm">
              Lote: {loteSeleccionado?.nombre ?? 'No seleccionado'}
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
              <Clock size={12} />
              Últimas 48 horas
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => refetch()}
          className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 px-6 py-6 rounded-2xl transition-all shadow-sm"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin mr-2' : 'mr-2'} />
          Actualizar ahora
        </Button>
      </div>

      {!loteSeleccionado && (
        <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
          <CardContent className="py-24 flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
              <Radio size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Seleccione un lote</h2>
              <p className="text-slate-500 max-w-sm">
                Utilice el menú lateral para seleccionar la unidad productiva cuyos sensores desea visualizar.
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              className="bg-slate-900 text-white hover:bg-slate-800 rounded-2xl px-8 py-6 font-bold flex items-center gap-2"
            >
              Ir al Dashboard <ChevronRight size={18} />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tarjetas resumen de cada sensor */}
      {loteSeleccionado && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {Object.entries(tipoConfig).map(([tipo, cfg]) => {
          const ultima = ultimaLectura(tipo);
          const Icon = cfg.icon;
          return (
            <Card
              key={tipo}
              className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden group"
            >
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", cfg.bg, cfg.text)}>
                    <Icon size={20} />
                  </div>
                  
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{tipo.replace('_', ' ')}</p>
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse" />
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-900">
                          {ultima ? Number(ultima.valor).toFixed(1) : '—'}
                        </span>
                        <span className="text-xs font-bold text-slate-400">{cfg.unidad}</span>
                      </div>
                    )}
                  </div>

                  {ultima && (
                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                        <Clock size={10} />
                        {new Date(ultima.registrado_en).toLocaleTimeString('es-PE', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                      {ultima.es_anomalia && (
                        <div className="flex items-center gap-1 text-[10px] text-red-500 font-bold animate-pulse">
                          <ShieldAlert size={10} />
                          ALERTA
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}

      {/* Gráficos de series temporales */}
      {loteSeleccionado && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Object.entries(porTipo).map(([tipo, data]) => {
            const cfg = tipoConfig[tipo] ?? { color: '#94a3b8', unidad: '', icon: Activity };
            const serie = construirSerie(data);
            if (serie.length === 0) return null;
            return (
              <div key={tipo} className="space-y-4">
                <SensorChart
                  titulo={`${tipo.replace('_', ' ').toUpperCase()} (${cfg.unidad}) — HISTORIAL 48H`}
                  datos={serie.map((d) => ({ hora: d.hora, [tipo]: d.valor }))}
                  clave={tipo}
                  color={cfg.color}
                  unidad={cfg.unidad}
                  umbral={
                    tipo === 'humedad_suelo'
                      ? { valor: 30, etiqueta: 'Mínimo Crítico (PMP)' }
                      : tipo === 'temperatura'
                      ? { valor: 32, etiqueta: 'Umbral Estrés Térmico' }
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      {lecturas.length === 0 && loteSeleccionado && !isLoading && (
        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
               <Info size={32} />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-slate-900">Sin datos registrados</p>
              <p className="text-sm text-slate-500 max-w-xs">
                No se han recibido lecturas en las últimas 48 horas. Verifique la alimentación y conectividad de sus nodos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
