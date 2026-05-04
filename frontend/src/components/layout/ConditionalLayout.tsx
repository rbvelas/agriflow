'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { getUsuario, getToken } from '@/lib/auth';

/** 
 * Maneja la visibilidad del layout y la protección de rutas.
 * Si no hay token/usuario, redirige a /login.
 */
export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  const esPublica = pathname === '/login';

  useEffect(() => {
    const token = getToken();
    const usuario = getUsuario();

    if (!token || !usuario) {
      if (!esPublica) {
        router.push('/login');
      }
      setAutenticado(false);
    } else {
      if (esPublica) {
        router.push('/dashboard');
      }
      setAutenticado(true);
    }
  }, [pathname, router, esPublica]);

  // Mientras se verifica el estado de autenticación, no mostramos nada para evitar parpadeos
  if (autenticado === null) return null;

  // En la página de login, mostramos solo el contenido
  if (esPublica) {
    return <>{children}</>;
  }

  // Si no está autenticado y no es pública, ya se está redirigiendo, no mostramos nada
  if (!autenticado) return null;

  // Layout normal con Sidebar para usuarios autenticados
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
