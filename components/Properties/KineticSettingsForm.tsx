import React from 'react';
import { KineticSettings, KineticAnimationStyle } from '../../types/kinetic';
import { KINETIC_PALETTES } from '../../config/kineticPalettes';
import { ProSlider } from '../UI/ProSlider';
import { Check, Info } from 'lucide-react';

interface KineticSettingsFormProps {
  settings: KineticSettings;
  onChange: (updates: Partial<KineticSettings>) => void;
}

const LAYOUT_DESCRIPTIONS: Record<string, string> = {
  'dynamic-collage': "Packs words tightly into a unified, poster-like block.",
  'pop-in-place': "Words appear one by one scaled to maximum size in the center.",
  'karaoke': "Displays words sequentially in standard rows."
};

const ANIMATION_OPTIONS: { id: KineticAnimationStyle; label: string }[] = [
  { id: 'pop', label: 'Pop' },
  { id: 'slide-up', label: 'Slide Up' },
  { id: 'scale', label: 'Scale' },
  { id: 'fade', label: 'Fade' }
];

export const KineticSettingsForm: React.FC<KineticSettingsFormProps> = ({ settings, onChange }) => {
  const toggleAnimation = (style: KineticAnimationStyle) => {
    let current = settings.animationStyle;
    if (current === 'random') {
      onChange({ animationStyle: [style] });
      return;
    }
    
    const array = Array.isArray(current) ? current : [current as KineticAnimationStyle];
    if (array.includes(style)) {
      if (array.length > 1) {
        onChange({ animationStyle: array.filter(s => s !== style) });
      }
    } else {
      onChange({ animationStyle: [...array, style] });
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Show Bounding Box Toggle */}
      <div className="flex items-center justify-between bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800">
        <span className="text-[10px] font-black text-zinc-300 uppercase tracking-tighter">Show Bounding Box</span>
        <button 
          onClick={() => onChange({ showBox: !settings.showBox })}
          className={`w-9 h-5 rounded-full transition-all relative ${settings.showBox ? 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'bg-zinc-700'}`}
        >
          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.showBox ? 'left-5' : 'left-1'}`} />
        </button>
      </div>

      {/* Layout Style */}
      <div className="flex flex-col gap-2">
        <label className="text-[9px] text-zinc-500 font-mono uppercase flex items-center gap-1.5">
          Layout Style <Info size={10} className="text-zinc-700" />
        </label>
        <select
          value={settings.layoutStyle || 'dynamic-collage'}
          onChange={(e) => onChange({ layoutStyle: e.target.value as any })}
          className="bg-[#080808] border border-zinc-800 rounded-md p-2 text-[11px] text-white outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
        >
          <option value="dynamic-collage">Dynamic Collage</option>
          <option value="pop-in-place">Pop In Place</option>
          <option value="karaoke">Karaoke</option>
        </select>
        <p className="text-[10px] text-zinc-500 italic leading-tight px-1">
          {LAYOUT_DESCRIPTIONS[settings.layoutStyle] || "Select a layout style."}
        </p>
      </div>

      {/* Animation Style */}
      <div className="flex flex-col gap-2">
        <label className="text-[9px] text-zinc-500 font-mono uppercase">Animation Style</label>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onChange({ animationStyle: 'random' })}
            className={`px-2.5 py-1 rounded text-[10px] font-black border transition-all ${settings.animationStyle === 'random' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
          >
            RANDOM
          </button>
          {ANIMATION_OPTIONS.map(opt => {
            const isSelected = settings.animationStyle === 'random' ? false : 
              (Array.isArray(settings.animationStyle) ? settings.animationStyle.includes(opt.id) : settings.animationStyle === opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggleAnimation(opt.id)}
                className={`px-2.5 py-1 rounded text-[10px] font-black border transition-all ${isSelected ? 'bg-zinc-100 border-white text-black' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
              >
                {opt.label.toUpperCase()}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-500 italic leading-tight px-1">
          {settings.animationStyle === 'random' ? "Randomly assigns animations to each word." : "Select one or more animations to cycle through."}
        </p>
      </div>

      {/* Color Palette Grid */}
      <div className="flex flex-col gap-2">
        <label className="text-[9px] text-zinc-500 font-mono uppercase">Color Palette</label>
        <div className="grid grid-cols-1 gap-2">
          {KINETIC_PALETTES.map((palette) => {
            const isSelected = settings.paletteId === palette.id;
            const colors = palette.id === 'Custom' && settings.customColors?.length ? settings.customColors : palette.colors;
            
            return (
              <button
                key={palette.id}
                onClick={() => onChange({ paletteId: palette.id })}
                className={`flex flex-col gap-2 p-2.5 rounded-lg border transition-all text-left ${isSelected ? 'bg-zinc-800/80 border-zinc-600 ring-1 ring-zinc-500/30' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-zinc-500'}`}>{palette.name}</span>
                  {isSelected && <Check size={12} className="text-indigo-500" />}
                </div>
                <div className="flex gap-1.5">
                  {colors.slice(0, 6).map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-sm border border-black/20 shadow-sm" style={{ backgroundColor: c }} />
                  ))}
                  {colors.length === 0 && palette.id === 'Custom' && (
                    <span className="text-[9px] text-zinc-600 italic">No custom colors set</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Text Direction */}
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

      {/* Gap Slider */}
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
