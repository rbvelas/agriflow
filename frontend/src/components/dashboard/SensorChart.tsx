'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

interface DatoGrafico {
  hora: string;
  [key: string]: number | string;
}

interface Props {
  titulo: string;
  datos: DatoGrafico[];
  clave: string;
  color: string;
  unidad: string;
  /** Línea de referencia horizontal (ej. umbral de alerta) */
  umbral?: { valor: number; etiqueta: string };
}

const CustomTooltip = ({
  active,
  payload,
  label,
  unidad,
}: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xl shadow-slate-200/50 text-xs">
      <p className="text-slate-400 font-bold uppercase tracking-widest mb-1.5">{label}</p>
      <p className="text-base font-bold text-slate-900">
        {Number(payload[0]?.value).toFixed(1)} <span className="text-slate-400 text-xs">{unidad}</span>
      </p>
    </div>
  );
};

/**
 * Gráfico de área para series temporales de sensores.
 * Usa Recharts con gradiente para un aspecto moderno.
 */
export function SensorChart({
  titulo,
  datos,
  clave,
  color,
  unidad,
  umbral,
}: Props) {
  const gradientId = `grad-${clave}`;

  return (    <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="pb-2 pt-6 px-6">
        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {datos.length === 0 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-slate-400 space-y-2">
            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center">
               <Info size={20} />
            </div>
            <p className="text-xs font-medium">Sin datos en el período</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={datos}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.01} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="hora"
                tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                dy={10}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip unidad={unidad} />} />
              
              {umbral && (
                <ReferenceLine
                  y={umbral.valor}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{
                    value: umbral.etiqueta,
                    position: 'right',
                    fill: '#ef4444',
                    fontSize: 9,
                    fontWeight: 'bold',
                  }}
                />
              )}

              <Area
                type="monotone"
                dataKey={clave}
                stroke={color}
                strokeWidth={3}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
