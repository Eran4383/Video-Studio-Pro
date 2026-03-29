import React from 'react';
import { Sparkles, Plus, Star, Cloud, Circle, History, RefreshCw, Maximize, Minimize, Layers, ArrowRight } from 'lucide-react';
import { EffectDefinition } from '../../config/effects';
import { Tooltip } from '../UI/Tooltip';

const ICON_MAP: Record<string, any> = {
  Cloud, Circle, History, RefreshCw, Maximize, Minimize, Layers, ArrowRight
};

interface EffectItemProps {
  effect: EffectDefinition;
  isFavorite: boolean;
  viewMode: 'list' | 'grid';
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onApplyEffect: (effect: { type: string, name: string, params: any }) => void;
}

export const EffectItem: React.FC<EffectItemProps> = ({
  effect,
  isFavorite,
  viewMode,
  onToggleFavorite,
  onApplyEffect
}) => {
  const Icon = ICON_MAP[effect.icon] || Sparkles;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'effect',
      effect: {
        type: effect.type,
        name: effect.id,
        params: effect.defaultParams
      }
    }));
  };

  // Helper to get CSS classes for the looping hover animation based on effect ID
  const getPreviewAnimationClass = (id: string) => {
    switch (id) {
      case 'blur': return 'group-hover:blur-[4px] transition-all duration-500';
      case 'grayscale': return 'group-hover:grayscale transition-all duration-500';
      case 'sepia': return 'group-hover:sepia transition-all duration-500';
      case 'invert': return 'group-hover:invert transition-all duration-500';
      case 'zoom-in': return 'preview-anim-zoom-in';
      case 'zoom-out': return 'preview-anim-zoom-out';
      case 'crossfade': return 'preview-anim-crossfade';
      case 'wipe-right': return 'preview-anim-wipe';
      default: return 'group-hover:brightness-150 transition-all duration-500';
    }
  };

  if (viewMode === 'grid') {
    return (
      <Tooltip text={effect.description} position="top" className="w-full h-full">
        <div 
          draggable
          onDragStart={handleDragStart}
          className="group relative flex flex-col items-center p-2 rounded-lg bg-zinc-900/20 border border-zinc-800/30 hover:border-indigo-500/50 hover:bg-zinc-900/60 cursor-grab active:cursor-grabbing transition-all overflow-hidden w-full h-full"
        >
          {/* Preview Box */}
          <div className="w-full h-20 bg-zinc-800 rounded overflow-hidden relative mb-2 flex items-center justify-center shrink-0">
            {/* Base image/pattern for preview - using a colorful, high-contrast image */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-50" />
            <div className={`absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80')] bg-cover bg-center ${getPreviewAnimationClass(effect.id)}`} />
            
            {/* Overlay Icon */}
            <div className="relative z-10 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 group-hover:opacity-0 transition-opacity duration-300">
              <Icon size={12} />
            </div>
          </div>

          <div className="w-full flex items-center justify-between px-1 mt-auto">
            <span className="text-[10px] text-zinc-300 font-medium truncate pr-2">{effect.name}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button 
                onClick={(e) => onToggleFavorite(effect.id, e)}
                className={`p-1 rounded hover:bg-zinc-700 transition-colors ${isFavorite ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-400'}`}
              >
                <Star size={10} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          {/* Apply Button Overlay */}
          <button 
            onClick={() => onApplyEffect({ type: effect.type, name: effect.id, params: effect.defaultParams })}
            className="absolute top-3 right-3 p-1.5 bg-indigo-500 text-white rounded opacity-0 group-hover:opacity-100 hover:bg-indigo-400 transition-all shadow-lg z-20"
          >
            <Plus size={12} />
          </button>
        </div>
      </Tooltip>
    );
  }

  // List View
  return (
    <Tooltip text={effect.description} position="right" className="w-full">
      <div 
        draggable
        onDragStart={handleDragStart}
        className="group flex items-center justify-between px-6 py-1.5 hover:bg-indigo-500/10 cursor-grab active:cursor-grabbing transition-colors w-full"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Icon size={12} className="text-zinc-500 group-hover:text-indigo-400 shrink-0" />
          <span className="text-[11px] text-zinc-300 group-hover:text-zinc-100 truncate">{effect.name}</span>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button 
            onClick={(e) => onToggleFavorite(effect.id, e)}
            className={`p-1 rounded hover:bg-zinc-700 transition-colors ${isFavorite ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-400'}`}
          >
            <Star size={10} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button 
            onClick={() => onApplyEffect({ type: effect.type, name: effect.id, params: effect.defaultParams })}
            className="p-1 rounded hover:bg-indigo-500 text-zinc-400 hover:text-white transition-colors"
          >
            <Plus size={10} />
          </button>
        </div>
      </div>
    </Tooltip>
  );
};
