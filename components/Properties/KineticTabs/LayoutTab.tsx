import React from 'react';
import { Info } from 'lucide-react';
import { KineticSettings, KineticAnimationStyle } from '../../../types/kinetic';
import { ProSlider } from '../../UI/ProSlider';

interface LayoutTabProps {
  settings: KineticSettings;
  onChange: (updates: Partial<KineticSettings>) => void;
}

const LAYOUT_DESCRIPTIONS: Record<string, string> = {
  'dynamic-collage': "Packs words tightly into a unified, poster-like block.",
  'pop-in-place': "Words appear one by one scaled to maximum size in the center.",
  'karaoke': "Displays words sequentially in standard rows.",
  'tetris': "Interlocks words like puzzle pieces with vertical and horizontal alignments."
};

const ANIMATION_OPTIONS: { id: KineticAnimationStyle; label: string }[] = [
  { id: 'pop', label: 'Pop' },
  { id: 'slide-up', label: 'Slide Up' },
  { id: 'scale', label: 'Scale' },
  { id: 'fade', label: 'Fade' }
];

export const LayoutTab = ({ settings, onChange }: LayoutTabProps) => {
  const layoutValue = settings.layoutMultiSelect 
    ? (Array.isArray(settings.layoutStyle) ? settings.layoutStyle : (settings.layoutStyle ? [settings.layoutStyle as string] : []))
    : (Array.isArray(settings.layoutStyle) ? (settings.layoutStyle[0] || 'dynamic-collage') : (settings.layoutStyle || 'dynamic-collage'));

  const animationValue = settings.animationMultiSelect
    ? (Array.isArray(settings.animationStyle) ? settings.animationStyle : (settings.animationStyle ? [settings.animationStyle as string] : []))
    : (Array.isArray(settings.animationStyle) ? (settings.animationStyle[0] || 'random') : (settings.animationStyle || 'random'));

  return (
    <div className="p-3 flex flex-col gap-5 bg-black/20">
      {/* Layout Style */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[9px] text-zinc-500 font-mono uppercase flex items-center gap-1.5">
            Layout Style <Info size={10} className="text-zinc-700" />
          </label>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => {
                const balanced = {
                  'pop-in-place': 50,
                  'dynamic-collage': 30,
                  'karaoke': 10,
                  'tetris': 10
                };
                onChange({ 
                  layoutMultiSelect: true,
                  layoutStyle: ['pop-in-place', 'dynamic-collage', 'karaoke', 'tetris'],
                  layoutWeights: balanced
                });
              }}
              className="text-[8px] px-1.5 py-0.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded transition-colors uppercase font-bold"
            >
              Balanced Random
            </button>
            <span className="text-[8px] text-zinc-600 uppercase">Multi</span>
            <button 
              onClick={() => onChange({ layoutMultiSelect: !settings.layoutMultiSelect })}
              className={`w-6 h-3 rounded-full relative transition-colors ${settings.layoutMultiSelect ? 'bg-indigo-600' : 'bg-zinc-700'}`}
            >
              <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${settings.layoutMultiSelect ? 'left-3.5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
        <select
          key={`layout-select-${!!settings.layoutMultiSelect}`}
          multiple={!!settings.layoutMultiSelect}
          value={layoutValue}
          onChange={(e) => {
            const values = Array.from(e.target.selectedOptions).map((opt: any) => opt.value as any);
            if (settings.layoutMultiSelect) {
              onChange({ layoutStyle: values });
            } else {
              onChange({ layoutStyle: values[0] });
            }
          }}
          className="bg-[#080808] border border-zinc-800 rounded-md p-2 text-[11px] text-white outline-none focus:border-indigo-500/50 transition-colors cursor-pointer min-h-[40px]"
        >
          <option value="dynamic-collage">Dynamic Collage</option>
          <option value="pop-in-place">Pop In Place</option>
          <option value="karaoke">Karaoke</option>
          <option value="tetris">Tetris</option>
        </select>
        {(!settings.layoutMultiSelect && settings.layoutStyle === 'karaoke') && (
          <div className="mt-2 flex flex-col gap-1.5">
            <label className="text-[8px] text-zinc-600 font-mono uppercase">Karaoke Mode</label>
            <select
              value={settings.karaokeMode || 'multi-line'}
              onChange={(e) => onChange({ karaokeMode: e.target.value as any })}
              className="bg-[#080808] border border-zinc-800 rounded-md p-1.5 text-[10px] text-white outline-none"
            >
              <option value="multi-line">Multi Line</option>
              <option value="single-line">Single Line</option>
            </select>
            
            <label className="text-[8px] text-zinc-600 font-mono uppercase mt-1">Size Pattern</label>
            <select
              value={settings.karaokeSizePattern || 'uniform'}
              onChange={(e) => onChange({ karaokeSizePattern: e.target.value as any })}
              className="bg-[#080808] border border-zinc-800 rounded-md p-1.5 text-[10px] text-white outline-none"
            >
              <option value="uniform">Uniform</option>
              <option value="random">Random</option>
              <option value="ascending">Ascending</option>
              <option value="descending">Descending</option>
            </select>

            <label className="text-[8px] text-zinc-600 font-mono uppercase mt-1">Position</label>
            <select
              value={settings.karaokePosition || 'middle'}
              onChange={(e) => onChange({ karaokePosition: e.target.value as any })}
              className="bg-[#080808] border border-zinc-800 rounded-md p-1.5 text-[10px] text-white outline-none"
            >
              <option value="top">Top</option>
              <option value="middle">Middle</option>
              <option value="bottom">Bottom</option>
              <option value="random">Random</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        )}
        <p className="text-[10px] text-zinc-500 italic leading-tight px-1">
          {settings.layoutMultiSelect 
            ? "Multiple layouts selected. Adjust weights below to control frequency."
            : (LAYOUT_DESCRIPTIONS[settings.layoutStyle as string] || "Select a layout style.")}
        </p>

        {settings.layoutMultiSelect && Array.isArray(settings.layoutStyle) && settings.layoutStyle.length > 1 && (
          <div className="mt-2 flex flex-col gap-3 bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Layout Weights (Frequency)</span>
            {settings.layoutStyle.map(style => (
              <ProSlider
                key={style}
                label={style.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                value={settings.layoutWeights?.[style] ?? 25}
                onChange={(v) => onChange({ layoutWeights: { ...settings.layoutWeights, [style]: v } })}
                min={0}
                max={100}
                step={1}
                unit="%"
              />
            ))}
          </div>
        )}
      </div>

      {/* Show Last Words (Keep Past) */}
      <div className="flex flex-col gap-3 bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800">
        <span className="text-[10px] font-black text-zinc-300 uppercase tracking-tighter">Show Last Words</span>
        
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'keepPastInPop', label: 'Pop', key: 'keepPastInPop' },
            { id: 'keepPastInCollage', label: 'Collage', key: 'keepPastInCollage' },
            { id: 'keepPastInKaraoke', label: 'Karaoke', key: 'keepPastInKaraoke' },
            { id: 'keepPastInTetris', label: 'Tetris', key: 'keepPastInTetris' }
          ].map((item) => (
            <div key={item.id} className="flex flex-col gap-1.5">
              <label className="text-[8px] text-zinc-600 font-mono uppercase">{item.label}</label>
              <select
                value={settings[item.key as keyof typeof settings] === 'random' ? 'random' : (settings[item.key as keyof typeof settings] ? 'true' : 'false')}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({ [item.key]: val === 'random' ? 'random' : (val === 'true') });
                }}
                className="bg-[#080808] border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-white outline-none w-full"
              >
                <option value="true">Show</option>
                <option value="false">Hide</option>
                <option value="random">Random</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Animation Style */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[9px] text-zinc-500 font-mono uppercase">Animation Style</label>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-zinc-600 uppercase">Multi</span>
            <button 
              onClick={() => onChange({ animationMultiSelect: !settings.animationMultiSelect })}
              className={`w-6 h-3 rounded-full relative transition-colors ${settings.animationMultiSelect ? 'bg-indigo-600' : 'bg-zinc-700'}`}
            >
              <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${settings.animationMultiSelect ? 'left-3.5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
        <select
          key={`anim-select-${!!settings.animationMultiSelect}`}
          multiple={!!settings.animationMultiSelect}
          value={animationValue}
          onChange={(e) => {
            const values = Array.from(e.target.selectedOptions).map((opt: any) => opt.value as KineticAnimationStyle);
            if (settings.animationMultiSelect) {
              onChange({ animationStyle: values });
            } else {
              onChange({ animationStyle: values[0] });
            }
          }}
          className="bg-[#080808] border border-zinc-800 rounded-md p-2 text-[11px] text-white outline-none focus:border-indigo-500/50 transition-colors cursor-pointer min-h-[40px]"
        >
          <option value="random">Random</option>
          {ANIMATION_OPTIONS.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
