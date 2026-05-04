export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  roles: string[];
}

export function getUsuario(): UsuarioSesion | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem('agriflow_usuario');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('agriflow_token');
}

export function logout() {
  localStorage.removeItem('agriflow_token');
  localStorage.removeItem('agriflow_usuario');
  window.location.href = '/login';
}

export function tieneRol(usuario: UsuarioSesion | null, rol: string): boolean {
  return usuario?.roles?.includes(rol) ?? false;
}

export const ROL_LABELS: Record<string, { label: string; color: string; descripcion: string }> = {
  administrador: {
    label: 'Administrador',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    descripcion: 'Gestión completa del sistema, configuración de usuarios',
  },
  agricultor: {
    label: 'Agricultor',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    descripcion: 'Crear/editar fincas, lotes, ver predicciones',
  },
  tecnico: {
    label: 'Técnico',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    descripcion: 'Ver datos, generar reportes, gestionar alertas',
  },
};