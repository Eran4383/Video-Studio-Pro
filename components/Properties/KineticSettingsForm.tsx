import React from 'react';
import { KineticSettings } from '../../types/kinetic';
import { KINETIC_PALETTES } from '../../config/kineticPalettes';
import { ProSlider } from '../UI/ProSlider';

interface KineticSettingsFormProps {
  settings: KineticSettings;
  onChange: (updates: Partial<KineticSettings>) => void;
}

export const KineticSettingsForm: React.FC<KineticSettingsFormProps> = ({ settings, onChange }) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Layout Style */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[9px] text-zinc-500 font-mono uppercase">Layout Style</label>
        <select
          value={settings.layoutStyle || 'dynamic-collage'}
          onChange={(e) => onChange({ layoutStyle: e.target.value as any })}
          className="bg-[#080808] border border-zinc-800 rounded-md p-1.5 text-[10px] text-white outline-none focus:border-purple-500/50 transition-colors"
        >
          <option value="dynamic-collage">Dynamic Collage</option>
          <option value="pop-in-place">Pop In Place</option>
          <option value="karaoke">Karaoke</option>
        </select>
      </div>

      {/* Animation Style */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[9px] text-zinc-500 font-mono uppercase">Animation Style</label>
        <select
          value={settings.animationStyle || 'pop'}
          onChange={(e) => onChange({ animationStyle: e.target.value as any })}
          className="bg-[#080808] border border-zinc-800 rounded-md p-1.5 text-[10px] text-white outline-none focus:border-purple-500/50 transition-colors"
        >
          <option value="pop">Pop</option>
          <option value="slide-up">Slide Up</option>
          <option value="scale">Scale</option>
          <option value="fade">Fade</option>
        </select>
      </div>

      {/* Color Palette */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[9px] text-zinc-500 font-mono uppercase">Color Palette</label>
        <select
          value={settings.paletteId || KINETIC_PALETTES[0].id}
          onChange={(e) => onChange({ paletteId: e.target.value })}
          className="bg-[#080808] border border-zinc-800 rounded-md p-1.5 text-[10px] text-white outline-none focus:border-purple-500/50 transition-colors"
        >
          {KINETIC_PALETTES.map((palette) => (
            <option key={palette.id} value={palette.id}>
              {palette.name}
            </option>
          ))}
        </select>
      </div>

      {/* Text Direction */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[9px] text-zinc-500 font-mono uppercase">Text Direction</label>
        <select
          value={settings.direction || 'auto'}
          onChange={(e) => onChange({ direction: e.target.value as any })}
          className="bg-[#080808] border border-zinc-800 rounded-md p-1.5 text-[10px] text-white outline-none focus:border-purple-500/50 transition-colors"
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
