
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-500 shadow-red-600/20',
    warning: 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20',
    info: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div 
        className="w-full max-w-md bg-[#121212] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${variant === 'danger' ? 'bg-red-500/10 text-red-500' : variant === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-white" style={{ fontFamily: "'Heebo', sans-serif" }}>{title}</h3>
            </div>
            <button 
              onClick={onCancel}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
            {message}
          </p>

          <div className="flex items-center justify-start gap-3">
            <button 
              onClick={onConfirm}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 shadow-lg ${variantStyles[variant]}`}
            >
              {confirmLabel}
            </button>
            <button 
              onClick={onCancel}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
