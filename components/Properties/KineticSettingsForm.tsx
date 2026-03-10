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
    <div className="flex flex-col gap-3 pb-4">
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

      {/* Group 1: Layout & Animation */}
      <details className="group mb-2 border border-zinc-800 rounded-md overflow-hidden" open>
        <summary className="cursor-pointer p-3 bg-zinc-800/50 hover:bg-zinc-800 font-semibold text-[11px] uppercase tracking-wider transition-colors list-none flex items-center justify-between">
          <span>Layout & Animation</span>
          <span className="text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="p-3 flex flex-col gap-5 bg-black/20">
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
            {settings.layoutStyle === 'karaoke' && (
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
              </div>
            )}
            <p className="text-[10px] text-zinc-500 italic leading-tight px-1">
              {LAYOUT_DESCRIPTIONS[settings.layoutStyle] || "Select a layout style."}
            </p>
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
              multiple={!!settings.animationMultiSelect}
              value={Array.isArray(settings.animationStyle) ? settings.animationStyle : [settings.animationStyle as any]}
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
            <p className="text-[10px] text-zinc-500 italic leading-tight px-1">
              {settings.animationStyle === 'random' ? "Randomly assigns animations to each word." : "Select one or more animations to cycle through."}
            </p>
          </div>
        </div>
      </details>

      {/* Group 2: Fonts */}
      <details className="group mb-2 border border-zinc-800 rounded-md overflow-hidden">
        <summary className="cursor-pointer p-3 bg-zinc-800/50 hover:bg-zinc-800 font-semibold text-[11px] uppercase tracking-wider transition-colors list-none flex items-center justify-between">
          <span>Fonts</span>
          <span className="text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="p-3 flex flex-col gap-5 bg-black/20">
          <div className="flex items-center justify-between bg-zinc-900/50 p-2 rounded-lg border border-zinc-800">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Multiple Fonts</span>
            <button 
              onClick={() => onChange({ fontMultiSelect: !settings.fontMultiSelect })}
              className={`w-8 h-4 rounded-full transition-all relative ${settings.fontMultiSelect ? 'bg-indigo-600' : 'bg-zinc-700'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${settings.fontMultiSelect ? 'left-4.5' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[9px] text-zinc-500 font-mono uppercase">Selected Fonts</label>
            <select
              multiple={!!settings.fontMultiSelect}
              size={settings.fontMultiSelect ? 4 : undefined}
              value={settings.fonts || [settings.primaryFont || 'Inter']}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions).map((opt: any) => opt.value);
                if (settings.fontMultiSelect) {
                  onChange({ fonts: values });
                } else {
                  onChange({ primaryFont: values[0], fonts: [values[0]] });
                }
              }}
              className="bg-[#080808] border border-zinc-800 rounded-md p-2 text-[11px] text-white outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
            >
              {['Inter', 'Roboto', 'Montserrat', 'Oswald', 'Poppins', 'Playfair Display', 'Rubik', 'Lora', 'Merriweather', 'Nunito'].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      </details>

      {/* Group 3: Colors */}
      <details className="group mb-2 border border-zinc-800 rounded-md overflow-hidden">
        <summary className="cursor-pointer p-3 bg-zinc-800/50 hover:bg-zinc-800 font-semibold text-[11px] uppercase tracking-wider transition-colors list-none flex items-center justify-between">
          <span>Colors</span>
          <span className="text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="p-3 flex flex-col gap-5 bg-black/20">
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
        </div>
      </details>

      {/* Group 3: Advanced Settings */}
      <details className="group mb-2 border border-zinc-800 rounded-md overflow-hidden">
        <summary className="cursor-pointer p-3 bg-zinc-800/50 hover:bg-zinc-800 font-semibold text-[11px] uppercase tracking-wider transition-colors list-none flex items-center justify-between">
          <span>Advanced</span>
          <span className="text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="p-3 flex flex-col gap-5 bg-black/20">
          {/* Keep Previous Words Visible */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between bg-zinc-900/50 p-2 rounded-lg border border-zinc-800">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Keep Previous Words</span>
              <button 
                onClick={() => onChange({ keepPreviousWordsVisible: !settings.keepPreviousWordsVisible })}
                className={`w-8 h-4 rounded-full transition-all relative ${settings.keepPreviousWordsVisible ? 'bg-indigo-600' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${settings.keepPreviousWordsVisible ? 'left-4.5' : 'left-0.5'}`} />
              </button>
            </div>

            {settings.keepPreviousWordsVisible && (
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
      </details>
    </div>
  );
};
