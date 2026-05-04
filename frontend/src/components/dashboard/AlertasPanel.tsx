'use client';

import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Droplets,
  Thermometer,
  Bug,
  LineChart,
  Settings
} from 'lucide-react';

type SeveridadAlerta = 'baja' | 'media' | 'alta' | 'critica';

interface Alerta {
  id: string;
  tipo: string;
  severidad: SeveridadAlerta;
  mensaje: string;
  generada_en: string;
  resuelta: boolean;
}

interface Props {
  alertas: Alerta[];
}

const colorBySeveridad: Record<SeveridadAlerta, { border: string; bg: string; text: string; icon: any }> = {
  baja:    { border: 'border-l-blue-600',   bg: 'bg-blue-50',   text: 'text-blue-800',   icon: Info },
  media:   { border: 'border-l-amber-600',  bg: 'bg-amber-50',  text: 'text-amber-800',  icon: AlertTriangle },
  alta:    { border: 'border-l-orange-600', bg: 'bg-orange-50', text: 'text-orange-800', icon: AlertCircle },
  critica: { border: 'border-l-red-600',    bg: 'bg-red-50',    text: 'text-red-800',    icon: ShieldAlert },
};

const getAccionRecomendada = (tipo: string, severidad: string) => {
  const t = tipo.toLowerCase();
  if (t.includes('clima') || t.includes('temperatura') || t.includes('helada')) {
    if (severidad === 'critica') return { text: 'Protocolo de protección: activar riego por aspersión o mantas térmicas inmediatamente.', icon: Thermometer };
    return { text: 'Monitorear proyecciones climáticas para las próximas 6 horas.', icon: Clock };
  }
  if (t.includes('humedad') || t.includes('sequia') || t.includes('riego')) {
    if (severidad === 'critica') return { text: 'Nivel hídrico crítico: activar sistema de riego de emergencia.', icon: Droplets };
    return { text: 'Revisar programación de riego según recomendación FAO-56.', icon: Droplets };
  }
  if (t.includes('plaga') || t.includes('insecto')) {
    return { text: 'Realizar inspección visual técnica y preparar rutina de aplicación.', icon: Bug };
  }
  if (t.includes('rendimiento') || t.includes('productividad')) {
    return { text: 'Revisar niveles de nitrógeno y salud foliar del cultivo.', icon: LineChart };
  }
  if (t.includes('sistema') || t.includes('offline') || t.includes('sensor')) {
    return { text: 'Verificar alimentación del sensor y conectividad del gateway.', icon: Settings };
  }
  return { text: 'Realizar inspección técnica de campo en el sector afectado.', icon: ArrowRight };
};

/** Panel de alertas activas con opción de resolver */
export function AlertasPanel({ alertas }: Props) {
  const utils = trpc.useUtils();

  const resolverMutation = trpc.sensores.resolverAlerta.useMutation({
    onSuccess: () => {
      utils.sensores.listarAlertas.invalidate();
    },
  });

  if (alertas.length === 0) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-sm font-bold text-slate-900">Sistema Operativo</p>
          <p className="text-xs text-slate-500 mt-1">Sin alertas activas — todos los sensores operan normalmente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="pb-4 pt-6 px-6 border-b border-slate-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Alertas Activas
          </CardTitle>
          <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[10px] font-bold">
            {alertas.length} EVENTOS
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-50">
          {alertas.map((alerta) => {
            const config = colorBySeveridad[alerta.severidad] ?? colorBySeveridad.media;
            const Icon = config.icon;
            const accion = getAccionRecomendada(alerta.tipo, alerta.severidad);
            const AccionIcon = accion.icon;

            return (
              <div
                key={alerta.id}
                className={cn(
                  "px-6 py-5 flex items-start gap-4 transition-colors hover:bg-slate-50/50",
                  config.border,
                  "border-l-4"
                )}
              >
                <div className={cn("p-2 rounded-xl shrink-0", config.bg, config.text)}>
                  <Icon size={20} />
                </div>
                
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-xs font-bold uppercase tracking-wider", config.text)}>
                      {alerta.tipo} • {alerta.severidad}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400">
                      {new Date(alerta.generada_en).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">
                    {alerta.mensaje}
                  </p>

                  <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg p-2 mt-2">
                    <div className="text-slate-400">
                      <AccionIcon size={14} />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      <span className="text-slate-900 font-bold mr-1">Sugerencia:</span>
                      {accion.text}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => resolverMutation.mutate({ id: alerta.id })}
                  disabled={resolverMutation.isLoading}
                  className="shrink-0 p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                  title="Marcar como resuelta"
                >
                  <CheckCircle2 size={18} />
                </button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
