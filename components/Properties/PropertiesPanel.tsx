import React, { useState, useEffect } from 'react';
import { Type, Palette, Settings2, ChevronDown, ChevronRight, Layers, MonitorPlay, Ghost, Sun } from 'lucide-react';
import { ProSlider } from '../UI/ProSlider';

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
      <div className="w-72 bg-[#121212] border-l border-zinc-800/50 flex flex-col p-6 items-center justify-center text-zinc-600">
        <Settings2 size={32} className="mb-4 opacity-20" />
        <p className="text-[10px] font-mono uppercase tracking-widest opacity-50">No Selection</p>
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
        undefined, // scaleX
        undefined, // scaleY
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

  const Section = ({ id, title, icon: Icon, children }: any) => (
    <div className="border-b border-zinc-800/50">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-900/50 transition-colors group"
        onClick={() => toggleSection(id)}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={12} className="text-zinc-500 group-hover:text-zinc-300" />}
          <span className="text-[10px] font-black uppercase text-zinc-500 group-hover:text-zinc-300 tracking-wider">{title}</span>
        </div>
        {(sections as any)[id] ? <ChevronDown size={12} className="text-zinc-600" /> : <ChevronRight size={12} className="text-zinc-600" />}
      </div>
      {(sections as any)[id] && <div className="p-4 pt-0 flex flex-col gap-4">{children}</div>}
    </div>
  );

  return (
    <div className="w-72 bg-[#121212] border-l border-zinc-800/50 flex flex-col overflow-y-auto custom-scrollbar flex-shrink-0">
      <div className="p-4 border-b border-zinc-800/50 bg-[#121212] sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-1">
          {isSubtitle ? <Type size={14} className="text-indigo-400" /> : <MonitorPlay size={14} className="text-emerald-400" />}
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
            {isSubtitle ? 'Text' : 'Video'} Properties
          </h2>
        </div>
        <p className="text-[9px] font-mono text-zinc-600 truncate">{selectedClip.id}</p>
      </div>

      {/* Text Section (Subtitles Only) */}
      {isSubtitle && (
        <Section id="text" title="Text Content" icon={Type}>
          <textarea
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={() => updateClip({ content: editingText }, true)}
            className="bg-[#080808] border border-zinc-800 rounded p-2 text-xs text-white resize-y min-h-[80px] focus:border-indigo-500 outline-none block w-full font-sans"
            placeholder="Enter text..."
          />
          <div className="flex items-center gap-2">
             <input 
               type="checkbox" 
               checked={applyToAll} 
               onChange={(e) => setApplyToAll(e.target.checked)}
               className="rounded bg-zinc-900 border-zinc-700 text-indigo-500 focus:ring-0"
             />
             <span className="text-[9px] uppercase font-bold text-zinc-500">Apply to Track</span>
          </div>
        </Section>
      )}

      {/* Style Section (Subtitles Only) */}
      {isSubtitle && (
        <Section id="style" title="Appearance" icon={Palette}>
           <div className="grid grid-cols-2 gap-4">
             <div className="flex flex-col gap-1">
                <label className="text-[9px] text-zinc-500 font-mono uppercase">Font</label>
                <select 
                  value={selectedClip.font || 'Inter, sans-serif'}
                  onChange={(e) => updateClip({ font: e.target.value }, true)}
                  className="bg-[#080808] border border-zinc-800 rounded p-1 text-[10px] text-white outline-none"
                >
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Courier New', monospace">Courier</option>
                  <option value="'Impact', sans-serif">Impact</option>
                </select>
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[9px] text-zinc-500 font-mono uppercase">Color</label>
                <div className="flex items-center gap-2 bg-[#080808] border border-zinc-800 rounded p-1 h-[26px] relative overflow-hidden">
                  <input
                    type="color"
                    value={selectedClip.color || '#ffffff'}
                    onChange={(e) => updateClip({ color: e.target.value }, true)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                  <div className="w-4 h-4 rounded-sm border border-white/10" style={{ backgroundColor: selectedClip.color || '#ffffff' }} />
                  <span className="text-[9px] font-mono text-zinc-400">{selectedClip.color || '#fff'}</span>
                </div>
             </div>
           </div>
        </Section>
      )}

      {/* Transform Section (All Visual Clips) */}
      {isVisual && (
        <Section id="transform" title="Transform" icon={Layers}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ProSlider 
                label="Position X" 
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
                label="Position Y" 
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
            
            <div className="grid grid-cols-2 gap-4">
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

      {/* Effects Section (Disabled / Placeholder) */}
      {isVisual && (
        <Section id="effects" title="Effects" icon={Ghost}>
          <div className="space-y-4 opacity-50 pointer-events-none grayscale">
             <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Sun size={10} />
                      <span className="text-[10px] uppercase font-mono">Opacity</span>
                   </div>
                   <span className="text-[9px] bg-zinc-800 px-1 rounded">100%</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full w-full overflow-hidden">
                   <div className="h-full bg-zinc-600 w-full" />
                </div>
             </div>
             <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Ghost size={10} />
                      <span className="text-[10px] uppercase font-mono">Shadow</span>
                   </div>
                   <span className="text-[9px] bg-zinc-800 px-1 rounded">OFF</span>
                </div>
             </div>
             <div className="text-[9px] text-zinc-600 text-center italic pt-2">
                Advanced effects coming in v2.1
             </div>
          </div>
        </Section>
      )}
    </div>
  );
};
