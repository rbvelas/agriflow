// Siempre usar la URL del backend directamente (sin rewrites)
const BASE = 'https://agriflow-backend-elcm.onrender.com';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('agriflow_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(err?.message ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, contrasena: string) =>
    request<{ data: { access_token: string; usuario: any } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, contrasena }),
    }),

  perfil: () => request<{ data: any }>('/api/auth/perfil'),

  // Fincas
  getFincas: () => request<{ data: any[] }>('/api/fincas'),
  getFinca: (id: string) => request<{ data: any }>(`/api/fincas/${id}`),
  crearFinca: (body: any) =>
    request<{ data: any }>('/api/fincas', { method: 'POST', body: JSON.stringify(body) }),
  actualizarFinca: (id: string, body: any) =>
    request<{ data: any }>(`/api/fincas/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  eliminarFinca: (id: string) =>
    request<{ data: any }>(`/api/fincas/${id}`, { method: 'DELETE' }),

  // Lotes
  getLotes: (fincaId: string) => request<{ data: any[] }>(`/api/lotes/finca/${fincaId}`),
  getLote: (id: string) => request<{ data: any }>(`/api/lotes/${id}`),
  crearLote: (body: any) =>
    request<{ data: any }>('/api/lotes', { method: 'POST', body: JSON.stringify(body) }),

  // Temporadas
  getTemporadasActivas: () => request<{ data: any[] }>('/api/temporadas/activas'),
  getCultivos: () => request<{ data: any[] }>('/api/temporadas/cultivos'),
  crearTemporada: (body: any) =>
    request<{ data: any }>('/api/temporadas', { method: 'POST', body: JSON.stringify(body) }),
  cambiarEstadoTemporada: (id: string, estado: string) =>
    request<{ data: any }>(`/api/temporadas/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    }),
  registrarCosecha: (id: string, body: any) =>
    request<{ data: any }>(`/api/temporadas/${id}/cosecha`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};