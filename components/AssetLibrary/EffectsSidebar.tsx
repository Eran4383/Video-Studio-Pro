
import React, { useState, useMemo } from 'react';
import { Search, Info, Filter, ChevronRight, ChevronDown, Folder, FolderOpen, LayoutGrid, List, Columns } from 'lucide-react';
import { EFFECTS_LIBRARY, EffectDefinition } from '../../config/effects';
import { EffectItem } from './EffectItem';

interface EffectsSidebarProps {
  onApplyEffect: (effect: { type: string, name: string, params: any }) => void;
}

const CATEGORIES = ['Filters', 'Stylize', 'Transitions', 'Motion'] as const;

export const EffectsSidebar: React.FC<EffectsSidebarProps> = ({ onApplyEffect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [gridCols, setGridCols] = useState<number>(2);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Favorites': true,
    'Filters': true,
    'Stylize': true,
    'Transitions': true,
    'Motion': true
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexus-favorite-effects');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(id) 
      ? favorites.filter(f => f !== id) 
      : [...favorites, id];
    setFavorites(newFavorites);
    localStorage.setItem('nexus-favorite-effects', JSON.stringify(newFavorites));
  };

  const groupedEffects = useMemo(() => {
    const groups: Record<string, EffectDefinition[]> = {
      'Favorites': [],
      'Filters': [],
      'Stylize': [],
      'Transitions': [],
      'Motion': []
    };

    EFFECTS_LIBRARY.forEach(effect => {
      const matchesSearch = effect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          effect.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (matchesSearch) {
        if (favorites.includes(effect.id)) {
          groups['Favorites'].push(effect);
        }
        if (groups[effect.category]) {
          groups[effect.category].push(effect);
        }
      }
    });

    return groups;
  }, [searchQuery, favorites]);

  return (
    <div className="w-72 bg-[#141414] border-r border-zinc-800/50 flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-800/50 flex flex-col gap-2 bg-zinc-900/20">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">Effects</span>
          <div className="flex items-center gap-1">
            <div className="flex items-center bg-zinc-900/50 rounded p-0.5 border border-zinc-800/50 mr-1">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="List View"
              >
                <List size={10} />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Grid View"
              >
                <LayoutGrid size={10} />
              </button>
            </div>
          </div>
        </div>
        
        {viewMode === 'grid' && (
          <div className="flex items-center gap-2 px-1">
            <Columns size={10} className="text-zinc-500" />
            <input 
              type="range" 
              min="1" 
              max="3" 
              value={gridCols} 
              onChange={(e) => setGridCols(parseInt(e.target.value))}
              className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-[9px] text-zinc-500 w-2 text-center">{gridCols}</span>
          </div>
        )}
      </div>
      
      {/* Search */}
      <div className="p-2 border-b border-zinc-800/50">
        <div className="relative group">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={12} />
          <input 
            type="text"
            placeholder="Search Effects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded px-2 py-1 pl-6 text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
      </div>

      {/* Effects Tree */}
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {['Favorites', ...CATEGORIES].map(category => {
          const effects = groupedEffects[category];
          if (effects.length === 0 && category !== 'Favorites') return null;
          if (category === 'Favorites' && effects.length === 0 && !searchQuery) return null;

          const isExpanded = expandedCategories[category];

          return (
            <div key={category} className="mb-1">
              <button 
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {isExpanded ? <FolderOpen size={12} className="text-indigo-400/70" /> : <Folder size={12} className="text-indigo-400/70" />}
                <span className="text-[11px] font-medium">{category}</span>
                <span className="text-[9px] text-zinc-600 ml-auto">{effects.length}</span>
              </button>
              
              {isExpanded && (
                <div className={`mt-0.5 ${viewMode === 'grid' ? `grid gap-2 px-2 py-1 ${gridCols === 1 ? 'grid-cols-1' : gridCols === 2 ? 'grid-cols-2' : 'grid-cols-3'}` : ''}`}>
                  {effects.map(effect => (
                    <EffectItem
                      key={effect.id}
                      effect={effect}
                      isFavorite={favorites.includes(effect.id)}
                      viewMode={viewMode}
                      onToggleFavorite={toggleFavorite}
                      onApplyEffect={onApplyEffect}
                    />
                  ))}
                  {effects.length === 0 && category === 'Favorites' && (
                    <div className={`px-8 py-2 text-[10px] text-zinc-600 italic ${viewMode === 'grid' ? 'col-span-full' : ''}`}>
                      No favorites yet
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        {Object.values(groupedEffects).every(arr => arr.length === 0) && (
          <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
            <Search size={16} className="mb-2 opacity-50" />
            <p className="text-[10px]">No effects found</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2 bg-zinc-900/30 border-t border-zinc-800/50">
        <p className="text-[9px] text-zinc-500 flex items-center gap-1.5">
          <Info size={10} />
          Drag to timeline or clip
        </p>
      </div>
    </div>
  );
};
