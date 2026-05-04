'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  titulo: string;
  valor: string;
  subtitulo?: string;
  icono: LucideIcon;
  tendencia?: 'up' | 'down' | 'neutral';
  cargando?: boolean;
  testId?: string;
  colorVariant?: 'emerald' | 'blue' | 'amber' | 'indigo' | 'slate';
}

const colorVariants = {
  emerald: { 
    bg: 'bg-emerald-50', 
    text: 'text-emerald-800', 
    iconBg: 'bg-emerald-100', 
    iconText: 'text-emerald-700',
    trendUp: 'text-emerald-700',
    trendDown: 'text-red-700'
  },
  blue: { 
    bg: 'bg-blue-50', 
    text: 'text-blue-800', 
    iconBg: 'bg-blue-100', 
    iconText: 'text-blue-700',
    trendUp: 'text-blue-700',
    trendDown: 'text-red-700'
  },
  amber: { 
    bg: 'bg-amber-50', 
    text: 'text-amber-800', 
    iconBg: 'bg-amber-100', 
    iconText: 'text-amber-700',
    trendUp: 'text-emerald-700',
    trendDown: 'text-red-700'
  },
  indigo: { 
    bg: 'bg-indigo-50', 
    text: 'text-indigo-800', 
    iconBg: 'bg-indigo-100', 
    iconText: 'text-indigo-700',
    trendUp: 'text-indigo-700',
    trendDown: 'text-red-700'
  },
  slate: { 
    bg: 'bg-slate-50', 
    text: 'text-slate-800', 
    iconBg: 'bg-slate-100', 
    iconText: 'text-slate-700',
    trendUp: 'text-slate-700',
    trendDown: 'text-red-700'
  },
};

export function MetricCard({
  titulo,
  valor,
  subtitulo,
  icono: Icon,
  tendencia = 'neutral',
  cargando = false,
  testId,
  colorVariant = 'slate',
}: Props) {
  const variant = colorVariants[colorVariant];

  return (
    <Card
      className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden"
      data-testid={testId}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-xl", variant.iconBg, variant.iconText)}>
                <Icon size={18} strokeWidth={2.5} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {titulo}
              </p>
            </div>
            
            <div className="flex items-baseline gap-2">
              {cargando ? (
                <div className="h-8 w-32 bg-slate-100 rounded-lg animate-pulse" />
              ) : (
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {valor}
                </h3>
              )}
              
              {!cargando && tendencia !== 'neutral' && (
                <div className={cn(
                  "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  tendencia === 'up' ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
                )}>
                  {tendencia === 'up' ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                  {tendencia === 'up' ? 'ALZA' : 'BAJA'}
                </div>
              )}
            </div>

            {subtitulo && (
              <p className="text-xs text-slate-500 font-medium">
                {subtitulo}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
