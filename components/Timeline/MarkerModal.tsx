import React, { useState, useEffect, useRef } from 'react';
import { Marker } from '../../types';
import { X, Check, Trash2 } from 'lucide-react';

interface MarkerModalProps {
  marker: Marker;
  onSave: (id: string, updates: Partial<Marker>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  position: { x: number, y: number };
}

export const MarkerModal: React.FC<MarkerModalProps> = ({ marker, onSave, onDelete, onClose, position }) => {
  const [label, setLabel] = useState(marker.label || '');
  const [color, setColor] = useState(marker.color || '#FF0000');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSave = () => {
    onSave(marker.id, { label, color });
    onClose();
  };

  const handleDelete = () => {
    onDelete(marker.id);
    onClose();
  };

  const colors = [
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFFFFF', // White
    '#FFA500', // Orange
  ];

  return (
    <div 
      ref={modalRef}
      className="fixed z-[200] bg-[#1a1a1a] border border-zinc-700 rounded-lg shadow-2xl p-4 w-64 flex flex-col gap-4 animate-in fade-in zoom-in duration-200"
      style={{ top: Math.min(window.innerHeight - 300, position.y), left: Math.min(window.innerWidth - 300, position.x) }}
    >
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <h3 className="text-xs font-bold uppercase text-zinc-400">Edit Marker</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={14} /></button>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase">Label</label>
        <input 
          type="text" 
          value={label} 
          onChange={(e) => setLabel(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
          placeholder="Marker Name"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase">Color</label>
        <div className="flex flex-wrap gap-2">
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-zinc-800">
        <button onClick={handleDelete} className="flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-colors">
          <Trash2 size={12} /> Delete
        </button>
        <button onClick={handleSave} className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-colors">
          <Check size={12} /> Save
        </button>
      </div>
    </div>
  );
};
