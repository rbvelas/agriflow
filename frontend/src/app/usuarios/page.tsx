'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ROL_LABELS } from '@/lib/auth';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Mail, 
  KeyRound, 
  UserCircle,
  ChevronRight,
  Info,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UsuariosPage() {
  const { toast } = useToast();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [roles, setRoles] = useState<string[]>(['tecnico']);
  const [cargando, setCargando] = useState(false);

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    try {
      const token = localStorage.getItem('agriflow_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/auth/registrar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre,
          email,
          contrasena,
          roles
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Error al crear usuario');

      toast({
        title: '✅ Usuario creado',
        description: `El usuario ${nombre} ha sido registrado con éxito.`,
      });

      setNombre('');
      setEmail('');
      setContrasena('');
      setRoles(['tecnico']);
    } catch (err: any) {
      toast({
        title: '❌ Error',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-widest">
            <Users size={14} />
            <span>Administración de Accesos</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Gestión de Usuarios
          </h1>
          <p className="text-slate-500 font-medium">
            Cree nuevas cuentas y asigne roles según las responsabilidades del personal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="lg:col-span-2">
          <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-4 pt-8 px-10 border-b border-slate-50">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <UserPlus size={20} />
                </div>
                Registrar Nuevo Colaborador
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10">
              <form onSubmit={handleCrearUsuario} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <UserCircle size={12} /> Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                      placeholder="Ej. Juan Pérez"
                      className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Mail size={12} /> Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="juan@agriflow.pe"
                      className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <KeyRound size={12} /> Contraseña Inicial
                    </label>
                    <input
                      type="password"
                      value={contrasena}
                      onChange={(e) => setContrasena(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={12} /> Rol de Sistema
                    </label>
                    <select
                      value={roles[0]}
                      onChange={(e) => setRoles([e.target.value])}
                      className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
                    >
                      {Object.entries(ROL_LABELS).map(([key, info]) => (
                        <option key={key} value={key} className="font-bold">
                          {info.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={cargando}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-16 rounded-2xl text-lg shadow-xl shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {cargando ? 'Registrando...' : 'Crear Cuenta de Usuario'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Info Lateral */}
        <div className="space-y-8">
          <Card className="bg-white border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-4 pt-8 px-8 border-b border-slate-50">
              <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <ShieldCheck size={16} className="text-emerald-600" />
                Niveles de Acceso
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {Object.entries(ROL_LABELS).map(([key, info]) => (
                <div key={key} className="space-y-3 group">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest",
                      key === 'admin' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-600 border-slate-100"
                    )}>
                      {info.label}
                    </span>
                    <CheckCircle2 size={14} className="text-slate-100 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {info.descripcion}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="p-8 bg-slate-900 rounded-[2rem] text-white space-y-4 shadow-xl shadow-slate-200 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Users size={100} />
             </div>
             <div className="relative z-10 space-y-4">
               <div className="p-3 bg-white/10 rounded-xl w-fit">
                 <Info size={24} className="text-emerald-400" />
               </div>
               <h3 className="font-bold text-lg leading-tight">Seguridad de la Información</h3>
               <p className="text-white/50 text-xs font-medium leading-relaxed">
                 Las contraseñas se almacenan mediante hashing de un solo sentido. El acceso está protegido por tokens JWT con expiración controlada.
               </p>
               <Button 
                variant="ghost" 
                className="p-0 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:text-emerald-300 hover:bg-transparent"
               >
                 Ver políticas de seguridad <ChevronRight size={14} />
               </Button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
