'use client';

import { Button } from './button';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'success' | 'info';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'info'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variants = {
    danger: {
      icon: <AlertCircle size={32} className="text-red-600" />,
      bg: 'bg-red-50',
      button: 'bg-red-600 hover:bg-red-700 shadow-red-100',
    },
    success: {
      icon: <CheckCircle2 size={32} className="text-emerald-600" />,
      bg: 'bg-emerald-50',
      button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100',
    },
    info: {
      icon: <AlertCircle size={32} className="text-blue-600" />,
      bg: 'bg-blue-50',
      button: 'bg-slate-900 hover:bg-slate-800 shadow-slate-100',
    }
  };

  const current = variants[variant];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-[2rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Background Accent */}
        <div className={cn("absolute top-0 right-0 w-32 h-32 opacity-10 -mr-8 -mt-8 rounded-full", current.bg)} />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className={cn("p-5 rounded-[1.5rem]", current.bg)}>
            {current.icon}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              {description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
            <Button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={cn("flex-1 text-white font-bold h-14 rounded-2xl shadow-lg transition-all active:scale-95", current.button)}
            >
              {confirmText}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 h-14 rounded-2xl transition-all"
            >
              {cancelText}
            </Button>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 transition-colors p-2"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
