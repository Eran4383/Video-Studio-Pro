import React, { useState, useEffect } from 'react';
import { Type, Palette, Settings2, ChevronDown, ChevronRight, Layers, MonitorPlay, Ghost, Sun, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from 'lucide-react';
import { ProSlider } from '../UI/ProSlider';
import { ResolutionSwitcher } from '../ProjectSettings/ResolutionSwitcher';

const Section = ({ id, title, icon: Icon, isOpen, onToggle, children }: any) => (
  <div className="border-b border-zinc-800/50">
    <div 
      className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-900/50 transition-colors group select-none"
      onClick={() => onToggle(id)}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon size={12} className="text-zinc-500 group-hover:text-zinc-300" />}
        <span className="text-[10px] font-black uppercase text-zinc-500 group-hover:text-zinc-300 tracking-wider">{title}</span>
      </div>
      {isOpen ? <ChevronDown size={12} className="text-zinc-600" /> : <ChevronRight size={12} className="text-zinc-600" />}
    </div>
    {isOpen && <div className="p-4 pt-0 flex flex-col gap-4 animate-in slide-in-from-top-1 duration-200">{children}</div>}
  </div>
);

export const PropertiesPanel: React.FC<{ store: any }> = ({ store }) => {
  const { selectedClipIds, project, setProject, finalizeMove, updateSubtitle, applyToAll, setApplyToAll } = store;
  
  const primaryClipId = selectedClipIds[0];
  const selectedClip = project.tracks.flatMap((t: any) => t.clips).find((c: any) => c.id === primaryClipId);
  const track = project.tracks.find((t: any) => t.clips.some((c: any) => c.id === primaryClipId));
  const isSubtitle = track?.type === 'subtitle';
  const isVisual = track?.type === 'video' || track?.type === 'image' || isSubtitle;

  const [sections, setSections] = useState({ transform: true, text: true, style: true, effects: true });
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    if (selectedClip && isSubtitle) setEditingText(selectedClip.content || '');
  }, [selectedClip?.id, isSubtitle]);

  if (!selectedClip) {
    return (
      <div className="w-80 bg-[#121212] border-l border-zinc-800/50 flex flex-col overflow-y-auto custom-scrollbar flex-shrink-0 h-full">
        <div className="p-4 border-b border-zinc-800/50 bg-[#121212] sticky top-0 z-10">
          <div className="flex items-center gap-2 mb-1">
            <Settings2 size={14} className="text-zinc-400" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Project Settings</h2>
          </div>
          <p className="text-[9px] font-mono text-zinc-600 truncate opacity-50">Global Configuration</p>
        </div>

        <Section id="project" title="Canvas" icon={MonitorPlay} isOpen={true} onToggle={() => {}}>
           <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                 <label className="text-[9px] text-zinc-500 font-mono uppercase">Resolution</label>
                 <ResolutionSwitcher store={store} />
              </div>

              <div className="flex flex-col gap-1.5">
                 <label className="text-[9px] text-zinc-500 font-mono uppercase">Background Color</label>
                 <div className="flex items-center gap-2 bg-[#080808] border border-zinc-800 rounded-md p-1 relative overflow-hidden group hover:border-zinc-700 transition-colors">
                   <input
                     type="color"
                     value={project.backgroundColor || '#000000'}
                     onChange={(e) => store.setBackgroundColor(e.target.value)}
                     className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                   />
                   <div className="w-6 h-6 rounded border border-white/10 shadow-sm" style={{ backgroundColor: project.backgroundColor || '#000000' }} />
                   <span className="text-[10px] font-mono text-zinc-400 group-hover:text-white transition-colors">{project.backgroundColor || '#000000'}</span>
                 </div>
              </div>
           </div>
        </Section>
      </div>
    );
  }

  const updateClip = (updates: any, finalize: boolean = false) => {
    if (isSubtitle) {
      updateSubtitle(
        primaryClipId, 
        updates.content, 
        updates.position, 
        applyToAll, 
        updates.color, 
        updates.font, 
        updates.scale, 
        updates.rotation,
        updates.scaleX, 
        updates.scaleY, 
        updates.opacity, 
        updates.shadow, 
        updates.fontWeight, 
        updates.textAlign, 
        finalize
      );
    } else {
      setProject((prev: any) => ({
        ...prev,
        tracks: prev.tracks.map((t: any) => ({
          ...t,
          clips: t.clips.map((c: any) => {
            if (c.id === primaryClipId) return { ...c, ...updates };
            return c;
          })
        }))
      }));
      if (finalize) finalizeMove();
    }
  };

  const toggleSection = (key: string) => setSections(p => ({ ...p, [key]: !p[key] } as any));

  return (
    <div className="w-80 bg-[#121212] border-l border-zinc-800/50 flex flex-col overflow-y-auto custom-scrollbar flex-shrink-0 h-full">
      <div className="p-4 border-b border-zinc-800/50 bg-[#121212] sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-1">
          {isSubtitle ? <Type size={14} className="text-indigo-400" /> : <MonitorPlay size={14} className="text-emerald-400" />}
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
            {isSubtitle ? 'Text' : 'Video'} Properties
          </h2>
        </div>
        <p className="text-[9px] font-mono text-zinc-600 truncate opacity-50">{selectedClip.id}</p>
      </div>

      {/* Text Section (Subtitles Only) */}
      {isSubtitle && (
        <Section id="text" title="Text Content" icon={Type} isOpen={sections.text} onToggle={toggleSection}>
          <div className="flex flex-col gap-3">
            <textarea
              value={editingText}
              onChange={(e) => {
                setEditingText(e.target.value);
                // Live update for text content
                updateClip({ content: e.target.value }, false);
              }}
              onBlur={() => updateClip({ content: editingText }, true)}
              className="bg-[#080808] border border-zinc-800 rounded-lg p-3 text-xs text-white resize-y min-h-[100px] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none block w-full font-sans transition-all placeholder:text-zinc-700"
              placeholder="Enter subtitle text..."
            />
            
            <div className="flex items-center justify-between bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
               <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="applyToAll"
                    checked={applyToAll} 
                    onChange={(e) => setApplyToAll(e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-indigo-500 focus:ring-0 w-3 h-3 cursor-pointer"
                  />
                  <label htmlFor="applyToAll" className="text-[9px] uppercase font-bold text-zinc-500 cursor-pointer select-none hover:text-zinc-300 transition-colors">Apply Style to Track</label>
               </div>
            </div>
          </div>
        </Section>
      )}

      {/* Style Section (Subtitles Only) */}
      {isSubtitle && (
        <Section id="style" title="Typography" icon={Palette} isOpen={sections.style} onToggle={toggleSection}>
           <div className="flex flex-col gap-4">
             <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                   <label className="text-[9px] text-zinc-500 font-mono uppercase">Font Family</label>
                   <select 
                     value={selectedClip.font || 'Inter, sans-serif'}
                     onChange={(e) => updateClip({ font: e.target.value }, true)}
                     className="bg-[#080808] border border-zinc-800 rounded-md p-1.5 text-[10px] text-white outline-none focus:border-indigo-500/50 transition-colors"
                   >
                     <option value="Inter, sans-serif">Inter</option>
                     <option value="Arial, sans-serif">Arial</option>
                     <option value="'Courier New', monospace">Courier New</option>
                     <option value="'Georgia', serif">Georgia</option>
                     <option value="'Impact', sans-serif">Impact</option>
                     <option value="'Comic Sans MS', cursive">Comic Sans</option>
                   </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                   <label className="text-[9px] text-zinc-500 font-mono uppercase">Color</label>
                   <div className="flex items-center gap-2 bg-[#080808] border border-zinc-800 rounded-md p-1 relative overflow-hidden group hover:border-zinc-700 transition-colors">
                     <input
                       type="color"
                       value={selectedClip.color || '#ffffff'}
                       onChange={(e) => updateClip({ color: e.target.value }, true)}
                       className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                     />
                     <div className="w-6 h-6 rounded border border-white/10 shadow-sm" style={{ backgroundColor: selectedClip.color || '#ffffff' }} />
                     <span className="text-[10px] font-mono text-zinc-400 group-hover:text-white transition-colors">{selectedClip.color || '#ffffff'}</span>
                   </div>
                </div>
             </div>

             <div className="flex items-center justify-between bg-zinc-900/30 p-1 rounded-lg border border-zinc-800/50">
                <div className="flex gap-1">
                  <button 
                    onClick={() => updateClip({ textAlign: 'left' }, true)}
                    className={`p-1.5 rounded transition-colors ${selectedClip.textAlign === 'left' ? 'bg-zinc-800 text-white shadow-sm' : 'hover:bg-zinc-800 text-zinc-500 hover:text-white'}`}
                  >
                    <AlignLeft size={12} />
                  </button>
                  <button 
                    onClick={() => updateClip({ textAlign: 'center' }, true)}
                    className={`p-1.5 rounded transition-colors ${(!selectedClip.textAlign || selectedClip.textAlign === 'center') ? 'bg-zinc-800 text-white shadow-sm' : 'hover:bg-zinc-800 text-zinc-500 hover:text-white'}`}
                  >
                    <AlignCenter size={12} />
                  </button>
                  <button 
                    onClick={() => updateClip({ textAlign: 'right' }, true)}
                    className={`p-1.5 rounded transition-colors ${selectedClip.textAlign === 'right' ? 'bg-zinc-800 text-white shadow-sm' : 'hover:bg-zinc-800 text-zinc-500 hover:text-white'}`}
                  >
                    <AlignRight size={12} />
                  </button>
                </div>
                <div className="w-px h-4 bg-zinc-800" />
                <div className="flex gap-1">
                  <button 
                    onClick={() => updateClip({ fontWeight: selectedClip.fontWeight === 'bold' ? 'normal' : 'bold' }, true)}
                    className={`p-1.5 rounded transition-colors ${selectedClip.fontWeight === 'bold' ? 'bg-zinc-800 text-white shadow-sm' : 'hover:bg-zinc-800 text-zinc-500 hover:text-white'}`}
                  >
                    <Bold size={12} />
                  </button>
                  <button className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"><Italic size={12} /></button>
                  <button className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"><Underline size={12} /></button>
                </div>
             </div>
           </div>
        </Section>
      )}

      {/* Transform Section (All Visual Clips) */}
      {isVisual && (
        <Section id="transform" title="Transform" icon={Layers} isOpen={sections.transform} onToggle={toggleSection}>
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-zinc-500 font-mono uppercase">Position</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ProSlider 
                  label="X" 
                  value={(selectedClip.position?.x ?? 0.5) * 100} 
                  onChange={(v) => updateClip({ position: { ...selectedClip.position, x: v / 100 } }, true)}
                  previewId="posX"
                  clipId={selectedClip.id}
                  min={0}
                  max={100}
                  step={0.1}
                  unit="%"
                />
                <ProSlider 
                  label="Y" 
                  value={(selectedClip.position?.y ?? 0.9) * 100} 
                  onChange={(v) => updateClip({ position: { ...selectedClip.position, y: v / 100 } }, true)}
                  previewId="posY"
                  clipId={selectedClip.id}
                  min={0}
                  max={100}
                  step={0.1}
                  unit="%"
                />
              </div>
            </div>
            
            <div className="h-px bg-zinc-800/50" />

            <div className="space-y-3">
              <ProSlider 
                label="Scale" 
                value={(selectedClip.scale ?? 1) * 100} 
                onChange={(v) => updateClip({ scale: v / 100, scaleX: v / 100, scaleY: v / 100 }, true)}
                previewId="scale"
                clipId={selectedClip.id}
                min={0}
                max={300}
                step={1}
                unit="%"
              />
              <ProSlider 
                label="Rotation" 
                value={selectedClip.rotation ?? 0} 
                onChange={(v) => updateClip({ rotation: v }, true)}
                previewId="rotation"
                clipId={selectedClip.id}
                min={-180}
                max={180}
                step={1}
                unit="°"
              />
            </div>
          </div>
        </Section>
      )}

      {/* Effects Section */}
      {isVisual && (
        <Section id="effects" title="Effects" icon={Ghost} isOpen={sections.effects} onToggle={toggleSection}>
          <div className="space-y-4">
             <div className="flex flex-col gap-2">
                <ProSlider 
                  label="Opacity" 
                  value={(selectedClip.opacity ?? 1) * 100} 
                  onChange={(v) => updateClip({ opacity: v / 100 }, true)}
                  previewId="opacity"
                  clipId={selectedClip.id}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                />
             </div>
             <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Ghost size={12} className="text-zinc-500" />
                      <span className="text-[10px] uppercase font-mono text-zinc-400">Drop Shadow</span>
                   </div>
                   <button 
                      onClick={() => updateClip({ shadow: !selectedClip.shadow }, true)}
                      className={`w-8 h-4 rounded-full relative transition-colors ${selectedClip.shadow ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-zinc-800 border-zinc-700'}`}
                   >
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${selectedClip.shadow ? 'left-4.5 bg-indigo-400' : 'left-0.5 bg-zinc-600'}`} />
                   </button>
                </div>
             </div>
          </div>
        </Section>
      )}
    </div>
  );
};
