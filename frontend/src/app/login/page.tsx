'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

import { 
  Leaf, 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck,
  User,
  Activity,
  ChevronRight,
  Info
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('admin@agriflow.pe');
  const [password, setPassword] = useState('agriflow2024');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.login(email, password);
      const { access_token, usuario } = res.data;
      localStorage.setItem('agriflow_token',   access_token);
      localStorage.setItem('agriflow_usuario', JSON.stringify(usuario));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message ?? 'Credenciales inválidas.');
      setLoading(false);
    }
  };

  const usarCuenta = (e: string) => {
    setEmail(e);
    setPassword('agriflow2024');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Lado izquierdo - Visual/Marketing */}
      <div className="hidden lg:flex lg:w-1/2 bg-emerald-600 p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500 rounded-full -mr-64 -mt-64 blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-700 rounded-full -ml-32 -mb-32 blur-3xl opacity-50" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-xl">
            <Leaf size={28} />
          </div>
          <span className="text-white text-3xl font-black tracking-tighter">AgriFlow</span>
        </div>

        <div className="relative z-10 space-y-8">
          <h2 className="text-6xl font-black text-white leading-tight">
            La inteligencia <br />
            <span className="text-emerald-200">detrás de cada</span> <br />
            cosecha.
          </h2>
          <p className="text-emerald-100 text-lg max-w-md font-medium leading-relaxed">
            Plataforma integral de agricultura de precisión con monitoreo satelital, sensores IoT y modelos predictivos de última generación.
          </p>
          
          <div className="grid grid-cols-2 gap-6 pt-8">
            <div className="bg-emerald-700/30 backdrop-blur-md border border-emerald-500/20 rounded-3xl p-6">
              <Activity className="text-emerald-300 mb-3" size={24} />
              <p className="text-white font-bold text-xl">+40%</p>
              <p className="text-emerald-200 text-xs uppercase tracking-widest font-bold">Productividad</p>
            </div>
            <div className="bg-emerald-700/30 backdrop-blur-md border border-emerald-500/20 rounded-3xl p-6">
              <ShieldCheck className="text-emerald-300 mb-3" size={24} />
              <p className="text-white font-bold text-xl">100%</p>
              <p className="text-emerald-200 text-xs uppercase tracking-widest font-bold">Control de Riesgos</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-emerald-200 text-sm font-bold">
           <p>© 2026 AgriFlow Precision Systems</p>
           <div className="w-1 h-1 bg-emerald-400 rounded-full" />
           <p>v2.4.0-Enterprise</p>
        </div>
      </div>

      {/* Lado derecho - Formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white lg:rounded-l-[3rem] shadow-2xl relative z-20">
        <div className="w-full max-w-md space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Bienvenido</h1>
            <p className="text-slate-500 font-medium">Ingrese sus credenciales para acceder al panel de control.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-12 py-4
                             text-slate-900 text-sm font-bold placeholder-slate-400
                             focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50
                             transition-all"
                  placeholder="usuario@agriflow.pe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Contraseña
                </label>
                <a href="#" className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700">
                  ¿Olvidó su clave?
                </a>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-12 py-4
                             text-slate-900 text-sm font-bold placeholder-slate-400
                             focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50
                             transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4
                              flex items-center gap-3 text-red-600 text-sm font-bold animate-shake">
                <ShieldCheck size={18} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50
                         text-white font-bold py-5 rounded-2xl shadow-xl shadow-slate-200 
                         transition-all active:scale-95 flex items-center justify-center gap-2 group"
            >
              {loading ? 'Sincronizando...' : 'Iniciar Sesión'}
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          {/* Cuentas demo */}
          <div className="space-y-6 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 text-slate-400">
               <div className="h-px flex-1 bg-slate-100" />
               <span className="text-[10px] font-black uppercase tracking-widest">Cuentas de Acceso Rápido</span>
               <div className="h-px flex-1 bg-slate-100" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { nombre: 'Admin',  email: 'admin@agriflow.pe',  icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50' },
                { nombre: 'Agricultor', email: 'carlos@agriflow.pe', icon: Leaf, color: 'text-blue-600 bg-blue-50'  },
                { nombre: 'Técnico',   email: 'maria@agriflow.pe',  icon: Activity, color: 'text-purple-600 bg-purple-50' },
              ].map((u) => (
                <button
                  key={u.email}
                  onClick={() => usarCuenta(u.email)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl
                             bg-white border border-slate-100 hover:border-emerald-500/50 
                             hover:shadow-lg hover:shadow-emerald-50 transition-all group"
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", u.color)}>
                    <u.icon size={20} />
                  </div>
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{u.nombre}</p>
                </button>
              ))}
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
               <Info size={16} className="text-blue-600 shrink-0" />
               <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
                 Esta es una versión de demostración operativa. Todos los datos de sensores son simulados por el motor AgriGen v2.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}