import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combina clases de Tailwind eliminando conflictos con tailwind-merge */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea número como moneda o con separador de miles en español */
export function formatNumber(
  value: number,
  decimals = 0,
  locale = 'es-PE',
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Formatea fecha en español */
export function formatFecha(
  date: Date | string,
  formato: 'corto' | 'largo' | 'hora' = 'corto',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const opciones: Intl.DateTimeFormatOptions =
    formato === 'hora'
      ? { hour: '2-digit', minute: '2-digit' }
      : formato === 'largo'
      ? { day: '2-digit', month: 'long', year: 'numeric' }
      : { day: '2-digit', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('es-PE', opciones);
}
