import React from 'react';
import { Wand2, Pencil, Check, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Clip } from '../../types';
import { generateKineticLayout } from '../../utils/kinetic/KineticLayoutManager';
import { ProSlider } from '../UI/ProSlider';
import { KineticSettingsForm } from './KineticSettingsForm';
import { KineticSettings } from '../../types/kinetic';

interface KineticControlsProps {
  selectedClip: Clip;
  store: any;
}

export const KineticControls: React.FC<KineticControlsProps> = ({ selectedClip, store }) => {
  const { updateKineticData, setKineticDrawMode, kineticDrawMode } = store;
  const hasKinetic = !!selectedClip.kineticData;
  const hasBoundingBox = !!selectedClip.kineticData?.settings?.boundingBox;
  const showBox = !!selectedClip.kineticData?.settings?.showBox;
  const bbox = selectedClip.kineticData?.settings?.boundingBox || { x: 0, y: 0, width: 0, height: 0 };
  const settings = selectedClip.kineticData?.settings;

  const toggleKinetic = () => {
    if (hasKinetic) {
      // Logic to disable would go here
    } else {
      updateKineticData(selectedClip.id, {
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

  const handleGenerate = () => {
    if (!selectedClip.kineticData) return;
    const currentSettings = selectedClip.kineticData.settings;
    
    const generatedWords = generateKineticLayout(selectedClip, currentSettings);
    updateKineticData(selectedClip.id, { words: generatedWords });
  };

  const updateBBox = (key: string, value: number) => {
    const newBBox = { ...bbox, [key]: value / 100 };
    updateKineticData(selectedClip.id, {
      settings: { boundingBox: newBBox }
    });
  };

  const updateSettings = (updates: Partial<KineticSettings>) => {
    updateKineticData(selectedClip.id, {
      settings: updates
    });
  };

  return (
    <div className="flex flex-col gap-3 p-3 bg-zinc-900/30 rounded-lg border border-zinc-800/50 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 size={14} className="text-purple-400" />
          <span className="text-[10px] font-black uppercase text-zinc-300 tracking-wider">Smart Kinetic</span>
        </div>
        <button 
          onClick={toggleKinetic}
          className={`w-8 h-4 rounded-full relative transition-colors ${hasKinetic ? 'bg-purple-500/20 border-purple-500/50' : 'bg-zinc-800 border-zinc-700'}`}
        >
           <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${hasKinetic ? 'left-4.5 bg-purple-400' : 'left-0.5 bg-zinc-600'}`} />
        </button>
      </div>

      {hasKinetic && settings && (
        <div className="flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
           
           <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-500 font-mono uppercase">Box Overlay</span>
              <button 
                onClick={() => updateKineticData(selectedClip.id, { settings: { showBox: !showBox } })}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                {showBox ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
           </div>

           {hasBoundingBox && (
             <div className="grid grid-cols-2 gap-2">
                <ProSlider label="X" value={bbox.x * 100} onChange={(v) => updateBBox('x', v)} min={0} max={100} step={1} unit="%" />
                <ProSlider label="Y" value={bbox.y * 100} onChange={(v) => updateBBox('y', v)} min={0} max={100} step={1} unit="%" />
                <ProSlider label="W" value={bbox.width * 100} onChange={(v) => updateBBox('width', v)} min={5} max={100} step={1} unit="%" />
                <ProSlider label="H" value={bbox.height * 100} onChange={(v) => updateBBox('height', v)} min={5} max={100} step={1} unit="%" />
             </div>
           )}

           <KineticSettingsForm settings={settings} onChange={updateSettings} />

           <div className="flex gap-2">
             <button
               onClick={() => setKineticDrawMode(!kineticDrawMode)}
               className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-md border text-[10px] font-bold uppercase tracking-wide transition-all ${kineticDrawMode ? 'bg-purple-500 text-white border-purple-400' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-600'}`}
             >
               {kineticDrawMode ? <Check size={12} /> : <Pencil size={12} />}
               {kineticDrawMode ? 'Finish' : 'Draw'}
             </button>

             {hasBoundingBox && (
               <button
                 onClick={handleGenerate}
                 className="flex-1 flex items-center justify-center gap-2 p-2 rounded-md border border-purple-500/50 bg-purple-500/10 text-purple-300 text-[10px] font-bold uppercase tracking-wide hover:bg-purple-500/20 transition-all"
               >
                 <RefreshCw size={12} />
                 Regenerate
               </button>
             )}
           </div>
        </div>
      )}
    </div>
  );
};
