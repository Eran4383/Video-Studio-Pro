import React, { useState } from 'react';
import { Scissors, Wand2, Pencil, Check, Eye, EyeOff, RefreshCw, RotateCcw } from 'lucide-react';
import { Clip } from '../../types';
import { generateKineticLayout } from '../../utils/kinetic/KineticLayoutManager';
import { loadFonts } from '../../utils/kinetic/kineticTextMeasure';
import { ProSlider } from '../UI/ProSlider';
import { KineticSettingsForm } from './KineticSettingsForm';
import { KineticSettings } from '../../types/kinetic';
import { KineticWordEditor } from './KineticWordEditor';

interface KineticControlsProps {
  selectedClip: any;
  store: any;
  isBlock?: boolean;
}

export const KineticControls = ({ selectedClip, store, isBlock }: KineticControlsProps) => {
  const { updateKineticData, updateKineticBlock, setKineticDrawMode, kineticDrawMode, generateBlockAnimation, clearAllWordOverrides, setSelectedKineticWordId, kineticCutMode, setKineticCutMode, splitKineticChunk } = store;
  
  // If it's a block, we need to find the actual block object from project
  const activeBlock = isBlock ? store.project.kineticBlocks?.find((b: any) => b.id === selectedClip.id) : null;
  const kineticData = isBlock ? activeBlock : selectedClip.kineticData;
  
  const hasKinetic = !!kineticData;
  const hasBoundingBox = !!kineticData?.settings?.boundingBox;
  const showBox = !!kineticData?.settings?.showBox;
  const bbox = kineticData?.settings?.boundingBox || { x: 0, y: 0, width: 0, height: 0 };
  const settings = kineticData?.settings;
  const words = kineticData?.words || [];
  const hasOverrides = isBlock && Object.keys(kineticData?.wordOverrides || {}).length > 0;

  const isChildBlock = isBlock && !!activeBlock?.parentId;
  const isParentBlock = isBlock && store.project.kineticBlocks?.some((b: any) => b.parentId === activeBlock?.id);
  
  const blockColor = isChildBlock ? activeBlock.color : undefined;
  const borderColor = isChildBlock ? activeBlock.color.replace('0.3', '0.8') : undefined;

  const updateData = (clipId: string, data: any) => {
    if (isBlock) {
      updateKineticBlock(clipId, data);
    } else {
      updateKineticData(clipId, data);
    }
  };

  const toggleKinetic = () => {
    if (hasKinetic) {
      // Logic to disable would go here
    } else {
      updateData(selectedClip.id, {
         id: `k-${Date.now()}`,
         clipId: selectedClip.id,
         settings: {
             boundingBox: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
             layoutStyle: 'dynamic-collage',
             animationStyle: 'pop',
             paletteId: 'Hormozi',
             fontFamily: selectedClip.font || 'Inter, sans-serif',
             direction: 'auto',
             showBox: true,
             gap: 2
         },
         words: []
      });
    }
  };

  const handleGenerate = async () => {
    if (!kineticData) return;
    
    const currentSettings = kineticData.settings;
    const fontsToLoad = [
      currentSettings?.primaryFont,
      currentSettings?.secondaryFont,
      ...(currentSettings?.fonts || []),
      selectedClip.font || 'Inter'
    ].filter(Boolean) as string[];
    
    await loadFonts(fontsToLoad);
    await document.fonts.ready;
    
    if (isBlock) {
      generateBlockAnimation(selectedClip.id);
    } else {
      const content = selectedClip.content || '';
      const duration = selectedClip.duration;
      const fallbackFont = selectedClip.font || 'Inter, sans-serif';
      const screenAR = store.project.resolution.width / store.project.resolution.height;
      const generatedWords = generateKineticLayout(selectedClip.id, content, duration, currentSettings, fallbackFont, screenAR);
      updateData(selectedClip.id, { words: generatedWords });
    }
  };

  const handleResetAll = () => {
    if (isBlock) {
      clearAllWordOverrides(selectedClip.id);
      setSelectedKineticWordId(null);
    }
  };

  const updateBBox = (key: string, value: number) => {
    const newBBox = { ...bbox, [key]: value / 100 };
    updateData(selectedClip.id, {
      settings: { boundingBox: newBBox }
    });
  };

  const updateSettings = (updates: Partial<KineticSettings>) => {
    updateData(selectedClip.id, {
      settings: updates
    });
  };

  return (
    <div 
      className={`flex flex-col gap-3 p-3 rounded-lg border mt-4 relative ${!isChildBlock ? 'bg-zinc-900/30 border-zinc-800/50' : 'border-transparent'}`}
      style={isChildBlock ? { borderColor: borderColor } : undefined}
    >
      {/* Sticky Header */}
      <div 
        className={`sticky top-0 z-20 backdrop-blur py-2 mb-4 border-b flex justify-between items-center ${!isChildBlock ? 'bg-zinc-900/95 border-zinc-700' : 'border-transparent'}`}
        style={isChildBlock ? { borderColor: borderColor } : undefined}
      >
        <div className="flex items-center gap-2">
          <Wand2 size={14} className={isChildBlock ? '' : 'text-purple-400'} style={isChildBlock ? { color: blockColor?.replace('0.3', '1') } : undefined} />
          <span className="text-[11px] font-black uppercase text-zinc-200 tracking-wider">
            {isChildBlock ? `Kinetic Block: ${activeBlock.name}` : 'Kinetic Block'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {hasKinetic && hasBoundingBox && (
            <>
              {isBlock && !isParentBlock && (
                <button 
                  onClick={() => { 
                    if (kineticCutMode) {
                      splitKineticChunk(selectedClip.id, 'default', store.currentTime);
                      setKineticCutMode(false);
                    } else {
                      setKineticCutMode(true);
                      setKineticDrawMode(false);
                    }
                  }}
                  className={`p-1.5 rounded-md border transition-all ${kineticCutMode ? 'bg-amber-500 text-white border-amber-400' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-600'}`}
                  title="Cut at Playhead"
                >
                  <Scissors size={12} />
                </button>
              )}
              <button 
                onClick={() => { setKineticDrawMode(!kineticDrawMode); setKineticCutMode(false); }}
                className={`p-1.5 rounded-md border transition-all ${kineticDrawMode ? 'bg-purple-500 text-white border-purple-400' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-600'}`}
                title="Draw Area"
              >
                <Pencil size={12} />
              </button>
              <button 
                onClick={handleGenerate}
                className="p-1.5 rounded-md border border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all"
                title="Regenerate"
              >
                <RefreshCw size={12} />
              </button>
            </>
          )}
          <button 
            onClick={toggleKinetic}
            className={`w-8 h-4 rounded-full relative transition-colors ml-2 ${hasKinetic ? 'bg-purple-500/20 border-purple-500/50' : 'bg-zinc-800 border-zinc-700'}`}
          >
             <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${hasKinetic ? 'left-4.5 bg-purple-400' : 'left-0.5 bg-zinc-600'}`} />
          </button>
        </div>
      </div>

      {hasKinetic && (
        <button
          onClick={() => {
            const randomSettings: Partial<KineticSettings> = {
              layoutStyle: ['pop-in-place', 'dynamic-collage', 'karaoke', 'tetris'],
              layoutMultiSelect: true,
              fonts: ['Inter', 'Playfair Display', 'JetBrains Mono', 'Space Grotesk', 'Outfit'],
              fontMultiSelect: true,
              animationStyle: ['pop', 'slide-up', 'scale', 'fade'],
              animationMultiSelect: true,
              paletteId: 'Random',
              randomMode: true,
              textCase: 'random',
              fontWeight: 'random',
              direction: 'random',
              keepPastInCollage: 'random',
              keepPastInKaraoke: 'random',
              keepPastInPop: 'random',
              keepPastInTetris: 'random',
              isBold: 'random',
              isItalic: 'random',
              isUnderline: 'random',
              shadowEnabled: 'random',
              shadowColor: 'random',
              shadowBlur: 'random',
              shadowOffsetX: 'random',
              shadowOffsetY: 'random',
              hasBackground: 'random',
              backgroundColor: 'random',
              backgroundPadding: 'random',
              backgroundBorderRadius: 'random',
              backgroundWidth: 'random',
              backgroundHeight: 'random',
              strokeWidth: 'random',
              strokeColor: 'random'
            };
            
            updateData(selectedClip.id, { settings: { ...settings, ...randomSettings } });
          }}
          className="flex items-center justify-center gap-2 mb-2 p-2 rounded-md border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wide hover:bg-indigo-500/20 transition-all w-full"
        >
          🎲 Randomize & Select All
        </button>
      )}

      {hasOverrides && (
        <button
          onClick={handleResetAll}
          className="flex items-center justify-center gap-2 mb-2 p-2 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wide hover:bg-red-500/20 transition-all w-full animate-in fade-in slide-in-from-top-1"
        >
          <RotateCcw size={12} />
          Reset All Custom Words
        </button>
      )}

      {hasKinetic && settings && (
        <div className="flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
           
           <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-500 font-mono uppercase">Box Overlay</span>
              <button 
                onClick={() => updateData(selectedClip.id, { settings: { showBox: !showBox } })}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                {showBox ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
           </div>

           {hasBoundingBox && (
             <div className="grid grid-cols-2 gap-2">
                <ProSlider label="X" value={bbox.x * 100} onChange={(v) => updateBBox('x', v)} min={0} max={100} step={1} unit="%" previewId="bbox_x" clipId={selectedClip.id} />
                <ProSlider label="Y" value={bbox.y * 100} onChange={(v) => updateBBox('y', v)} min={0} max={100} step={1} unit="%" previewId="bbox_y" clipId={selectedClip.id} />
                <ProSlider label="W" value={bbox.width * 100} onChange={(v) => updateBBox('width', v)} min={5} max={100} step={1} unit="%" previewId="bbox_width" clipId={selectedClip.id} />
                <ProSlider label="H" value={bbox.height * 100} onChange={(v) => updateBBox('height', v)} min={5} max={100} step={1} unit="%" previewId="bbox_height" clipId={selectedClip.id} />
             </div>
           )}

           <KineticSettingsForm settings={settings} onChange={updateSettings} clipId={selectedClip.id} />

           {/* Large Action Buttons */}
           <div className="flex gap-2 mt-2">
             {isBlock && !isParentBlock && (
               <button
                 onClick={() => { 
                   if (kineticCutMode) {
                     // Execute cut at current playhead time
                     splitKineticChunk(selectedClip.id, 'default', store.currentTime);
                     setKineticCutMode(false);
                   } else {
                     setKineticCutMode(true);
                     setKineticDrawMode(false);
                   }
                 }}
                 className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-md border text-[10px] font-bold uppercase tracking-wide transition-all ${kineticCutMode ? 'bg-amber-500 text-white border-amber-400' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-600'}`}
               >
                 {kineticCutMode ? <Check size={12} /> : <Scissors size={12} />}
                 {kineticCutMode ? 'Confirm Cut' : 'Cut at Playhead'}
               </button>
             )}

             <button
               onClick={() => { setKineticDrawMode(!kineticDrawMode); setKineticCutMode(false); }}
               className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-md border text-[10px] font-bold uppercase tracking-wide transition-all ${kineticDrawMode ? 'bg-purple-500 text-white border-purple-400' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-600'}`}
             >
               {kineticDrawMode ? <Check size={12} /> : <Pencil size={12} />}
               {kineticDrawMode ? 'Finish Draw' : 'Draw Area'}
             </button>
           </div>
           
           {hasBoundingBox && (
             <button
               onClick={handleGenerate}
               className="w-full flex items-center justify-center gap-2 p-2 rounded-md border border-purple-500/50 bg-purple-500/10 text-purple-300 text-[10px] font-bold uppercase tracking-wide hover:bg-purple-500/20 transition-all"
             >
               <RefreshCw size={12} />
               Generate
             </button>
           )}

        </div>
      )}
    </div>
  );
};
