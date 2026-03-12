import React from 'react';
import { RotateCcw } from 'lucide-react';
import { KineticWord, KineticSettings } from '../../types/kinetic';
import { ProSlider } from '../UI/ProSlider';

interface KineticWordEditorProps {
  clipId: string;
  words: KineticWord[];
  selectedWordId: string | null;
  onSelectWord: (id: string | null) => void;
  onUpdateWord: (wordId: string, updates: Partial<KineticWord>) => void;
  onResetWord?: (wordId: string) => void;
  settings?: KineticSettings;
}

export const KineticWordEditor: React.FC<KineticWordEditorProps> = ({ clipId, words, selectedWordId, onSelectWord, onUpdateWord, onResetWord, settings }) => {
  const selectedWord = words.find(w => w.id === selectedWordId);

  return (
    <div className="flex flex-col gap-3 mt-2 border-t border-zinc-800/50 pt-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-[9px] text-zinc-500 font-mono uppercase">Edit Word</label>
          <select
            value={selectedWordId || ''}
            onChange={(e) => onSelectWord(e.target.value || null)}
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
        {selectedWordId && onResetWord && (
          <button
            onClick={() => onResetWord(selectedWordId)}
            title="Reset word to default"
            className="p-2 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
          >
            <RotateCcw size={14} />
          </button>
        )}
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
                 onChange={(e) => onUpdateWord(selectedWord.id, { color: e.target.value })}
                 className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0"
               />
             </div>
          </div>

          <div className="flex flex-col gap-2 bg-zinc-900/30 p-2 rounded border border-zinc-800/50">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-500 font-mono uppercase">Stretch Horizontal</span>
              <button 
                onClick={() => onUpdateWord(selectedWord.id, { stretchX: !selectedWord.stretchX })}
                className={`w-7 h-4 rounded-full relative transition-colors ${selectedWord.stretchX ? 'bg-purple-600' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${selectedWord.stretchX ? 'left-3.5' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-500 font-mono uppercase">Stretch Vertical</span>
              <button 
                onClick={() => onUpdateWord(selectedWord.id, { stretchY: !selectedWord.stretchY })}
                className={`w-7 h-4 rounded-full relative transition-colors ${selectedWord.stretchY ? 'bg-purple-600' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${selectedWord.stretchY ? 'left-3.5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-zinc-500 font-mono uppercase">Font Family</label>
            <select
              value={selectedWord.fontFamily || settings?.primaryFont || 'Inter, sans-serif'}
              onChange={(e) => onUpdateWord(selectedWord.id, { fontFamily: e.target.value })}
              className="bg-[#080808] border border-zinc-800 rounded-md p-1.5 text-[10px] text-white outline-none"
            >
              <option value="Inter, sans-serif">Inter</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="'Georgia', serif">Georgia</option>
              <option value="'Impact', sans-serif">Impact</option>
              <option value="'Comic Sans MS', cursive">Comic Sans</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-zinc-500 font-mono uppercase">Font Weight</label>
            <select
              value={selectedWord.fontWeight || settings?.fontWeight || '900'}
              onChange={(e) => onUpdateWord(selectedWord.id, { fontWeight: e.target.value })}
              className="bg-[#080808] border border-zinc-800 rounded-md p-1.5 text-[10px] text-white outline-none"
            >
              <option value="100">100 - Thin</option>
              <option value="300">300 - Light</option>
              <option value="400">400 - Regular</option>
              <option value="700">700 - Bold</option>
              <option value="900">900 - Black</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-zinc-500 font-mono uppercase">Text Case</label>
            <select
              value={selectedWord.textCase || (settings?.textCase !== 'random' ? settings?.textCase : undefined) || 'original'}
              onChange={(e) => onUpdateWord(selectedWord.id, { textCase: e.target.value as any })}
              className="bg-[#080808] border border-zinc-800 rounded-md p-1.5 text-[10px] text-white outline-none"
            >
              <option value="original">Original</option>
              <option value="uppercase">Uppercase</option>
              <option value="lowercase">Lowercase</option>
            </select>
          </div>

          <ProSlider 
            label="Font Size" 
            value={selectedWord.fontSize * 100} // Convert 0-1 to 0-100%
            onChange={(v) => onUpdateWord(selectedWord.id, { fontSize: v / 100 })}
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
