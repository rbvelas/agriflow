'use client';

import * as React from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

type ToastContextType = {
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto rounded-lg border px-4 py-3 shadow-lg
              animate-fade-in backdrop-blur-sm
              ${t.variant === 'destructive'
                ? 'bg-red-950/90 border-red-800 text-red-100'
                : 'bg-slate-800/95 border-slate-700 text-slate-100'}
            `}
          >
            <div className="font-semibold text-sm">{t.title}</div>
            {t.description && (
              <div className="text-xs opacity-80 mt-0.5">{t.description}</div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

/** Alias conveniente para llamar directamente */
export function toast(t: Omit<Toast, 'id'>) {
  // Fallback para uso fuera del contexto React (por si acaso)
  console.warn('[toast]', t.title, t.description);
}
