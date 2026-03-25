import React from 'react';
import { KineticSettings } from '../../../types/kinetic';
import { ProSlider } from '../../UI/ProSlider';

interface AdvancedTabProps {
  settings: KineticSettings;
  onChange: (updates: Partial<KineticSettings>) => void;
}

export const AdvancedTab = ({ settings, onChange }: AdvancedTabProps) => {
  return (
    <div className="p-3 flex flex-col gap-5 bg-black/20">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800">
          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter mb-1">Keep Previous Words</span>
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">In Collage</span>
            <button 
              onClick={() => onChange({ keepPastInCollage: !settings.keepPastInCollage })}
              className={`w-8 h-4 rounded-full transition-all relative ${settings.keepPastInCollage ? 'bg-indigo-600' : 'bg-zinc-700'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${settings.keepPastInCollage ? 'left-4.5' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">In Karaoke</span>
            <button 
              onClick={() => onChange({ keepPastInKaraoke: !settings.keepPastInKaraoke })}
              className={`w-8 h-4 rounded-full transition-all relative ${settings.keepPastInKaraoke ? 'bg-indigo-600' : 'bg-zinc-700'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${settings.keepPastInKaraoke ? 'left-4.5' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">In Pop In Place</span>
            <button 
              onClick={() => onChange({ keepPastInPop: !settings.keepPastInPop })}
              className={`w-8 h-4 rounded-full transition-all relative ${settings.keepPastInPop ? 'bg-indigo-600' : 'bg-zinc-700'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${settings.keepPastInPop ? 'left-4.5' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">In Tetris</span>
            <button 
              onClick={() => onChange({ keepPastInTetris: !settings.keepPastInTetris })}
              className={`w-8 h-4 rounded-full transition-all relative ${settings.keepPastInTetris ? 'bg-indigo-600' : 'bg-zinc-700'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${settings.keepPastInTetris ? 'left-4.5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        {(settings.keepPastInCollage || settings.keepPastInKaraoke || settings.keepPastInPop || settings.keepPastInTetris) && (
          <div className="flex flex-col gap-4 pl-2 border-l border-zinc-800 ml-1">
            <ProSlider
              label="Past Words Opacity"
              value={settings.pastWordsOpacity ?? 40}
              onChange={(v) => onChange({ pastWordsOpacity: v })}
              min={0}
              max={100}
              step={5}
              unit="%"
            />
            <ProSlider
              label="Fade Duration"
              value={settings.pastWordsFadeDuration ?? 0.5}
              onChange={(v) => onChange({ pastWordsFadeDuration: v })}
              min={0}
              max={5}
              step={0.1}
              unit="s"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[9px] text-zinc-500 font-mono uppercase">Text Direction</label>
        <select
          value={settings.direction || 'auto'}
          onChange={(e) => onChange({ direction: e.target.value as any })}
          className="bg-[#080808] border border-zinc-800 rounded-md p-1.5 text-[10px] text-white outline-none focus:border-indigo-500/50 transition-colors"
        >
          <option value="auto">Auto Detect</option>
          <option value="ltr">Left to Right</option>
          <option value="rtl">Right to Left</option>
        </select>
      </div>

      <ProSlider
        label="Max Scene Time Gap (sec)"
        value={settings.maxTimeGap ?? 0.4}
        onChange={(v) => onChange({ maxTimeGap: v })}
        min={0.1}
        max={2.0}
        step={0.1}
        unit="s"
      />

      <ProSlider
        label="Gap"
        value={settings.gap || 0}
        onChange={(v) => onChange({ gap: v })}
        min={0}
        max={20}
        step={1}
        unit="%"
      />
    </div>
  );
};
