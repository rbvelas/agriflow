'use client';

import { trpc } from '@/lib/trpc';
import { AlertasPanel } from '@/components/dashboard/AlertasPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLote } from '@/components/providers/LoteProvider';
import { getUsuario } from '@/lib/auth';
import { 
  Bell, 
  History, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Settings2,
  ChevronRight,
  Filter,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AlertasPage() {
  const { loteSeleccionado } = useLote();
  const usuario = getUsuario();
  
  const LOTE_ID = loteSeleccionado?.id ?? '';
  const USUARIO_ID = usuario?.id ?? '';

  const { data: activasData, isLoading: loadingActivas } =
    trpc.sensores.listarAlertas.useQuery(
      { loteId: LOTE_ID, soloActivas: true },
      { refetchInterval: 15_000, enabled: !!LOTE_ID },
    );

  const { data: todasData, isLoading: loadingTodas } =
    trpc.sensores.listarAlertas.useQuery(
      { loteId: LOTE_ID, soloActivas: false },
      { enabled: !!LOTE_ID }
    );

  const activas = activasData?.data ?? [];
  const todas = todasData?.data ?? [];
  const resueltas = todas.filter((a: any) => a.resuelta).sort((a: any, b: any) => 
    new Date(b.generada_en).getTime() - new Date(a.generada_en).getTime()
  );

  const contBySeveridad = activas.reduce<Record<string, number>>((acc, a: any) => {
    acc[a.severidad] = (acc[a.severidad] ?? 0) + 1;
    return acc;
  }, {});

  const statCards = [
    { label: 'Total Activas', valor: activas.length, color: 'text-slate-900', bg: 'bg-white', icon: <Bell size={18} /> },
    { label: 'Críticas', valor: contBySeveridad['critica'] ?? 0, color: 'text-red-600', bg: 'bg-red-50/50', icon: <ShieldAlert size={18} /> },
    { label: 'Altas', valor: contBySeveridad['alta'] ?? 0, color: 'text-orange-600', bg: 'bg-orange-50/50', icon: <AlertTriangle size={18} /> },
    { label: 'Resueltas', valor: resueltas.length, color: 'text-emerald-600', bg: 'bg-emerald-50/50', icon: <CheckCircle2 size={18} /> },
  ];

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-widest">
            <Bell size={14} />
            <span>Centro de Notificaciones</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Gestión de Alertas
          </h1>
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span className="bg-white px-3 py-1 rounded-full border border-slate-200 text-xs shadow-sm">
              Lote: {loteSeleccionado?.nombre ?? 'No seleccionado'}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
           <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
             <Filter size={18} />
           </button>
           <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
             <Settings2 size={18} />
           </button>
        </div>
      </div>

      {!loteSeleccionado && (
        <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
          <CardContent className="py-24 flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
              <Bell size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Seleccione un lote</h2>
              <p className="text-slate-500 max-w-sm">
                Utilice el menú lateral para seleccionar la unidad productiva cuyas alertas desea monitorear.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loteSeleccionado && (
        <div className="space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {statCards.map((s) => (
              <div
                key={s.label}
                className={cn(
                  "rounded-[1.5rem] border border-slate-200 p-6 flex items-center gap-4 transition-all hover:shadow-md",
                  s.bg
                )}
              >
                <div className={cn("p-3 rounded-xl", s.color, "bg-white border border-slate-100 shadow-sm")}>
                  {s.icon}
                </div>
                <div>
                  <p className={cn("text-3xl font-black tracking-tighter tabular-nums", s.color)}>{s.valor}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Alertas activas */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                  <AlertTriangle size={18} className="text-amber-500" />
                  Alertas Activas
                </h2>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tiempo real activado</span>
              </div>
              
              {loadingActivas ? (
                <div className="space-y-4 animate-pulse">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-white border border-slate-100 rounded-2xl" />
                  ))}
                </div>
              ) : (
                <AlertasPanel alertas={activas} />
              )}
            </div>

            {/* Historial y Configuración */}
            <div className="space-y-8">
              {/* Resueltas */}
              <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
                <CardHeader className="pb-4 pt-8 px-8 border-b border-slate-50 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                    <History size={16} className="text-emerald-600" />
                    Resueltas Recientemente
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {resueltas.length > 0 ? (
                      resueltas.slice(0, 10).map((a: any) => (
                        <div key={a.id} className="p-6 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                             <CheckCircle2 size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-slate-700 font-bold truncate leading-tight mb-1">{a.mensaje}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              {a.tipo} · {new Date(a.generada_en).toLocaleDateString('es-PE')}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center text-slate-400">
                        <p className="text-xs font-medium">No hay historial disponible</p>
                      </div>
                    )}
                  </div>
                  <div className="p-6 border-t border-slate-50">
                    <Button 
                      variant="ghost" 
                      className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 flex items-center gap-2"
                    >
                      Ver Todo el Historial <ChevronRight size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Umbrales Info */}
              <Card className="bg-slate-900 rounded-[2rem] text-white overflow-hidden shadow-xl shadow-slate-200">
                <CardHeader className="pb-4 pt-8 px-8 border-b border-white/10">
                  <CardTitle className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-3">
                    <Settings2 size={16} />
                    Umbrales de Alerta
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-4">
                    {[
                      { sensor: 'Humedad Suelo', condicion: '< 30% VWC', severidad: 'CRÍTICA', color: 'bg-red-500' },
                      { sensor: 'Temperatura', condicion: '> 35°C', severidad: 'ALTA', color: 'bg-orange-500' },
                      { sensor: 'Precipitación', condicion: '> 50mm/1h', severidad: 'MEDIA', color: 'bg-amber-500' },
                    ].map((u, i) => (
                      <div key={i} className="flex items-center justify-between gap-4 group">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-1.5 h-1.5 rounded-full", u.color)} />
                          <div>
                            <p className="text-xs font-bold text-white">{u.sensor}</p>
                            <p className="text-[10px] text-white/40 font-bold">{u.condicion}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-white/60 bg-white/10 px-2 py-0.5 rounded-md uppercase">
                          {u.severidad}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-6 border-t border-white/10">
                     <p className="text-[10px] text-white/40 font-medium leading-relaxed italic">
                       * Los umbrales son ajustados automáticamente por la IA basándose en el ciclo fenológico actual del cultivo.
                     </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
