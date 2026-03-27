import React from 'react';
import { Bold, Italic, Underline } from 'lucide-react';
import { KineticSettings } from '../../../types/kinetic';
import { ProSlider } from '../../UI/ProSlider';

interface EffectsTabProps {
  settings: KineticSettings;
  onChange: (updates: Partial<KineticSettings>) => void;
  clipId: string;
}

export const EffectsTab = ({ settings, onChange, clipId }: EffectsTabProps) => {
  return (
    <div className="p-3 flex flex-col gap-5 bg-black/20">
      {/* Text Styles */}
      <div className="flex flex-col gap-2">
        <label className="text-[9px] text-zinc-500 font-mono uppercase">Text Styles</label>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[8px] text-zinc-600 uppercase font-bold">Bold</span>
            <select
              value={settings.isBold === 'random' ? 'random' : (settings.isBold ? 'true' : 'false')}
              onChange={(e) => {
                const val = e.target.value;
                onChange({ isBold: val === 'random' ? 'random' : (val === 'true') });
              }}
              className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-white outline-none"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
              <option value="random">Random</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[8px] text-zinc-600 uppercase font-bold">Italic</span>
            <select
              value={settings.isItalic === 'random' ? 'random' : (settings.isItalic ? 'true' : 'false')}
              onChange={(e) => {
                const val = e.target.value;
                onChange({ isItalic: val === 'random' ? 'random' : (val === 'true') });
              }}
              className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-white outline-none"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
              <option value="random">Random</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[8px] text-zinc-600 uppercase font-bold">Underline</span>
            <select
              value={settings.isUnderline === 'random' ? 'random' : (settings.isUnderline ? 'true' : 'false')}
              onChange={(e) => {
                const val = e.target.value;
                onChange({ isUnderline: val === 'random' ? 'random' : (val === 'true') });
              }}
              className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-white outline-none"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
              <option value="random">Random</option>
            </select>
          </div>
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
                  previewId="shadowBlur"
                  clipId={clipId}
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
                  previewId="shadowOffsetX"
                  clipId={clipId}
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
                  previewId="shadowOffsetY"
                  clipId={clipId}
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
          <select
            value={settings.hasBackground === 'random' ? 'random' : (settings.hasBackground ? 'true' : 'false')}
            onChange={(e) => {
              const val = e.target.value;
              onChange({ hasBackground: val === 'random' ? 'random' : (val === 'true') });
            }}
            className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
          >
            <option value="true">On</option>
            <option value="false">Off</option>
            <option value="random">Random</option>
          </select>
        </div>

        {settings.hasBackground !== false && (
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center justify-between">
              <label className="text-[9px] text-zinc-500 font-mono uppercase">Background Color</label>
              <div className="flex items-center gap-2">
                <select
                  value={settings.backgroundColor === 'random' ? 'random' : 'custom'}
                  onChange={(e) => onChange({ backgroundColor: e.target.value === 'random' ? 'random' : '#000000' })}
                  className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                >
                  <option value="custom">Custom</option>
                  <option value="random">Random</option>
                </select>
                {settings.backgroundColor !== 'random' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400">{settings.backgroundColor || '#000000'}</span>
                    <input 
                      type="color" 
                      value={settings.backgroundColor || '#000000'}
                      onChange={(e) => onChange({ backgroundColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-zinc-500 font-mono uppercase">Height</label>
                <select
                  value={settings.backgroundHeight === 'random' ? 'random' : 'custom'}
                  onChange={(e) => onChange({ backgroundHeight: e.target.value === 'random' ? 'random' : 100 })}
                  className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                >
                  <option value="custom">Custom</option>
                  <option value="random">Random</option>
                </select>
              </div>
              {settings.backgroundHeight !== 'random' && (
                <ProSlider
                  label=""
                  value={settings.backgroundHeight ?? 100}
                  onChange={(v) => onChange({ backgroundHeight: v })}
                  min={10}
                  max={200}
                  step={1}
                  unit="%"
                  previewId="backgroundHeight"
                  clipId={clipId}
                />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-zinc-500 font-mono uppercase">Width</label>
                <select
                  value={settings.backgroundWidth === 'random' ? 'random' : 'custom'}
                  onChange={(e) => onChange({ backgroundWidth: e.target.value === 'random' ? 'random' : 100 })}
                  className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                >
                  <option value="custom">Custom</option>
                  <option value="random">Random</option>
                </select>
              </div>
              {settings.backgroundWidth !== 'random' && (
                <ProSlider
                  label=""
                  value={settings.backgroundWidth ?? 100}
                  onChange={(v) => onChange({ backgroundWidth: v })}
                  min={10}
                  max={200}
                  step={1}
                  unit="%"
                  previewId="backgroundWidth"
                  clipId={clipId}
                />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-zinc-500 font-mono uppercase">Border Radius</label>
                <select
                  value={settings.backgroundBorderRadius === 'random' ? 'random' : 'custom'}
                  onChange={(e) => onChange({ backgroundBorderRadius: e.target.value === 'random' ? 'random' : 4 })}
                  className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                >
                  <option value="custom">Custom</option>
                  <option value="random">Random</option>
                </select>
              </div>
              {settings.backgroundBorderRadius !== 'random' && (
                <ProSlider
                  label=""
                  value={settings.backgroundBorderRadius ?? 4}
                  onChange={(v) => onChange({ backgroundBorderRadius: v })}
                  min={0}
                  max={50}
                  step={1}
                  unit="px"
                  previewId="backgroundBorderRadius"
                  clipId={clipId}
                />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-zinc-500 font-mono uppercase">Padding</label>
                <select
                  value={settings.backgroundPadding === 'random' ? 'random' : 'custom'}
                  onChange={(e) => onChange({ backgroundPadding: e.target.value === 'random' ? 'random' : 10 })}
                  className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                >
                  <option value="custom">Custom</option>
                  <option value="random">Random</option>
                </select>
              </div>
              {settings.backgroundPadding !== 'random' && (
                <ProSlider
                  label=""
                  value={settings.backgroundPadding ?? 10}
                  onChange={(v) => onChange({ backgroundPadding: v })}
                  min={0}
                  max={50}
                  step={1}
                  unit="px"
                  previewId="backgroundPadding"
                  clipId={clipId}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
