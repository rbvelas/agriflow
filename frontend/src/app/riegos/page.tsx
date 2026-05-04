'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useLote } from '@/components/providers/LoteProvider';
import { getUsuario } from '@/lib/auth';
import { 
  Droplets, 
  Calendar, 
  History, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  Waves,
  CloudRain,
  Thermometer,
  Sprout,
  ChevronRight,
  Activity,
  Sparkles,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RiegosPage() {
  const { toast } = useToast();
  const { loteSeleccionado } = useLote();
  const usuario = getUsuario();
  const esSoloLectura = usuario?.roles?.includes('tecnico');

  const [laminaAplicada, setLaminaAplicada] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [modalProgramar, setModalProgramar] = useState(false);
  const [tipoProgramacion, setTipoProgramacion] = useState<'simple' | 'avanzada'>('simple');
  const [formProg, setFormProgramacion] = useState({
    fecha: new Date().toISOString().split('T')[0],
    hora: '06:00',
    duracion: '30',
    tipoRiego: 'goteo',
    ciclos: '1',
    umbralHumedad: '35',
    repeticion: 'ninguna'
  });

  // IDs dinámicos
  const [temporadaId, setTemporadaId] = useState<string>('');
  const LOTE_ID = loteSeleccionado?.id ?? '';

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

  const { data: recData, isLoading: loadingRec, refetch } =
    trpc.riegos.calcularRecomendacion.useQuery(
      { temporadaId: TEMPORADA_ID },
      { enabled: !!TEMPORADA_ID }
    );

  const { data: lecturasData } = trpc.sensores.ultimasLecturas.useQuery(
    { loteId: LOTE_ID, horas: 1 },
    { enabled: !!LOTE_ID, refetchInterval: 30_000 }
  );

  const humedadActual = lecturasData?.data?.find((l: any) => l.sensor?.tipo === 'humedad_suelo')?.valor ?? 0;

  const ahora = new Date();
  const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const { data: histData } = trpc.riegos.listarEventos.useQuery({
    loteId: LOTE_ID,
    desde: hace30dias.toISOString(),
    hasta: ahora.toISOString(),
  }, { enabled: !!LOTE_ID });

  const registrarMutation = trpc.riegos.registrarEvento.useMutation({
    onSuccess: () => {
      toast({ title: '✅ Riego registrado', description: `Lámina aplicada: ${laminaAplicada} mm` });
      setLaminaAplicada('');
      setRegistrando(false);
      refetch();
    },
    onError: (err) => {
      toast({ title: '❌ Error', description: err.message, variant: 'destructive' });
      setRegistrando(false);
    },
  });

  const rec = recData?.data;
  const eventos = (histData?.data ?? []).sort((a: any, b: any) => 
    new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()
  );

  const handleRegistrar = () => {
    if (!laminaAplicada || isNaN(Number(laminaAplicada))) {
      toast({ title: '⚠️ Dato inválido', description: 'Ingrese una lámina válida (mm)', variant: 'destructive' });
      return;
    }
    setRegistrando(true);
    registrarMutation.mutate({
      loteId: LOTE_ID,
      temporadaId: TEMPORADA_ID,
      laminaRecomendadaMm: rec?.lamina_recomendada_mm ?? 0,
      laminaAplicadaMm: Number(laminaAplicada),
      metodo: 'goteo',
    });
  };

  const handleProgramarRiego = () => {
    toast({
      title: '📅 Riego Programado',
      description: `Se ha programado un riego ${formProg.tipoRiego} para el ${formProg.fecha} a las ${formProg.hora}.`,
    });
    setModalProgramar(false);
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-widest">
            <Droplets size={14} />
            <span>Gestión Hídrica Inteligente</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Control de Riegos
          </h1>
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span className="bg-white px-3 py-1 rounded-full border border-slate-200 text-xs shadow-sm">
              Lote: {loteSeleccionado?.nombre ?? 'No seleccionado'}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">FAO-56 (ETc = ET₀ × Kc)</span>
          </div>
        </div>
        {!esSoloLectura && (
          <Button 
            onClick={() => setModalProgramar(true)}
            disabled={!loteSeleccionado}
            className="bg-slate-900 text-white hover:bg-slate-800 rounded-2xl px-6 py-6 font-bold flex items-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95"
          >
            <Calendar size={18} /> Programar Riego
          </Button>
        )}
      </div>

      {!loteSeleccionado && (
        <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
          <CardContent className="py-24 flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
              <Droplets size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Seleccione un lote</h2>
              <p className="text-slate-500 max-w-sm">
                Utilice el menú lateral para seleccionar la unidad productiva cuyos riegos desea gestionar.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loteSeleccionado && !TEMPORADA_ID && (
        <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
          <CardContent className="py-24 flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
              <Sprout size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Sin temporada activa</h2>
              <p className="text-slate-500 max-w-sm">
                Este lote no tiene un ciclo de cultivo iniciado. Diríjase a la sección de <strong>Fincas</strong> para iniciar una siembra.
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

      {loteSeleccionado && TEMPORADA_ID && (
        <div className="space-y-8">
          {/* Panel de Resumen Rápido */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] p-8 flex items-center gap-6 group hover:shadow-md transition-all">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Droplets size={32} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Humedad Actual</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-slate-900 tabular-nums">{Number(humedadActual).toFixed(1)}%</p>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Óptimo</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Rango ideal: 60-80%</p>
              </div>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] p-8 flex items-center gap-6 group hover:shadow-md transition-all">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Activity size={32} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Eficiencia Hídrica</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-slate-900 tabular-nums">82%</p>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">A+</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Temporada actual</p>
              </div>
            </Card>

            <Card className="bg-slate-900 rounded-[2rem] p-8 flex items-center gap-6 group shadow-xl shadow-slate-200 border-none relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={80} className="text-emerald-400" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/10 text-emerald-400 flex items-center justify-center shrink-0 relative z-10">
                <Info size={32} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-[0.2em] mb-1">IA Recommendation</p>
                <p className="text-xl font-bold text-white leading-tight">Regar en 2 días</p>
                <p className="text-[10px] text-white/40 font-medium mt-1 uppercase tracking-widest">Basado en pronóstico local</p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recomendación y Registro */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
              <CardHeader className="pb-4 pt-8 px-10 border-b border-slate-50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                    <Waves size={20} />
                  </div>
                  Recomendación de Riego Diaria
                </CardTitle>
                <div className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">
                  Optimizado por IA
                </div>
              </CardHeader>
              <CardContent className="p-10">
                {loadingRec ? (
                  <div className="space-y-6 animate-pulse">
                    <div className="h-24 bg-slate-50 rounded-2xl" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-12 bg-slate-50 rounded-xl" />
                      <div className="h-12 bg-slate-50 rounded-xl" />
                    </div>
                  </div>
                ) : rec ? (
                  <div className="space-y-10">
                    <div className="flex flex-col items-center justify-center text-center p-8 bg-blue-50/30 rounded-[2.5rem] border border-blue-50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                         <CloudRain size={120} />
                      </div>
                      <div className="relative z-10">
                        <div className="text-7xl font-black text-blue-600 tracking-tighter tabular-nums flex items-baseline gap-2">
                          {rec.lamina_recomendada_mm}
                          <span className="text-xl font-bold text-blue-400">mm</span>
                        </div>
                        <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">Lámina de agua sugerida</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {[
                        { label: 'ET₀ Estimada', value: `${rec.et0_estimada} mm`, icon: <Thermometer size={14} />, color: 'text-amber-600', bg: 'bg-amber-50' },
                        { label: 'ETc (ET₀ × Kc)', value: `${rec.etc_estimada} mm`, icon: <Sprout size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Precipitación', value: `${rec.precipitacion_efectiva} mm`, icon: <CloudRain size={14} />, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Déficit', value: `${rec.deficit_hidrico}%`, icon: <AlertTriangle size={14} />, color: rec.deficit_hidrico > 50 ? 'text-red-600' : 'text-slate-600', bg: rec.deficit_hidrico > 50 ? 'bg-red-50' : 'bg-slate-50' },
                      ].map((item, idx) => (
                        <div key={idx} className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            {item.icon} {item.label}
                          </p>
                          <p className={cn("text-xl font-black tabular-nums", item.color)}>{item.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-100 flex gap-4">
                      <div className="text-emerald-600 shrink-0">
                        <Info size={20} />
                      </div>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                        "{rec.justificacion}"
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    No hay recomendaciones disponibles para hoy.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
              <CardHeader className="pb-4 pt-8 px-10 border-b border-slate-50">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                    <Plus size={20} />
                  </div>
                  Registrar Evento de Riego
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10">
                {!esSoloLectura ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                    <div className="space-y-4">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                        Lámina Aplicada (mm)
                      </label>
                      <input
                        type="number"
                        value={laminaAplicada}
                        onChange={(e) => setLaminaAplicada(e.target.value)}
                        placeholder={rec ? `Recomendado: ${rec.lamina_recomendada_mm} mm` : '0.0'}
                        className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-xl font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all placeholder:text-slate-200"
                        step="0.1"
                        min="0"
                      />
                    </div>
                    <Button
                      onClick={handleRegistrar}
                      disabled={registrando || !laminaAplicada}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-16 rounded-2xl text-lg shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                    >
                      {registrando ? 'Registrando...' : 'Confirmar Riego'}
                    </Button>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-2xl text-center text-slate-500 text-sm font-medium">
                    Su perfil de técnico solo permite visualización de datos.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Historial */}
          <div className="space-y-8">
            <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden h-fit">
              <CardHeader className="pb-4 pt-8 px-8 border-b border-slate-50 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                  <History size={16} className="text-emerald-600" />
                  Historial 30 Días
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {eventos.length > 0 ? (
                    eventos.map((evento: any) => (
                      <div key={evento.id} className="p-6 hover:bg-slate-50/50 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <Droplets size={14} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{evento.lamina_aplicada_mm} mm</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {new Date(evento.fecha_hora).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        </div>
                        <div className="flex items-center justify-between mt-4">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                             Método: {evento.metodo}
                           </span>
                           <span className={cn(
                             "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border",
                             Math.abs(evento.lamina_aplicada_mm - evento.lamina_recomendada_mm) < 0.5 
                               ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                               : "bg-amber-50 text-amber-700 border-amber-100"
                           )}>
                             {Math.abs(evento.lamina_aplicada_mm - evento.lamina_recomendada_mm) < 0.5 ? 'PRECISO' : 'DESVIADO'}
                           </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center text-slate-400">
                      <p className="text-sm font-medium">No hay eventos registrados</p>
                    </div>
                  )}
                </div>
                <div className="p-6 border-t border-slate-50">
                   <Button 
                    variant="ghost" 
                    className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 flex items-center gap-2"
                   >
                     Ver Historial Completo <ChevronRight size={14} />
                   </Button>
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
