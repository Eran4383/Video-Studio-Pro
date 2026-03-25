import React from 'react';
import { Bold, Italic, Underline } from 'lucide-react';
import { KineticSettings } from '../../../types/kinetic';
import { ProSlider } from '../../UI/ProSlider';

interface EffectsTabProps {
  settings: KineticSettings;
  onChange: (updates: Partial<KineticSettings>) => void;
}

export const EffectsTab = ({ settings, onChange }: EffectsTabProps) => {
  return (
    <div className="p-3 flex flex-col gap-5 bg-black/20">
      {/* Text Styles */}
      <div className="flex flex-col gap-2">
        <label className="text-[9px] text-zinc-500 font-mono uppercase">Text Styles</label>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ isBold: !settings.isBold })}
            className={`flex-1 flex items-center justify-center py-2 rounded border transition-colors ${settings.isBold ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => onChange({ isItalic: !settings.isItalic })}
            className={`flex-1 flex items-center justify-center py-2 rounded border transition-colors ${settings.isItalic ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}
          >
            <Italic size={14} />
          </button>
          <button
            onClick={() => onChange({ isUnderline: !settings.isUnderline })}
            className={`flex-1 flex items-center justify-center py-2 rounded border transition-colors ${settings.isUnderline ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}
          >
            <Underline size={14} />
          </button>
        </div>
      </div>

      {/* Shadow Effects */}
      <div className="flex flex-col gap-3 bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-tighter">Drop Shadow</span>
          <div className="flex items-center gap-2">
            <select
              value={settings.shadowEnabled === 'random' ? 'random' : (settings.shadowEnabled ? 'true' : 'false')}
              onChange={(e) => {
                const val = e.target.value;
                onChange({ shadowEnabled: val === 'random' ? 'random' : (val === 'true') });
              }}
              className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
            >
              <option value="true">On</option>
              <option value="false">Off</option>
              <option value="random">Random</option>
            </select>
          </div>
        </div>

        {settings.shadowEnabled !== false && (
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center justify-between">
              <label className="text-[9px] text-zinc-500 font-mono uppercase">Shadow Color</label>
              <div className="flex items-center gap-2">
                <select
                  value={settings.shadowColor === 'random' ? 'random' : 'custom'}
                  onChange={(e) => onChange({ shadowColor: e.target.value === 'random' ? 'random' : '#000000' })}
                  className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                >
                  <option value="custom">Custom</option>
                  <option value="random">Random</option>
                </select>
                {settings.shadowColor !== 'random' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400">{settings.shadowColor || '#000000'}</span>
                    <input 
                      type="color" 
                      value={settings.shadowColor || '#000000'}
                      onChange={(e) => onChange({ shadowColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0"
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-zinc-500 font-mono uppercase">Blur</label>
                <select
                  value={settings.shadowBlur === 'random' ? 'random' : 'custom'}
                  onChange={(e) => onChange({ shadowBlur: e.target.value === 'random' ? 'random' : 4 })}
                  className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                >
                  <option value="custom">Custom</option>
                  <option value="random">Random</option>
                </select>
              </div>
              {settings.shadowBlur !== 'random' && (
                <ProSlider
                  label=""
                  value={settings.shadowBlur ?? 4}
                  onChange={(v) => onChange({ shadowBlur: v })}
                  min={0}
                  max={50}
                  step={1}
                  unit="px"
                />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-zinc-500 font-mono uppercase">Offset X</label>
                <select
                  value={settings.shadowOffsetX === 'random' ? 'random' : 'custom'}
                  onChange={(e) => onChange({ shadowOffsetX: e.target.value === 'random' ? 'random' : 2 })}
                  className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                >
                  <option value="custom">Custom</option>
                  <option value="random">Random</option>
                </select>
              </div>
              {settings.shadowOffsetX !== 'random' && (
                <ProSlider
                  label=""
                  value={settings.shadowOffsetX ?? 2}
                  onChange={(v) => onChange({ shadowOffsetX: v })}
                  min={-50}
                  max={50}
                  step={1}
                  unit="px"
                />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-zinc-500 font-mono uppercase">Offset Y</label>
                <select
                  value={settings.shadowOffsetY === 'random' ? 'random' : 'custom'}
                  onChange={(e) => onChange({ shadowOffsetY: e.target.value === 'random' ? 'random' : 2 })}
                  className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                >
                  <option value="custom">Custom</option>
                  <option value="random">Random</option>
                </select>
              </div>
              {settings.shadowOffsetY !== 'random' && (
                <ProSlider
                  label=""
                  value={settings.shadowOffsetY ?? 2}
                  onChange={(v) => onChange({ shadowOffsetY: v })}
                  min={-50}
                  max={50}
                  step={1}
                  unit="px"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Text Background */}
      <div className="flex flex-col gap-3 bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-tighter">Text Background</span>
          <button 
            onClick={() => onChange({ hasBackground: !settings.hasBackground })}
            className={`w-8 h-4 rounded-full transition-all relative ${settings.hasBackground ? 'bg-indigo-600' : 'bg-zinc-700'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${settings.hasBackground ? 'left-4.5' : 'left-0.5'}`} />
          </button>
        </div>

        {settings.hasBackground && (
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center justify-between">
              <label className="text-[9px] text-zinc-500 font-mono uppercase">Background Color</label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-400">{settings.backgroundColor || '#000000'}</span>
                <input 
                  type="color" 
                  value={settings.backgroundColor || '#000000'}
                  onChange={(e) => onChange({ backgroundColor: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0"
                />
              </div>
            </div>
            <ProSlider
              label="Height"
              value={settings.backgroundHeight ?? 100}
              onChange={(v) => onChange({ backgroundHeight: v })}
              min={10}
              max={200}
              step={1}
              unit="%"
            />
            <ProSlider
              label="Width"
              value={settings.backgroundWidth ?? 100}
              onChange={(v) => onChange({ backgroundWidth: v })}
              min={10}
              max={200}
              step={1}
              unit="%"
            />
            <ProSlider
              label="Border Radius"
              value={settings.backgroundBorderRadius ?? 4}
              onChange={(v) => onChange({ backgroundBorderRadius: v })}
              min={0}
              max={50}
              step={1}
              unit="px"
            />
            <ProSlider
              label="Padding"
              value={settings.backgroundPadding ?? 4}
              onChange={(v) => onChange({ backgroundPadding: v })}
              min={0}
              max={50}
              step={1}
              unit="px"
            />
          </div>
        )}
      </div>
    </div>
  );
};
