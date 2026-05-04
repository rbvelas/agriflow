'use client';

import { useEffect, useState } from 'react';
import { getUsuario, logout, ROL_LABELS, type UsuarioSesion } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Shield, 
  LogOut, 
  CheckCircle2, 
  Mail, 
  ShieldCheck, 
  Activity,
  ChevronRight,
  Info,
  UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PERMISOS: Record<string, string[]> = {
  administrador: [
    'Todos los permisos del sistema',
    'Crear y eliminar usuarios',
    'Configurar sensores y dispositivos',
    'Generar todos los tipos de reportes',
    'Gestionar fincas de todos los usuarios',
    'Acceder a configuración avanzada',
  ],
  agricultor: [
    'Crear y editar fincas propias',
    'Gestionar lotes y temporadas de cultivo',
    'Ver predicciones de rendimiento ML',
    'Calcular recomendaciones de riego FAO-56',
    'Generar reportes operacionales y de gestión',
    'Registrar y ver eventos de riego',
  ],
  tecnico: [
    'Ver datos de sensores en tiempo real',
    'Registrar lecturas manuales de campo',
    'Registrar riegos aplicados',
    'Ver y resolver alertas activas',
    'Generar reportes operacionales',
  ],
};

export default function PerfilPage() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  useEffect(() => { setUsuario(getUsuario()); }, []);

  if (!usuario) {
    return (
      <div className="p-8 space-y-8 animate-fade-in max-w-[1200px] mx-auto">
        <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
          <CardContent className="py-24 flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
              <User size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">No hay sesión activa</h2>
              <p className="text-slate-500 max-w-sm">
                Por favor, inicie sesión para acceder a su perfil y configuraciones.
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = '/login'}
              className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl px-8 py-6 font-bold"
            >
              Iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rolKey   = usuario.roles?.[0] ?? 'tecnico';
  const rolInfo  = ROL_LABELS[rolKey] ?? ROL_LABELS['tecnico'];
  const permisos = PERMISOS[rolKey]   ?? PERMISOS['tecnico'];

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-widest">
            <User size={14} />
            <span>Perfil de Usuario</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Mi Cuenta
          </h1>
          <p className="text-slate-500 font-medium">
            Gestione su información personal y revise sus niveles de acceso al sistema.
          </p>
        </div>
        <Button 
          onClick={logout}
          variant="outline"
          className="border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 px-6 py-6 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95"
        >
          <LogOut size={18} /> Cerrar Sesión
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Información Principal */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-4 pt-8 px-10 border-b border-slate-50">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <UserCircle size={20} />
                </div>
                Información de Identidad
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="w-24 h-24 rounded-[2rem] bg-emerald-600 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-emerald-100 shrink-0">
                  {usuario.nombre.charAt(0)}
                </div>
                <div className="flex-1 space-y-6 text-center md:text-left">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{usuario.nombre}</h2>
                    <p className="text-slate-500 font-bold flex items-center justify-center md:justify-start gap-2">
                      <Mail size={16} className="text-emerald-500" /> {usuario.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    {usuario.roles.map((rol) => {
                      const info = ROL_LABELS[rol] || ROL_LABELS['tecnico'];
                      return (
                        <span key={rol}
                          className={cn(
                            "inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest",
                            rol === 'administrador' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-600 border-slate-100"
                          )}>
                          <Shield size={12} className="mr-2" />
                          {info.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Roles */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-4 pt-8 px-10 border-b border-slate-50">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <ShieldCheck size={20} />
                </div>
                Estructura de Roles del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</th>
                      <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</th>
                      <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Capacidades</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {Object.entries(ROL_LABELS).map(([key, info]) => {
                      const esUsuario = usuario.roles.includes(key);
                      return (
                        <tr key={key} className={cn("group transition-colors", esUsuario ? "bg-emerald-50/30" : "hover:bg-slate-50/50")}>
                          <td className="px-10 py-6">
                            <div className="flex flex-col gap-2">
                              <span className={cn(
                                "inline-flex w-fit items-center px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest",
                                esUsuario ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                              )}>
                                {info.label}
                              </span>
                              {esUsuario && (
                                <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 size={10} /> ASIGNADO
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-xs">{info.descripcion}</p>
                          </td>
                          <td className="px-10 py-6">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                              {key === 'administrador' && 'Gobernanza Total'}
                              {key === 'agricultor'    && 'Operaciones & ML'}
                              {key === 'tecnico'       && 'Telemetría & Soporte'}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permisos Laterales */}
        <div className="space-y-8">
          <Card className="bg-slate-900 rounded-[2rem] text-white overflow-hidden shadow-xl shadow-slate-200 border-none">
            <CardHeader className="pb-4 pt-10 px-8 border-b border-white/10">
              <CardTitle className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <Activity size={16} />
                Capacidades Activas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">
                Nivel: {rolInfo.label}
              </p>
              <div className="space-y-4">
                {permisos.map((permiso, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-150 transition-transform shrink-0" />
                    <p className="text-xs text-emerald-50/80 font-medium leading-relaxed">
                      {permiso}
                    </p>
                  </div>
                ))}
              </div>
              <div className="pt-6 border-t border-white/10">
                 <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <Info size={16} className="text-emerald-400 shrink-0" />
                    <p className="text-[9px] text-white/40 font-medium leading-relaxed italic">
                      Sus permisos son asignados por el administrador central de la organización.
                    </p>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden p-8 space-y-4">
             <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <ShieldCheck size={24} />
             </div>
             <h3 className="font-bold text-lg text-slate-900 leading-tight">Seguridad de Cuenta</h3>
             <p className="text-slate-500 text-xs font-medium leading-relaxed">
               Su cuenta está protegida por encriptación de grado bancario. No comparta sus credenciales con terceros.
             </p>
             <Button variant="ghost" className="p-0 h-auto text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 flex items-center gap-2">
               Cambiar Contraseña <ChevronRight size={14} />
             </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
