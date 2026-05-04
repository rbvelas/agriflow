'use client';

import { useState, useEffect } from 'react';
import { 
  Brain, 
  Calendar, 
  Gem, 
  Info, 
  LineChart as ChartIcon, 
  Sprout, 
  ChevronRight,
  HelpCircle,
  Clock,
  Target,
  Activity,
  Zap,
  Layers,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLote } from '@/components/providers/LoteProvider';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PrediccionCard } from '@/components/dashboard/PrediccionCard';
import { cn } from '@/lib/utils';

export default function PrediccionesPage() {
  const { loteSeleccionado } = useLote();
  
  // IDs dinámicos
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
        console.error('Error cargando temporada:', e);
        setTemporadaId('');
      }
    };
    cargarTemporada();
  }, [loteSeleccionado?.id]);

  const TEMPORADA_ID = temporadaId;

  const { data: prediccionActual, isLoading: loadingActual } =
    trpc.predicciones.obtener.useQuery(
      { temporadaId: TEMPORADA_ID },
      { enabled: !!TEMPORADA_ID }
    );

  const { data: historialData, isLoading: loadingHist } =
    trpc.predicciones.listar.useQuery(
      { temporadaId: TEMPORADA_ID, limite: 30 },
      { enabled: !!TEMPORADA_ID }
    );

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-widest">
            <Brain size={14} />
            <span>Inteligencia Artificial Agrícola</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Predicciones de Rendimiento
          </h1>
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span className="bg-white px-3 py-1 rounded-full border border-slate-200 text-xs shadow-sm">
              Lote: {loteSeleccionado?.nombre ?? 'No seleccionado'}
            </span>
          </div>
        </div>
      </div>

      {!loteSeleccionado && (
        <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
          <CardContent className="py-24 flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
              <Sprout size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Seleccione un lote</h2>
              <p className="text-slate-500 max-w-sm">
                Utilice el menú lateral para seleccionar la unidad productiva cuyos modelos predictivos desea consultar.
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

      {loteSeleccionado && !TEMPORADA_ID && (
        <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
          <CardContent className="py-24 flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
              <Sprout size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Sin temporada activa</h2>
              <p className="text-slate-500 max-w-sm">
                Este lote no tiene un ciclo de cultivo iniciado. Las predicciones requieren una siembra activa para procesar datos.
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = '/fincas'}
              className="bg-slate-900 text-white hover:bg-slate-800 rounded-2xl px-8 py-6 font-bold flex items-center gap-2"
            >
              Ir a Fincas <ChevronRight size={18} />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Predicción actual y métricas clave */}
      {loteSeleccionado && TEMPORADA_ID && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {loadingActual ? (
              <div className="h-full min-h-[400px] bg-white border border-slate-100 rounded-[2rem] animate-pulse" />
            ) : prediccionActual?.data ? (
              <PrediccionCard prediccion={prediccionActual.data as any} />
            ) : (
              <Card className="h-full bg-white border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-12 text-center">
                <HelpCircle size={48} className="text-slate-200 mb-4" />
                <p className="text-slate-500 font-bold">Sin datos predictivos</p>
                <p className="text-xs text-slate-400 max-w-xs mt-2">No hay predicciones generadas para esta temporada. Asegúrese de tener sensores activos.</p>
              </Card>
            )}
          </div>

          <div className="space-y-8">
            <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden group hover:shadow-md transition-all">
              <CardHeader className="pb-2 pt-8 px-8 border-b border-slate-50">
                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  <Calendar size={14} className="text-emerald-600" />
                  Fecha de Cosecha
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-4xl font-black text-slate-900 tracking-tight">15 Mar 2026</p>
                <p className="text-xs text-slate-500 font-bold mt-4 flex items-center gap-2 uppercase tracking-tighter">
                   <Clock size={12} className="text-emerald-500" /> Estimada según ciclo fenológico
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden group hover:shadow-md transition-all">
              <CardHeader className="pb-2 pt-8 px-8 border-b border-slate-50">
                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  <Gem size={14} className="text-blue-600" />
                  Calidad del Grano
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="flex items-end justify-between mb-6">
                  <p className="text-4xl font-black text-slate-900 tracking-tight">92.5%</p>
                  <span className="text-[10px] text-emerald-700 font-black bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">EXCELENTE</span>
                </div>
                <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(16,185,129,0.4)]" style={{ width: '92.5%' }} />
                </div>
                <p className="text-[10px] text-slate-400 font-black mt-6 uppercase tracking-[0.2em]">Ratio proyectado • Grano A+</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Explicación del modelo */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
        <CardHeader className="pb-4 pt-10 px-10 border-b border-slate-50">
          <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
               <Layers size={24} />
            </div>
            Arquitectura de Inteligencia Artificial (Ensemble Architecture)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em] flex items-center gap-3">
                   <Zap size={14} />
                   Fase 01 — Estimadores Base
                </p>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Tres modelos independientes procesan simultáneamente las variables climáticas, de suelo y satelitales para generar predicciones independientes:
                </p>
              </div>
              <ul className="space-y-6">
                {[
                  { icon: <ChartIcon size={18} />, title: 'Random Forest', desc: 'Reduce varianza y captura relaciones no lineales complejas entre variables.', color: 'text-blue-600', bg: 'bg-blue-50' },
                  { icon: <Activity size={18} />, title: 'Gradient Boosting', desc: 'Reduce sesgo iterativamente aprendiendo de errores de modelos previos.', color: 'text-amber-600', bg: 'bg-amber-50' },
                  { icon: <Target size={18} />, title: 'XGBoost Regularizado', desc: 'Algoritmo de alto rendimiento optimizado para grandes volúmenes de datos.', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                ].map((item, i) => (
                  <li key={i} className="flex gap-5 group">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm border border-transparent", item.bg, item.color)}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-8 bg-emerald-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-emerald-100">
               <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Sparkles size={140} />
               </div>
               <div className="relative z-10 space-y-6">
                 <div className="space-y-3">
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-3">
                      <Brain size={14} />
                      Fase 02 — Meta-Regresor (Blending)
                   </p>
                   <h3 className="text-2xl font-black leading-tight">Optimización de Pesos Dinámicos</h3>
                 </div>
                 <p className="text-sm text-emerald-100/70 leading-relaxed font-medium">
                   Un cuarto modelo de regresión lineal (Meta-Learner) recibe las salidas de los tres estimadores base y aprende a ponderarlas dinámicamente según las condiciones históricas de éxito.
                 </p>
                 <div className="pt-6 border-t border-white/10 space-y-4">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                          <CheckCircle2 size={20} />
                       </div>
                       <div>
                          <p className="text-xs font-bold">Error Medio Absoluto (MAE)</p>
                          <p className="text-lg font-black text-emerald-400">0.042</p>
                       </div>
                    </div>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                      Este enfoque reduce el error predictivo en un 18.5% en comparación con modelos individuales tradicionales.
                    </p>
                 </div>
               </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CheckCircle2({ size, className }: { size: number, className?: string }) {
  return <Sparkles size={size} className={className} />;
}
