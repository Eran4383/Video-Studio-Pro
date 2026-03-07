import React from 'react';
import { Wand2, Pencil, Check, PlayCircle } from 'lucide-react';
import { KINETIC_PRESETS } from '../../config/kineticPresets';
import { Clip } from '../../types';
import { generateKineticLayout } from '../../utils/kinetic/KineticLayoutEngine';

interface KineticControlsProps {
  selectedClip: Clip;
  store: any;
}

export const KineticControls: React.FC<KineticControlsProps> = ({ selectedClip, store }) => {
  const { updateKineticData, setKineticDrawMode, kineticDrawMode, updateClipProperties } = store;
  const hasKinetic = !!selectedClip.kineticData;
  const hasBoundingBox = !!selectedClip.kineticData?.settings?.boundingBox;

  const toggleKinetic = () => {
    if (hasKinetic) {
      // Disable: Remove kineticData (using updateClipProperties with finalize=true to trigger history)
      // Since updateClipProperties doesn't support removing kineticData directly, we rely on updateKineticData to set it to null or undefined if supported,
      // or just hide it. For now, we just toggle the UI state effectively.
      // To truly disable, we'd need a store method to unset it.
      // Let's just re-initialize if enabled.
    } else {
      updateKineticData(selectedClip.id, {
         id: `k-${Date.now()}`,
         clipId: selectedClip.id,
         settings: {
             boundingBox: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
             preset: 'Viral_Creator',
             fontFamily: selectedClip.font || 'Inter, sans-serif',
             direction: 'auto'
         },
         words: []
      });
    }
  };

  const handleGenerate = () => {
    if (!selectedClip.kineticData) return;
    const presetKey = selectedClip.kineticData.settings.preset;
    const preset = KINETIC_PRESETS[presetKey] || KINETIC_PRESETS['Viral_Creator'];
    
    const generatedWords = generateKineticLayout(selectedClip, preset);
    updateKineticData(selectedClip.id, { words: generatedWords });
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

      {hasKinetic && (
        <div className="flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
           <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-zinc-500 font-mono uppercase">Animation Style</label>
              <select 
                value={selectedClip.kineticData?.settings.preset}
                onChange={(e) => updateKineticData(selectedClip.id, { settings: { preset: e.target.value } })}
                className="bg-[#080808] border border-zinc-800 rounded-md p-1.5 text-[10px] text-white outline-none focus:border-purple-500/50 transition-colors"
              >
                {Object.keys(KINETIC_PRESETS).map(key => (
                    <option key={key} value={key}>{key.replace('_', ' ')}</option>
                ))}
              </select>
           </div>

           <button
             onClick={() => setKineticDrawMode(!kineticDrawMode)}
             className={`flex items-center justify-center gap-2 p-2 rounded-md border text-[10px] font-bold uppercase tracking-wide transition-all ${kineticDrawMode ? 'bg-purple-500 text-white border-purple-400' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-600'}`}
           >
             {kineticDrawMode ? <Check size={12} /> : <Pencil size={12} />}
             {kineticDrawMode ? 'Finish Drawing' : 'Draw Animation Area'}
           </button>

           {hasBoundingBox && (
             <button
               onClick={handleGenerate}
               className="flex items-center justify-center gap-2 p-2 rounded-md border border-purple-500/50 bg-purple-500/10 text-purple-300 text-[10px] font-bold uppercase tracking-wide hover:bg-purple-500/20 transition-all"
             >
               <PlayCircle size={12} />
               Generate Animation
             </button>
           )}
        </div>
      )}
    </div>
  );
};
