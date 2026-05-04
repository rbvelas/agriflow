'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatNumber } from '@/lib/utils';
import { 
  Brain, 
  ShieldCheck, 
  AlertCircle, 
  Activity, 
  Clock, 
  Target,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface Prediccion {
  rendimiento_estimado_kg_ha: number;
  intervalo_inferior_kg_ha: number;
  intervalo_superior_kg_ha: number;
  confianza_porcentaje: number;
  version_modelo: string;
  generado_en: string;
}

interface Props {
  prediccion?: Prediccion;
  cargando?: boolean;
  'data-testid'?: string;
}

const getConfianzaColor = (confianza: number) => {
  if (confianza >= 85) return 'text-emerald-700 border-emerald-100 bg-emerald-50';
  if (confianza >= 70) return 'text-amber-700 border-amber-100 bg-amber-50';
  return 'text-red-700 border-red-100 bg-red-50';
};

/**
 * Tarjeta de predicción de rendimiento con visualización
 * del intervalo de confianza al 90% usando una barra de progreso.
 */
export function PrediccionCard({
  prediccion,
  cargando = false,
  'data-testid': testId,
}: Props) {
  // Manejo de estado de carga o predicción no disponible
  if (cargando || !prediccion) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden animate-pulse">
        <CardHeader className="pb-4 pt-6 px-6 border-b border-slate-50">
          <div className="h-4 w-48 bg-slate-100 rounded" />
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-32 bg-slate-100 rounded-xl" />
            <div className="h-4 w-24 bg-slate-50 rounded" />
          </div>
          <div className="h-2 bg-slate-100 rounded-full w-full" />
        </CardContent>
      </Card>
    );
  }

  const { 
    rendimiento_estimado_kg_ha: estimado,
    intervalo_inferior_kg_ha: inferior,
    intervalo_superior_kg_ha: superior,
    confianza_porcentaje: confianza,
    version_modelo: version,
    generado_en,
  } = prediccion;

  // Posición relativa del estimado dentro del rango del intervalo
  const rango = superior - inferior || 1;
  const posicionPct = Math.min(Math.max(Math.round(((estimado - inferior) / rango) * 100), 0), 100);

  const confianzaClases = getConfianzaColor(confianza);

  return (
    <Card
      className="bg-white border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden group"
      data-testid={testId}
    >
      <CardHeader className="pb-4 pt-8 px-10 border-b border-slate-50">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
              <Brain size={20} />
            </div>
            Predicción IA Agrícola
          </CardTitle>
          <div className="flex gap-2">
            <Badge
              variant="outline"
              className={cn("text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-widest", confianzaClases)}
            >
              {confianza >= 70 ? <ShieldCheck size={10} className="mr-1.5" /> : <AlertCircle size={10} className="mr-1.5" />}
              {Number(confianza).toFixed(1)}% Confianza
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-10 space-y-10">
        {/* Estimación central */}
        <div className="text-center space-y-4 py-4 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 opacity-5">
             <Sparkles size={120} className="text-emerald-600" />
          </div>
          <div className="flex flex-col items-center justify-center gap-1 relative z-10">
            <div className="flex items-baseline gap-3">
              <span className="text-7xl font-black text-slate-900 tracking-tighter tabular-nums">
                {formatNumber(Number(estimado), 0)}
              </span>
              <span className="text-xl font-black text-emerald-600 uppercase tracking-widest">kg / ha</span>
            </div>
            <p className="text-xs text-slate-500 font-bold flex items-center gap-2 mt-2 uppercase tracking-[0.2em]">
              <Target size={16} className="text-emerald-500" />
              Rendimiento Proyectado
            </p>
          </div>
        </div>

        {/* Visualización del Intervalo */}
        <div className="space-y-6">
          <div className="flex justify-between items-end">
             <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Límite P5</p>
                <p className="text-sm font-black text-slate-900 tabular-nums">{formatNumber(inferior, 0)}</p>
             </div>
             <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-tighter mb-2">
                  Rango de Certeza 90%
                </span>
             </div>
             <div className="space-y-1 text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Límite P95</p>
                <p className="text-sm font-black text-slate-900 tabular-nums">{formatNumber(superior, 0)}</p>
             </div>
          </div>

          <div className="relative h-4 bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100">
             <div 
               className="absolute top-0 bottom-0 bg-emerald-500/10 border-x border-emerald-500/20"
               style={{ left: '0%', right: '0%' }}
             />
             {/* Línea conectora visual */}
             <div className="absolute top-1/2 -translate-y-1/2 left-[10%] right-[10%] h-[1px] bg-slate-200" />
             
             {/* Marcador de estimación */}
             <div 
               className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-[3px] border-emerald-600 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] z-10 transition-all duration-1000 flex items-center justify-center"
               style={{ left: `${posicionPct}%`, transform: `translate(-50%, -50%)` }}
             >
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
             </div>
          </div>
        </div>

        {/* Info del Modelo */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-emerald-50/30 rounded-2xl p-4 border border-emerald-50 space-y-1">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                <Activity size={12} /> Versión
              </span>
              <p className="text-sm font-black text-slate-900">{version}</p>
           </div>
           <div className="bg-blue-50/30 rounded-2xl p-4 border border-blue-50 space-y-1">
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={12} /> Actualizado
              </span>
              <p className="text-sm font-black text-slate-900">
                {new Date(generado_en).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
              </p>
           </div>
        </div>

        <button 
          onClick={() => window.location.href = '/predicciones'}
          className="w-full py-5 rounded-2xl border-2 border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex items-center justify-center gap-3 group/btn"
        >
          Análisis Dimensional <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </CardContent>
    </Card>
  );
}
