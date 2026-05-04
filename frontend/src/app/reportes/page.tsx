'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useLote } from '@/components/providers/LoteProvider';
import { getUsuario } from '@/lib/auth';
import { 
  FileText, 
  Download, 
  BarChart3, 
  Calendar, 
  ClipboardCheck, 
  Building2, 
  TrendingUp,
  Clock,
  ChevronRight,
  ShieldCheck,
  FileDown,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FINCA_ID  = '33333333-0000-0000-0000-000000000001';
const USUARIO_ID = '22222222-0000-0000-0000-000000000001';

type TipoReporte = 'operacional_diario' | 'operacional_semanal' | 'gestion_mensual' | 'ejecutivo';

const tiposReporte: { value: TipoReporte; label: string; icono: React.ReactNode; desc: string; color: string; bg: string }[] = [
  { 
    value: 'operacional_diario',  
    label: 'Operacional Diario',  
    icono: <ClipboardCheck size={20} />, 
    desc: 'Estado de sensores, riegos y alertas del día',
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  },
  { 
    value: 'operacional_semanal', 
    label: 'Operacional Semanal', 
    icono: <BarChart3 size={20} />, 
    desc: 'Resumen semanal de operaciones y métricas',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50'
  },
  { 
    value: 'gestion_mensual',     
    label: 'Gestión Mensual',     
    icono: <TrendingUp size={20} />, 
    desc: 'Comparativa rendimientos, eficiencia hídrica',
    color: 'text-amber-600',
    bg: 'bg-amber-50'
  },
  { 
    value: 'ejecutivo',           
    label: 'Ejecutivo',           
    icono: <Building2 size={20} />, 
    desc: 'Resumen de alto nivel para toma de decisiones',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50'
  },
];

export default function ReportesPage() {
  const { toast } = useToast();
  const { loteSeleccionado } = useLote();
  const usuario = getUsuario();
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoReporte>('operacional_semanal');
  const [alcance, setAlcance] = useState<'finca' | 'lote'>('lote');
  const [generando, setGenerando] = useState(false);

  const { data: fincasData } = trpc.fincas.listar.useQuery(undefined, {
    enabled: !!usuario,
  });

  const fincaActual = fincasData?.data?.find(f => 
    f.lotes?.some(l => l.id === loteSeleccionado?.id)
  );

  const generarMutation = trpc.reportes.generar.useMutation({
    onSuccess: (res) => {
      const reporteId = res.data?.id;
      toast({
        title: '✅ Reporte generado',
        description: `Iniciando descarga del reporte ${reporteId?.substring(0, 8).toUpperCase()}...`,
      });

      if (reporteId) {
        setTimeout(() => {
          const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/reportes/${reporteId}/descargar`;
          window.open(downloadUrl, '_blank');
          setGenerando(false);
        }, 1000);
      } else {
        setGenerando(false);
      }
    },
    onError: (err) => {
      toast({ title: '❌ Error al generar', description: err.message, variant: 'destructive' });
      setGenerando(false);
    },
  });

  const handleGenerar = () => {
    if (alcance === 'lote' && !loteSeleccionado) {
      toast({ title: '⚠️ Selección requerida', description: 'Por favor seleccione un lote en el menú lateral.', variant: 'destructive' });
      return;
    }
    if (alcance === 'finca' && !fincaActual) {
      toast({ title: '⚠️ Selección requerida', description: 'No se pudo determinar la finca del lote seleccionado.', variant: 'destructive' });
      return;
    }

    setGenerando(true);
    const hoy = new Date();
    const periodoInicio = new Date();

    const offsetDias: Record<TipoReporte, number> = {
      operacional_diario:  1,
      operacional_semanal: 7,
      gestion_mensual:     30,
      ejecutivo:           90,
    };
    periodoInicio.setDate(hoy.getDate() - offsetDias[tipoSeleccionado]);

    generarMutation.mutate({
      fincaId: alcance === 'finca' ? fincaActual?.id : undefined,
      loteId: alcance === 'lote' ? loteSeleccionado?.id : undefined,
      tipo: tipoSeleccionado,
      periodoInicio: periodoInicio.toISOString(),
      periodoFin: hoy.toISOString(),
      usuarioId: usuario?.id ?? USUARIO_ID,
    });
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-widest">
            <FileText size={14} />
            <span>Documentación y Auditoría</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Reportes PDF
          </h1>
          <p className="text-slate-500 font-medium">
            Generación automática de reportes operacionales y de gestión estratégica.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Selector de tipo */}
        <div className="lg:col-span-2">
          <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-4 pt-8 px-10 border-b border-slate-50">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <FileDown size={20} />
                </div>
                Configuración del Reporte
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
              {/* Selector de Alcance */}
              <div className="space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Alcance del Reporte</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setAlcance('lote')}
                    className={cn(
                      "flex-1 p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all",
                      alcance === 'lote' 
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold" 
                        : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                    )}
                  >
                    <Layers size={18} /> Por Lote
                  </button>
                  <button
                    onClick={() => setAlcance('finca')}
                    className={cn(
                      "flex-1 p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all",
                      alcance === 'finca' 
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold" 
                        : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                    )}
                  >
                    <Building2 size={18} /> Por Finca
                  </button>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[11px] text-slate-500 font-medium">
                    {alcance === 'lote' 
                      ? `Generando reporte para el lote: ${loteSeleccionado?.nombre ?? 'Ninguno seleccionado'}`
                      : `Generando reporte consolidado de la finca: ${fincaActual?.nombre ?? 'Cargando...'}`
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tiposReporte.map((tipo) => (
                  <button
                    key={tipo.value}
                    onClick={() => setTipoSeleccionado(tipo.value)}
                    className={cn(
                      "p-6 rounded-[1.5rem] border-2 text-left transition-all group relative overflow-hidden",
                      tipoSeleccionado === tipo.value
                        ? "border-emerald-500 bg-emerald-50/30"
                        : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50"
                    )}
                  >
                    <div className="flex items-center gap-4 mb-3 relative z-10">
                      <div className={cn(
                        "p-3 rounded-xl transition-colors shrink-0",
                        tipoSeleccionado === tipo.value ? "bg-emerald-100 text-emerald-700" : cn(tipo.bg, tipo.color)
                      )}>
                        {tipo.icono}
                      </div>
                      <span className={cn(
                        "font-black text-sm uppercase tracking-tight",
                        tipoSeleccionado === tipo.value ? "text-emerald-900" : "text-slate-800"
                      )}>{tipo.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed relative z-10">{tipo.desc}</p>
                    
                    {tipoSeleccionado === tipo.value && (
                      <div className="absolute top-2 right-2">
                        <ShieldCheck size={16} className="text-emerald-500" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleGenerar}
                  disabled={generando}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-16 rounded-2xl text-lg shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {generando ? (
                    <span className="flex items-center gap-2">
                      <Clock size={20} className="animate-spin" /> Generando PDF...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Download size={20} /> Generar {tiposReporte.find(t => t.value === tipoSeleccionado)?.label}
                    </span>
                  )}
                </Button>
                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">
                  El archivo se descargará automáticamente en formato .pdf
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Información Lateral */}
        <div className="space-y-8">
          <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-4 pt-8 px-8 border-b border-slate-50">
              <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <ClipboardCheck size={16} className="text-blue-600" />
                Operacionales
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Incluyen estado de sensores, lecturas del período, anomalías detectadas, eventos de riego y alertas.
              </p>
              <div className="pt-4 border-t border-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Destinatarios:</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-slate-50 text-slate-600 text-[9px] font-bold rounded-md">TÉCNICOS</span>
                  <span className="px-2 py-1 bg-slate-50 text-slate-600 text-[9px] font-bold rounded-md">OPERADORES</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-4 pt-8 px-8 border-b border-slate-50">
              <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <TrendingUp size={16} className="text-amber-600" />
                Gestión
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Evolución de predicciones ML vs real, eficiencia hídrica y tendencias de la temporada completa.
              </p>
              <div className="pt-4 border-t border-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Destinatarios:</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-md">GERENTES</span>
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-md">DUEÑOS</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-8 bg-emerald-900 rounded-[2rem] text-white space-y-4 shadow-xl shadow-emerald-100">
             <ShieldCheck size={32} className="text-emerald-400" />
             <h3 className="font-bold text-lg leading-tight">Reportes Firmados Digitalmente</h3>
             <p className="text-emerald-100/70 text-xs font-medium leading-relaxed">
               Todos los documentos generados cuentan con una firma digital que garantiza la integridad de los datos agronómicos.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
