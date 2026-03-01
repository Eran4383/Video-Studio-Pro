import React from 'react';
import { Loader2, Minimize2, Maximize2, X } from 'lucide-react';

interface TranscriptionProgressProps {
  status: string;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
}

export const TranscriptionProgress: React.FC<TranscriptionProgressProps> = ({ 
  status, 
  isMinimized, 
  onToggleMinimize, 
  onClose 
}) => {
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[200] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5">
        <Loader2 className="animate-spin text-indigo-500" size={20} />
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">AI Processing</span>
          <span className="text-xs font-bold text-white max-w-[150px] truncate">{status}</span>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <button onClick={onToggleMinimize} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  return null; // When not minimized, the modal handles the UI
};
