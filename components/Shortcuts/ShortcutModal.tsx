
import React, { useState } from 'react';
import { X, Keyboard as KeyboardIcon } from 'lucide-react';
import { ShortcutAction, ShortcutMapping } from '../../store/useShortcutStore';

interface ShortcutModalProps {
  shortcuts: ShortcutMapping[];
  onUpdate: (action: ShortcutAction, index: number, key: string, ctrl: boolean, shift: boolean) => void;
  onClose: () => void;
}

export const ShortcutModal: React.FC<ShortcutModalProps> = ({ shortcuts, onUpdate, onClose }) => {
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (recordingIndex === null) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(e.code)) return;

    onUpdate(
      shortcuts[recordingIndex].action, 
      recordingIndex, 
      e.code, 
      e.ctrlKey || e.metaKey,
      e.shiftKey
    );
    setRecordingIndex(null);
  };

  React.useEffect(() => {
    if (recordingIndex !== null) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [recordingIndex]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
              <KeyboardIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Command Center</h2>
              <p className="text-xs text-zinc-500 font-medium">Customize your editing workflow</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">{s.label}</span>
              <button 
                onClick={() => setRecordingIndex(idx)}
                className={`px-3 py-1.5 rounded-lg font-mono text-[10px] min-w-[120px] transition-all border ${
                  recordingIndex === idx 
                    ? 'bg-indigo-500 text-white border-indigo-400 animate-pulse' 
                    : 'bg-black text-indigo-400 border-zinc-800 hover:border-indigo-500/50'
                }`}
              >
                {recordingIndex === idx ? 'Recording...' : `${s.ctrl ? 'CTRL + ' : ''}${s.shift ? 'SHIFT + ' : ''}${s.key.replace('Key', '').replace('Digit', '')}`}
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 bg-zinc-900/30 border-t border-zinc-800 text-center">
          <p className="text-[10px] text-zinc-600 font-medium italic">Click a key binding to remap it. Press your desired key combination.</p>
        </div>
      </div>
    </div>
  );
};
