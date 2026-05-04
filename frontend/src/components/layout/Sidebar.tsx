'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { getUsuario, logout, ROL_LABELS, type UsuarioSesion } from '@/lib/auth';
import { useLote } from '@/components/providers/LoteProvider';

import { 
  LayoutDashboard, 
  Sprout, 
  Brain, 
  Droplets, 
  Radio, 
  FileText, 
  AlertTriangle, 
  Users,
  LogOut,
  Settings,
  ChevronDown,
  MapPin,
  Leaf
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, desc: 'Vista general',    roles: ['administrador', 'agricultor', 'tecnico'] },
  { href: '/fincas',       label: 'Fincas',       icon: Sprout,          desc: 'Gestión de lotes', roles: ['administrador', 'agricultor'] },
  { href: '/predicciones', label: 'Predicciones', icon: Brain,           desc: 'Ensemble ML',      roles: ['administrador', 'agricultor'] },
  { href: '/riegos',       label: 'Riego',        icon: Droplets,        desc: 'FAO-56',           roles: ['administrador', 'agricultor', 'tecnico'] },
  { href: '/sensores',     label: 'Sensores',     icon: Radio,           desc: 'Lecturas en vivo', roles: ['administrador', 'agricultor', 'tecnico'] },
  { href: '/reportes',     label: 'Reportes',     icon: FileText,        desc: 'PDF',              roles: ['administrador', 'tecnico'] },
  { href: '/alertas',      label: 'Alertas',      icon: AlertTriangle,   desc: 'Umbrales',        roles: ['administrador', 'agricultor', 'tecnico'] },
  { href: '/usuarios',     label: 'Usuarios',     icon: Users,           desc: 'Gestión',          roles: ['administrador'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const { loteSeleccionado, setLoteSeleccionado, lotesDisponibles } = useLote();

  useEffect(() => {
    setUsuario(getUsuario());
  }, []);

  const rolKey = usuario?.roles?.[0] ?? '';
  const rolInfo = rolKey ? ROL_LABELS[rolKey] : null;

  const filteredNavItems = navItems.filter(item => 
    !item.roles || item.roles.includes(rolKey)
  );

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 shadow-xl z-20">
      {/* Logo */}
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
            <Leaf size={22} strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-none tracking-tight">AgriFlow</p>
            <p className="text-[10px] uppercase font-bold text-emerald-400 mt-1 tracking-widest">Precision Ag</p>
          </div>
        </div>
      </div>

      {/* Lote activo Selector */}
      <div className="px-4 mb-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={12} className="text-slate-400" />
            <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">Lote Seleccionado</p>
          </div>
          
          {lotesDisponibles.length > 0 ? (
            <div className="relative">
              <select
                value={loteSeleccionado?.id ?? ''}
                onChange={(e) => {
                  const lote = lotesDisponibles.find(l => l.id === e.target.value);
                  if (lote) setLoteSeleccionado(lote);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 
                           text-xs text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40
                           appearance-none cursor-pointer hover:border-emerald-500/50 transition-all shadow-sm"
              >
                {lotesDisponibles.map((lote) => (
                  <option key={lote.id} value={lote.id} className="bg-slate-800">
                    {lote.nombre}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={14} />
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic px-1">No hay lotes disponibles</p>
          )}
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto pb-6">
        {filteredNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all group',
                isActive
                  ? 'bg-emerald-700/20 text-emerald-400 font-semibold border border-emerald-500/20 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60',
              )}
            >
              <Icon size={18} className={cn(
                'transition-colors',
                isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
              )} />
              <div className="min-w-0">
                <p className="leading-none">{item.label}</p>
                <p className={cn(
                  "text-[10px] mt-1 truncate font-medium",
                  isActive ? "text-emerald-400/80" : "text-slate-500"
                )}>{item.desc}</p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Usuario */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 px-2 py-2 mb-3">
          <div className="w-9 h-9 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-300 shadow-sm font-bold text-xs uppercase">
            {usuario?.nombre?.substring(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{usuario?.nombre}</p>
            <div className={cn(
              "text-[10px] px-2 py-0.5 rounded-full inline-block font-bold mt-0.5 uppercase tracking-tighter border",
              rolInfo?.color?.replace('text-', 'text-').replace('bg-', 'bg-opacity-20 bg-').replace('border-', 'border-opacity-30 border-') ?? 'text-slate-400 bg-slate-800 border-slate-700'
            )}>
              {rolInfo?.label}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/perfil"
            className="flex items-center justify-center gap-2 p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all border border-transparent hover:border-slate-700 text-xs font-medium"
          >
            <Settings size={14} />
            Perfil
          </Link>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-900/20 text-xs font-medium"
          >
            <LogOut size={14} />
            Salir
          </button>
        </div>
      </div>
    </aside>
  );
}