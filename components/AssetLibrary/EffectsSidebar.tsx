
import React, { useState, useMemo } from 'react';
import { Sparkles, Search, Plus, Info, Cloud, Circle, History, RefreshCw, Maximize, Minimize, Layers, ArrowRight, Star, Filter, Play, Move } from 'lucide-react';
import { EFFECTS_LIBRARY, EffectDefinition } from '../../config/effects';
import { Tooltip } from '../UI/Tooltip';

interface EffectsSidebarProps {
  onApplyEffect: (effect: { type: string, name: string, params: any }) => void;
}

const ICON_MAP: Record<string, any> = {
  Cloud, Circle, History, RefreshCw, Maximize, Minimize, Layers, ArrowRight
};

const CATEGORIES = ['All', 'Filters', 'Transitions', 'Motion', 'Favorites'] as const;
type Category = typeof CATEGORIES[number];

export const EffectsSidebar: React.FC<EffectsSidebarProps> = ({ onApplyEffect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexus-favorite-effects');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(id) 
      ? favorites.filter(f => f !== id) 
      : [...favorites, id];
    setFavorites(newFavorites);
    localStorage.setItem('nexus-favorite-effects', JSON.stringify(newFavorites));
  };

  const filteredEffects = useMemo(() => {
    return EFFECTS_LIBRARY.filter(effect => {
      const matchesSearch = effect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          effect.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || 
                             (activeCategory === 'Favorites' ? favorites.includes(effect.id) : effect.category === activeCategory);
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory, favorites]);

  return (
    <div className="w-80 bg-[#0c0c0e] border-r border-zinc-800/50 flex flex-col h-full overflow-hidden">
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Sparkles size={16} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-100">Effects Engine</h2>
              <p className="text-[9px] text-zinc-500 font-medium">Visual enhancement suite</p>
            </div>
          </div>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" size={14} />
          <input 
            type="text"
            placeholder="Search library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-xl py-2.5 pl-9 pr-4 text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/30 focus:bg-zinc-900/50 transition-all"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeCategory === cat 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-zinc-900/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 custom-scrollbar">
        {filteredEffects.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {filteredEffects.map((effect) => {
              const Icon = ICON_MAP[effect.icon] || Sparkles;
              const isFavorite = favorites.includes(effect.id);
              
              return (
                <div 
                  key={effect.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'effect',
                      effect: {
                        type: effect.type,
                        name: effect.id,
                        params: effect.defaultParams
                      }
                    }));
                  }}
                  className="group relative p-4 rounded-2xl bg-zinc-900/20 border border-zinc-800/30 hover:border-indigo-500/30 hover:bg-zinc-900/40 transition-all cursor-grab active:cursor-grabbing overflow-hidden"
                >
                  {/* Subtle Background Glow */}
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/5 blur-2xl rounded-full group-hover:bg-indigo-500/10 transition-all" />
                  
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-all">
                      <Icon size={20} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-bold text-zinc-200 tracking-wide">{effect.name}</h3>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={(e) => toggleFavorite(effect.id, e)}
                            className={`p-1.5 rounded-lg transition-all ${isFavorite ? 'text-amber-400' : 'text-zinc-600 hover:text-amber-400 hover:bg-amber-400/10'}`}
                          >
                            <Star size={12} fill={isFavorite ? 'currentColor' : 'none'} />
                          </button>
                          <button 
                            onClick={() => onApplyEffect({ type: effect.type, name: effect.id, params: effect.defaultParams })}
                            className="p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[9px] text-zinc-500 font-medium leading-relaxed mt-1 line-clamp-2">
                        {effect.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-700">
            <div className="w-12 h-12 rounded-full bg-zinc-900/50 flex items-center justify-center mb-4">
              <Search size={20} className="opacity-20" />
            </div>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40">No effects found</p>
          </div>
        )}
      </div>

      <div className="p-5 bg-zinc-900/10 border-t border-zinc-800/30">
        <div className="flex items-start gap-3 text-zinc-500">
          <div className="mt-0.5">
            <Info size={12} className="text-indigo-500/50" />
          </div>
          <p className="text-[9px] font-medium leading-normal">
            Drag effects to the timeline to create <span className="text-zinc-300">Adjustment Layers</span> or apply directly to clips.
          </p>
        </div>
      </div>
    </div>
  );
};
