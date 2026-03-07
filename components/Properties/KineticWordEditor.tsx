import React, { useState } from 'react';
import { KineticWord } from '../../types/kinetic';
import { useProjectStore } from '../../store/useProjectStore';
import { ProSlider } from '../UI/ProSlider';

interface KineticWordEditorProps {
  clipId: string;
  words: KineticWord[];
}

export const KineticWordEditor: React.FC<KineticWordEditorProps> = ({ clipId, words }) => {
  const [selectedWordId, setSelectedWordId] = useState<string>('');
  const updateKineticWord = useProjectStore(state => state.updateKineticWord);

  const selectedWord = words.find(w => w.id === selectedWordId);

  return (
    <div className="flex flex-col gap-3 mt-2 border-t border-zinc-800/50 pt-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-[9px] text-zinc-500 font-mono uppercase">Edit Word</label>
        <select
          value={selectedWordId}
          onChange={(e) => setSelectedWordId(e.target.value)}
          className="bg-[#080808] border border-zinc-800 rounded-md p-1.5 text-[10px] text-white outline-none focus:border-purple-500/50 transition-colors"
        >
          <option value="">Select a word...</option>
          {words.map((word, index) => (
            <option key={word.id} value={word.id}>
              {index + 1}. {word.text}
            </option>
          ))}
        </select>
      </div>

      {selectedWord && (
        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between">
             <span className="text-[9px] text-zinc-500 font-mono uppercase">Color</span>
             <div className="flex items-center gap-2">
               <span className="text-[10px] font-mono text-zinc-400">{selectedWord.color}</span>
               <input 
                 type="color" 
                 value={selectedWord.color}
                 onChange={(e) => updateKineticWord(clipId, selectedWord.id, { color: e.target.value })}
                 className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0"
               />
             </div>
          </div>

          <ProSlider 
            label="Font Size" 
            value={selectedWord.fontSize * 100} // Convert 0-1 to 0-100%
            onChange={(v) => updateKineticWord(clipId, selectedWord.id, { fontSize: v / 100 })}
            min={1} 
            max={100} 
            step={1} 
            unit="%" 
          />
        </div>
      )}
    </div>
  );
};
