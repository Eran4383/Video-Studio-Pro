import React, { useState, useEffect } from 'react';
import { Type, Move, Maximize, Palette, Settings2 } from 'lucide-react';

export const PropertiesPanel: React.FC<{ store: any }> = ({ store }) => {
  const selectedClipIds = store.selectedClipIds || [];
  const applyToAll = store.applyToAll;
  const setApplyToAll = store.setApplyToAll;
  
  // Use the first selected clip as the "primary" for displaying values
  const primaryClipId = selectedClipIds[0];
  const selectedClip = store.project.tracks.flatMap(t => t.clips).find(c => c.id === primaryClipId);
  const isSubtitle = store.project.tracks.find(t => t.clips.some(c => c.id === primaryClipId))?.type === 'subtitle';

  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    if (selectedClip && isSubtitle) {
      setEditingText(selectedClip.content || '');
    }
  }, [selectedClip?.id, isSubtitle]);

  if (!selectedClip) {
    return (
      <div className="w-64 bg-[#121212] border-l border-zinc-800/50 flex flex-col p-4">
        <div className="flex flex-col items-center justify-center text-zinc-500 text-center mb-8 mt-4">
          <Settings2 size={32} className="mb-4 opacity-50" />
          <p className="text-xs font-mono uppercase tracking-widest">No Clip Selected</p>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-800 pt-4">
           <h3 className="text-[9px] font-mono uppercase text-zinc-500">Project Settings</h3>
           <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-zinc-400 flex items-center gap-1"><Palette size={10}/> Background Color</label>
              <div className="flex items-center gap-2 bg-[#080808] border border-zinc-800 rounded p-1">
                <input
                  type="color"
                  value={store.project.backgroundColor || '#000000'}
                  onChange={(e) => store.setBackgroundColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="text-[10px] font-mono text-zinc-400 uppercase">{store.project.backgroundColor || '#000000'}</span>
              </div>
           </div>
        </div>
      </div>
    );
  }

  if (!isSubtitle) {
    return (
      <div className="w-64 bg-[#121212] border-l border-zinc-800/50 flex flex-col p-4">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 border-b border-zinc-800 pb-2">Properties</h2>
        <div className="text-xs text-zinc-400 font-mono">
          <p>ID: {selectedClip.id.substring(0, 8)}</p>
          {selectedClipIds.length > 1 && <p className="text-indigo-400 mt-1">{selectedClipIds.length} items selected</p>}
          <p className="mt-2 text-zinc-500 italic">Select a text/subtitle clip to edit properties.</p>
        </div>
      </div>
    );
  }

  const updateClips = (
    content?: string, 
    position?: {x: number, y: number}, 
    color?: string, 
    font?: string, 
    scale?: number,
    rotation?: number,
    finalize: boolean = true
  ) => {
    if (applyToAll) {
      // If applying to all, just call once with the primary ID and applyToAll=true
      store.updateSubtitle(primaryClipId, content, position, true, color, font, scale, rotation, finalize);
    } else {
      // If not applying to all, apply to ALL SELECTED clips
      selectedClipIds.forEach(id => {
        store.updateSubtitle(id, content, position, false, color, font, scale, rotation, finalize);
      });
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingText(e.target.value);
  };

  const handleTextBlur = () => {
    if (selectedClip.content !== editingText) {
      // Text content update usually only applies to the specific clip unless we really want to set same text for all
      // But for multi-selection, setting same text might be weird. 
      // Let's assume text edit is only for the primary clip if multiple are selected, OR we update all.
      // Usually text content is unique per clip.
      // If applyToAll is true, it sets same text for ALL subtitles? That seems wrong for content.
      // But the store implementation of updateSubtitle DOES update content if provided.
      // Let's stick to updating only the primary clip for text content, unless applyToAll is explicitly checked (which would be weird for text).
      
      if (applyToAll) {
         store.updateSubtitle(primaryClipId, editingText, undefined, true, undefined, undefined, undefined, undefined, true);
      } else {
         store.updateSubtitle(primaryClipId, editingText, undefined, false, undefined, undefined, undefined, undefined, true);
      }
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateClips(undefined, undefined, e.target.value, undefined, undefined, undefined, true);
  };

  const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateClips(undefined, undefined, undefined, e.target.value, undefined, undefined, true);
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateClips(undefined, undefined, undefined, undefined, parseFloat(e.target.value), undefined, true);
  };

  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    const currentPos = selectedClip.position || { x: 0.5, y: 0.9 };
    const newPos = { ...currentPos, [axis]: value };
    // For position, if we have multiple selected, we might want to move them relatively?
    // But here we are setting absolute position.
    // If we set absolute position for all selected, they will stack on top of each other.
    // Maybe for position, we only update the primary one unless applyToAll is true?
    // Or we calculate delta?
    // Given the UI is absolute sliders, let's just update all to this position for now, or just primary.
    // User request: "Apply to All" button doesn't work when dragging.
    // If I use the sliders, and have multiple selected, they should probably all move to that position (alignment).
    updateClips(undefined, newPos, undefined, undefined, undefined, undefined, true);
  };
  
  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateClips(undefined, undefined, undefined, undefined, undefined, parseFloat(e.target.value), true);
  };

  return (
    <div className="w-72 bg-[#121212] border-l border-zinc-800/50 flex flex-col overflow-y-auto custom-scrollbar">
      <div className="p-4 border-b border-zinc-800/50 flex items-center gap-2 sticky top-0 bg-[#121212] z-10">
        <Type size={16} className="text-indigo-400" />
        <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
          Text Inspector {selectedClipIds.length > 1 && <span className="text-indigo-400">({selectedClipIds.length})</span>}
        </h2>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {/* Text Content */}
        <div className="flex flex-col gap-2">
          <label className="text-[9px] font-mono uppercase text-zinc-500 flex justify-between">
            <span>Content</span>
          </label>
          <textarea
            value={editingText}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            disabled={selectedClipIds.length > 1 && !applyToAll} // Disable text edit if multiple selected to avoid overwriting unique text, unless applyToAll
            className={`bg-[#080808] border border-zinc-800 rounded-lg p-3 text-xs text-white resize-y min-h-[80px] focus:border-indigo-500 outline-none transition-colors ${selectedClipIds.length > 1 && !applyToAll ? 'opacity-50 cursor-not-allowed' : ''}`}
            placeholder={selectedClipIds.length > 1 ? "Multiple selection (text edit disabled)" : "Enter text..."}
          />
        </div>

        {/* Global Toggle */}
        <div className="flex items-center gap-2 bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20">
          <input 
            type="checkbox" 
            id="applyToAllProps" 
            checked={applyToAll} 
            onChange={(e) => setApplyToAll(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-indigo-500/50 text-indigo-500 focus:ring-indigo-500 bg-black"
          />
          <label htmlFor="applyToAllProps" className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 cursor-pointer">
            Apply Style to All Subtitles
          </label>
        </div>

        {/* Typography */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[9px] font-mono uppercase text-zinc-500 border-b border-zinc-800 pb-1">Typography</h3>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-zinc-400">Font Family</label>
            <select 
              value={selectedClip.font || 'Inter, sans-serif'}
              onChange={handleFontChange}
              className="bg-[#080808] border border-zinc-800 rounded p-1.5 text-xs text-white focus:border-indigo-500 outline-none"
            >
              <option value="Inter, sans-serif">Inter</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="'Impact', sans-serif">Impact</option>
              <option value="'Comic Sans MS', cursive">Comic Sans</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[9px] text-zinc-400 flex items-center gap-1"><Palette size={10}/> Color</label>
              <div className="flex items-center gap-2 bg-[#080808] border border-zinc-800 rounded p-1">
                <input
                  type="color"
                  value={selectedClip.color || '#ffffff'}
                  onChange={handleColorChange}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="text-[10px] font-mono text-zinc-400 uppercase">{selectedClip.color || '#ffffff'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[9px] text-zinc-400 flex items-center gap-1"><Maximize size={10}/> Scale</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={selectedClip.scale || 1}
                  onChange={handleScaleChange}
                  className="w-full accent-indigo-500"
                />
                <span className="text-[10px] font-mono text-zinc-400 w-6 text-right">{(selectedClip.scale || 1).toFixed(1)}x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transform */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[9px] font-mono uppercase text-zinc-500 border-b border-zinc-800 pb-1">Transform</h3>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 w-4">X</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedClip.position?.x ?? 0.5}
                onChange={(e) => handlePositionChange('x', parseFloat(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">{Math.round((selectedClip.position?.x ?? 0.5) * 100)}%</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 w-4">Y</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedClip.position?.y ?? 0.9}
                onChange={(e) => handlePositionChange('y', parseFloat(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">{Math.round((selectedClip.position?.y ?? 0.9) * 100)}%</span>
            </div>
            
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-mono text-zinc-500 w-4">R</span>
               <input
                 type="range"
                 min="-180"
                 max="180"
                 step="1"
                 value={selectedClip.rotation || 0}
                 onChange={handleRotationChange}
                 className="flex-1 accent-indigo-500"
               />
               <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">{selectedClip.rotation || 0}°</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
