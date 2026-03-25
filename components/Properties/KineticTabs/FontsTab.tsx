import React from 'react';
import { Check, ChevronDown, ListChecks, RotateCw } from 'lucide-react';
import { KineticSettings } from '../../../types/kinetic';
import { ProSlider } from '../../UI/ProSlider';

interface FontsTabProps {
  settings: KineticSettings;
  onChange: (updates: Partial<KineticSettings>) => void;
}

const ALL_FONTS = ['Inter', 'Roboto', 'Montserrat', 'Oswald', 'Poppins', 'Playfair Display', 'Rubik', 'Lora', 'Merriweather', 'Nunito'];

export const FontsTab = ({ settings, onChange }: FontsTabProps) => {
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

  const selectAllFonts = () => {
    onChange({ fonts: [...ALL_FONTS], fontMultiSelect: true });
  };

  const randomizeFont = () => {
    const otherFonts = ALL_FONTS.filter(f => f !== settings.primaryFont);
    const random = otherFonts[Math.floor(Math.random() * otherFonts.length)];
    onChange({ primaryFont: random, fonts: [random], fontMultiSelect: false });
  };

  return (
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
  );
};
