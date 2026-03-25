import React from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { KineticSettings } from '../../../types/kinetic';
import { KINETIC_PALETTES } from '../../../config/kineticPalettes';

interface ColorsTabProps {
  settings: KineticSettings;
  onChange: (updates: Partial<KineticSettings>) => void;
}

export const ColorsTab = ({ settings, onChange }: ColorsTabProps) => {
  return (
    <div className="p-3 flex flex-col gap-5 bg-black/20">
      <div className="flex flex-col gap-2">
        <label className="text-[9px] text-zinc-500 font-mono uppercase">Color Palette</label>
        <div className="grid grid-cols-1 gap-2">
          {KINETIC_PALETTES.map((palette) => {
            const isSelected = settings.paletteId === palette.id;
            const colors = palette.id === 'Custom' && settings.customColors?.length ? settings.customColors : palette.colors;
            
            return (
              <div
                role="button"
                key={palette.id}
                onClick={() => onChange({ paletteId: palette.id })}
                className={`flex flex-col gap-2 p-2.5 rounded-lg border transition-all text-left cursor-pointer ${isSelected ? 'bg-zinc-800/80 border-zinc-600 ring-1 ring-zinc-500/30' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-zinc-500'}`}>{palette.name}</span>
                  {isSelected && <Check size={12} className="text-indigo-500" />}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {colors.slice(0, 12).map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-sm border border-black/20 shadow-sm" style={{ backgroundColor: c }} />
                  ))}
                  {palette.id === 'Custom' && (
                    <div className="w-full mt-2 flex flex-col gap-2 p-2 bg-black/40 rounded border border-zinc-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-zinc-400 font-mono uppercase">Current Custom Palette</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (settings.customColors && settings.customColors.length > 0) {
                              const newSaved = [...(settings.savedCustomPalettes || []), [...settings.customColors]];
                              onChange({ savedCustomPalettes: newSaved });
                            }
                          }}
                          disabled={!settings.customColors || settings.customColors.length === 0}
                          className="text-[9px] bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-2 py-1 rounded transition-colors uppercase tracking-wider font-bold"
                        >
                          Save Palette
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(settings.customColors || []).map((color, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-zinc-800 p-1 rounded border border-zinc-700">
                            <input 
                              type="color" 
                              value={color}
                              onChange={(e) => {
                                const newColors = [...(settings.customColors || [])];
                                newColors[idx] = e.target.value;
                                onChange({ customColors: newColors });
                              }}
                              className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                            />
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const newColors = (settings.customColors || []).filter((_, i) => i !== idx);
                                onChange({ customColors: newColors });
                              }}
                              className="text-zinc-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}
                        {(settings.customColors || []).length < 8 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onChange({ customColors: [...(settings.customColors || []), '#ffffff'] });
                            }}
                            className="w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded border border-zinc-700 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                      {(!settings.customColors || settings.customColors.length === 0) && (
                        <span className="text-[9px] text-zinc-500 italic">No custom colors. Click + to add.</span>
                      )}

                      {/* Saved Palettes */}
                      {settings.savedCustomPalettes && settings.savedCustomPalettes.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-zinc-800/50 flex flex-col gap-2">
                          <span className="text-[9px] text-zinc-500 font-mono uppercase">Saved Palettes</span>
                          <div className="grid grid-cols-2 gap-2">
                            {settings.savedCustomPalettes.map((savedPalette, idx) => (
                              <div 
                                key={idx}
                                className="relative group flex flex-col gap-1 p-1.5 bg-zinc-900/50 rounded border border-zinc-800 hover:border-zinc-600 cursor-pointer transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onChange({ customColors: [...savedPalette] });
                                }}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newSaved = settings.savedCustomPalettes!.filter((_, i) => i !== idx);
                                    onChange({ savedCustomPalettes: newSaved });
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                  <Trash2 size={8} />
                                </button>
                                <div className="flex gap-1 flex-wrap">
                                  {savedPalette.map((c, i) => (
                                    <div key={i} className="w-3 h-3 rounded-sm border border-black/20 shadow-sm" style={{ backgroundColor: c }} />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
