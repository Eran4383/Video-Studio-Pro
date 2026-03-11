import React from 'react';
import { KineticSettings, KineticAnimationStyle } from '../../types/kinetic';
import { KINETIC_PALETTES } from '../../config/kineticPalettes';
import { ProSlider } from '../UI/ProSlider';
import { Check, Info, ChevronUp, ChevronDown, RotateCw, ListChecks, Plus, Trash2, Maximize2, Target } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { Clip } from '../../types';

interface KineticSettingsFormProps {
  settings: KineticSettings;
  onChange: (updates: Partial<KineticSettings>) => void;
}

const ALL_FONTS = ['Inter', 'Roboto', 'Montserrat', 'Oswald', 'Poppins', 'Playfair Display', 'Rubik', 'Lora', 'Merriweather', 'Nunito'];

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

type TabId = 'Layout' | 'Fonts' | 'Colors' | 'Advanced' | 'BoundingBox';

export const KineticSettingsForm: React.FC<KineticSettingsFormProps> = ({ settings, onChange }) => {
  const { applySettingsToAllKineticBlocks, project, currentTime } = useProjectStore();
  const [tabOrder, setTabOrder] = React.useState<TabId[]>(['Layout', 'Fonts', 'Colors', 'Advanced', 'BoundingBox']);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = React.useState(false);
  const fontDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
        setIsFontDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const moveTab = (id: TabId, direction: 'up' | 'down') => {
    const index = tabOrder.indexOf(id);
    if (direction === 'up' && index > 0) {
      const newOrder = [...tabOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setTabOrder(newOrder);
    } else if (direction === 'down' && index < tabOrder.length - 1) {
      const newOrder = [...tabOrder];
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
      setTabOrder(newOrder);
    }
  };

  const selectAllFonts = () => {
    onChange({ fonts: [...ALL_FONTS], fontMultiSelect: true });
  };

  const randomizeFont = () => {
    const otherFonts = ALL_FONTS.filter(f => f !== settings.primaryFont);
    const random = otherFonts[Math.floor(Math.random() * otherFonts.length)];
    onChange({ primaryFont: random, fonts: [random], fontMultiSelect: false });
  };

  const snapToScreen = () => {
    onChange({
      boundingBox: { x: 0, y: 0, width: 1, height: 1 }
    });
  };

  const snapToClip = () => {
    const visualTracks = project.tracks.filter(t => t.type === 'video');
    let targetClip: Clip | null = null;
    
    for (let i = visualTracks.length - 1; i >= 0; i--) {
      const track = visualTracks[i];
      if (!track.isVisible) continue;
      const clip = track.clips.find(c => currentTime >= c.startTime && currentTime <= c.startTime + c.duration);
      if (clip) {
        targetClip = clip;
        break;
      }
    }

    if (targetClip) {
      const pos = targetClip.position || { x: 0.5, y: 0.5 };
      const scaleX = targetClip.scaleX ?? targetClip.scale ?? 1;
      const scaleY = targetClip.scaleY ?? targetClip.scale ?? 1;
      
      const width = scaleX;
      const height = scaleY;
      const x = pos.x - (width / 2);
      const y = pos.y - (height / 2);
      
      onChange({
        boundingBox: { x, y, width, height }
      });
    }
  };

  const renderTab = (id: TabId) => {
    const summary = (label: string) => (
      <summary className="cursor-pointer p-3 bg-zinc-800/50 hover:bg-zinc-800 font-semibold text-[11px] uppercase tracking-wider transition-colors list-none flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveTab(id, 'up'); }} className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white"><ChevronUp size={10} /></button>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveTab(id, 'down'); }} className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white"><ChevronDown size={10} /></button>
          <span className="text-zinc-500 group-open:rotate-180 transition-transform ml-1">▼</span>
        </div>
      </summary>
    );

    switch (id) {
      case 'Layout':
        return (
          <details key={id} className="group mb-2 border border-zinc-800 rounded-md overflow-hidden" open>
            {summary('Layout & Animation')}
            <div className="p-3 flex flex-col gap-5 bg-black/20">
              {/* Layout Style */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] text-zinc-500 font-mono uppercase flex items-center gap-1.5">
                    Layout Style <Info size={10} className="text-zinc-700" />
                  </label>
                  <div className="flex items-center gap-1.5">
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
                  multiple={!!settings.layoutMultiSelect}
                  value={Array.isArray(settings.layoutStyle) ? settings.layoutStyle : [settings.layoutStyle as any]}
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
                        value={settings.layoutWeights?.[style] ?? 1}
                        onChange={(v) => onChange({ layoutWeights: { ...settings.layoutWeights, [style]: v } })}
                        min={1}
                        max={10}
                        step={1}
                        unit=""
                      />
                    ))}
                  </div>
                )}
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
              </div>
            </div>
          </details>
        );
      case 'Fonts':
        return (
          <details key={id} className="group mb-2 border border-zinc-800 rounded-md overflow-hidden">
            {summary('Fonts')}
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
                <div className="flex items-center justify-between">
                  <label className="text-[9px] text-zinc-500 font-mono uppercase">Selected Fonts</label>
                  <div className="flex items-center gap-2">
                    <button onClick={selectAllFonts} className="text-[8px] text-zinc-400 hover:text-white uppercase flex items-center gap-1 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 transition-colors">
                      <ListChecks size={10} /> Select All
                    </button>
                    <button onClick={randomizeFont} className="text-[8px] text-zinc-400 hover:text-white uppercase flex items-center gap-1 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 transition-colors">
                      <RotateCw size={10} /> Random
                    </button>
                  </div>
                </div>
                <div className="relative" ref={fontDropdownRef}>
                  <button
                    onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
                    className="w-full bg-[#080808] border border-zinc-800 rounded-md p-2 text-[11px] text-white flex items-center justify-between hover:border-zinc-700 transition-colors"
                  >
                    <span>{settings.primaryFont || 'Inter'}</span>
                    <ChevronDown size={12} className={`transition-transform ${isFontDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isFontDropdownOpen && (
                    <div className="absolute z-[100] w-full mt-1 bg-[#121212] border border-zinc-800 rounded-md shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                      {ALL_FONTS.map(font => {
                        const isSelected = settings.fontMultiSelect 
                          ? (settings.fonts || []).includes(font)
                          : settings.primaryFont === font;
                        
                        return (
                          <div
                            role="button"
                            key={font}
                            onClick={() => {
                              if (settings.fontMultiSelect) {
                                const currentFonts = settings.fonts || [];
                                const newFonts = currentFonts.includes(font)
                                  ? currentFonts.filter(f => f !== font)
                                  : [...currentFonts, font];
                                onChange({ fonts: newFonts });
                              } else {
                                onChange({ primaryFont: font, fonts: [font] });
                                setIsFontDropdownOpen(false);
                              }
                            }}
                            className={`w-full px-3 py-2 text-left text-[11px] hover:bg-zinc-800 flex items-center justify-between transition-colors cursor-pointer ${isSelected ? 'bg-indigo-600/20 text-indigo-400' : 'text-zinc-300'}`}
                          >
                            <div className="flex items-center gap-2">
                              {isSelected && <Check size={12} className="text-indigo-500" />}
                              <span className="font-sans">{font}</span>
                            </div>
                            <span style={{ fontFamily: font }} className="text-[14px]">Shay</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] text-zinc-500 font-mono uppercase">Font Weight</label>
                <select
                  value={settings.fontWeight || '900'}
                  onChange={(e) => onChange({ fontWeight: e.target.value })}
                  className="bg-[#080808] border border-zinc-800 rounded-md p-2 text-[11px] text-white outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                >
                  <option value="random">Random</option>
                  <option value="100">100 - Thin</option>
                  <option value="300">300 - Light</option>
                  <option value="400">400 - Regular</option>
                  <option value="700">700 - Bold</option>
                  <option value="900">900 - Black</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[9px] text-zinc-500 font-mono uppercase">Text Case</label>
                <select
                  value={settings.textCase || 'original'}
                  onChange={(e) => onChange({ textCase: e.target.value as any })}
                  className="bg-[#080808] border border-zinc-800 rounded-md p-2 text-[11px] text-white outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                >
                  <option value="original">Original</option>
                  <option value="uppercase">Uppercase</option>
                  <option value="lowercase">Lowercase</option>
                  <option value="random">Random</option>
                </select>
              </div>

              <ProSlider
                label="Line Height"
                value={settings.lineHeight || 1}
                onChange={(v) => onChange({ lineHeight: v })}
                min={0.5}
                max={2}
                step={0.1}
                unit=""
              />
            </div>
          </details>
        );
      case 'Colors':
        return (
          <details key={id} className="group mb-2 border border-zinc-800 rounded-md overflow-hidden">
            {summary('Colors')}
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
          </details>
        );
      case 'Advanced':
        return (
          <details key={id} className="group mb-2 border border-zinc-800 rounded-md overflow-hidden">
            {summary('Advanced')}
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
                </div>

                {(settings.keepPastInCollage || settings.keepPastInKaraoke || settings.keepPastInPop) && (
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
          </details>
        );
      case 'BoundingBox':
        return (
          <details key={id} className="group mb-2 border border-zinc-800 rounded-md overflow-hidden">
            {summary('Bounding Box')}
            <div className="p-3 flex flex-col gap-5 bg-black/20">
              <div className="flex gap-2">
                <button 
                  onClick={snapToScreen}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[9px] font-bold uppercase rounded border border-zinc-700 transition-colors"
                >
                  <Maximize2 size={12} /> Snap to Screen
                </button>
                <button 
                  onClick={snapToClip}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[9px] font-bold uppercase rounded border border-zinc-700 transition-colors"
                >
                  <Target size={12} /> Snap to Clip
                </button>
              </div>
              <div className="flex items-center justify-between bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-[10px] font-black text-zinc-300 uppercase tracking-tighter">Show Bounding Box</span>
                <button 
                  onClick={() => onChange({ showBox: !settings.showBox })}
                  className={`w-9 h-5 rounded-full transition-all relative ${settings.showBox ? 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.showBox ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </details>
        );
    }
  };

  return (
    <div className="flex flex-col gap-3 pb-4">
      {tabOrder.map(id => renderTab(id))}

      <div className="mt-4 px-1">
        <button 
          onClick={() => applySettingsToAllKineticBlocks(settings)}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
        >
          Apply to all blocks in project
        </button>
      </div>
    </div>
  );
};
