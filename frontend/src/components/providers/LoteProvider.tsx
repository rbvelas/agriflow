'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { api } from '@/lib/api';

interface LoteSelection {
  id: string;
  nombre: string;
  fincaId: string;
  fincaNombre: string;
}

interface LoteContextType {
  loteSeleccionado: LoteSelection | null;
  setLoteSeleccionado: (lote: LoteSelection | null) => void;
  lotesDisponibles: LoteSelection[];
  isLoading: boolean;
}

const LoteContext = createContext<LoteContextType | undefined>(undefined);

export function LoteProvider({ children }: { children: React.ReactNode }) {
  const [loteSeleccionado, setLoteSeleccionadoState] = useState<LoteSelection | null>(null);
  const [lotesDisponibles, setLotesDisponibles] = useState<LoteSelection[]>([]);

  // Wrapper para persistir el cambio
  const setLoteSeleccionado = (lote: LoteSelection | null) => {
    setLoteSeleccionadoState(lote);
    if (lote) {
      localStorage.setItem('agriflow_lote_seleccionado_id', lote.id);
    } else {
      localStorage.removeItem('agriflow_lote_seleccionado_id');
    }
  };

  // Cargamos las fincas y sus lotes
  const { data: fincas, isLoading } = trpc.sensores.listarAlertas.useQuery(
    { loteId: 'all', soloActivas: false }, // Usamos un endpoint existente para inferir lotes o similar
    { 
      enabled: false // Solo como referencia, en realidad necesitamos un listarLotes
    }
  );

  // Mejor usamos el endpoint de fincas directamente vía fetch para cargar el selector
  useEffect(() => {
    const cargarLotes = async () => {
      if (typeof window === 'undefined') return;
      
      const token = localStorage.getItem('agriflow_token');
      if (!token) {
        setLotesDisponibles([]);
        setLoteSeleccionado(null);
        return;
      }

      try {
        const data = await api.getFincas();
        
        if (data.data) {
          const todosLosLotes: LoteSelection[] = [];
          data.data.forEach((finca: any) => {
            finca.lotes?.forEach((lote: any) => {
              todosLosLotes.push({
                id: lote.id,
                nombre: lote.nombre,
                fincaId: finca.id,
                fincaNombre: finca.nombre
              });
            });
          });
          
          setLotesDisponibles(todosLosLotes);
          
          // Intentar recuperar el lote guardado en localStorage
          const savedLoteId = localStorage.getItem('agriflow_lote_seleccionado_id');
          const savedLote = savedLoteId ? todosLosLotes.find(l => l.id === savedLoteId) : null;

          // Si hay uno guardado y es válido, lo usamos. Si no, usamos el primero disponible.
          setLoteSeleccionadoState(prev => {
            if (prev && todosLosLotes.some(l => l.id === prev.id)) {
              return prev;
            }
            return savedLote || (todosLosLotes.length > 0 ? todosLosLotes[0] : null);
          });
        }
      } catch (error) {
        console.error("Error cargando lotes para contexto:", error);
        // Si es error de autenticación (401), limpiar token
        if (error instanceof Error && error.message.includes('401')) {
          localStorage.removeItem('agriflow_token');
          localStorage.removeItem('agriflow_usuario');
        }
      }
    };

    cargarLotes();

    // Escuchar cambios en el localStorage (por ejemplo, al hacer login/logout en otra pestaña)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'agriflow_token') {
        cargarLotes();
      }
    };
    
    // También podemos usar un intervalo corto o eventos personalizados si el login ocurre en la misma pestaña
    // En este caso, como usamos window.location.href para redirecciones, el refresh suele bastar,
    // pero para SPAs es mejor observar el estado.
    window.addEventListener('storage', handleStorageChange);
    
    // Check manual cada cierto tiempo por si acaso (opcional)
    const interval = setInterval(cargarLotes, 30000); 

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <LoteContext.Provider value={{ loteSeleccionado, setLoteSeleccionado, lotesDisponibles, isLoading }}>
      {children}
    </LoteContext.Provider>
  );
}

export function useLote() {
  const context = useContext(LoteContext);
  if (context === undefined) {
    throw new Error('useLote debe ser usado dentro de un LoteProvider');
  }
  return context;
}
