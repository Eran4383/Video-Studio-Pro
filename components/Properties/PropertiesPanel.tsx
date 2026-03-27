import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import { Type, Palette, Settings2, ChevronDown, ChevronRight, Box, MonitorPlay, Ghost, Sun, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from 'lucide-react';
import { ProSlider } from '../UI/ProSlider';
import { ResolutionSwitcher } from '../ProjectSettings/ResolutionSwitcher';

import { KineticControls } from './KineticControls';
import { KineticWordEditor } from './KineticWordEditor';

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

export const PropertiesPanel = ({ store }: { store: any }) => {
  const { selectedClipIds, project, setProject, finalizeMove, updateClip: storeUpdateClip, applyToAll, setApplyToAll } = store;
  
  const primaryClipId = selectedClipIds[0];
  const isKineticBlock = primaryClipId?.startsWith('kb-');
  const selectedKineticBlock = isKineticBlock ? project.kineticBlocks?.find((b: any) => b.id === primaryClipId) : null;

  const selectedClips = project.tracks.flatMap((t: any) => t.clips).filter((c: any) => selectedClipIds.includes(c.id));
  const selectedClip = selectedClips.find((c: any) => c.id === primaryClipId);
  const track = project.tracks.find((t: any) => t.clips.some((c: any) => c.id === primaryClipId));
  const isSubtitle = track?.type === 'subtitle';
  const isVisual = track?.type === 'video' || track?.type === 'image' || isSubtitle;

  const allSelectedAreSubtitles = selectedClips.length > 1 && selectedClips.every((c: any) => {
    const t = project.tracks.find((tr: any) => tr.clips.some((cl: any) => cl.id === c.id));
    return t?.type === 'subtitle';
  });

  const [sections, setSections] = useState({ transform: true, text: true, style: true, effects: true });
  const [editingText, setEditingText] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'kinetic'>('basic');
  const quillRef = useRef<any>(null);

  const handleFormatting = (type: 'bold' | 'italic' | 'underline') => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection();
    if (range) {
      if (range.length > 0) {
        const currentFormat = quill.getFormat(range);
        if (type === 'bold') quill.format('bold', !currentFormat.bold);
        if (type === 'italic') quill.format('italic', !currentFormat.italic);
        if (type === 'underline') quill.format('underline', !currentFormat.underline);
      } else {
        // No selection - toggle global property for the whole clip
        if (type === 'bold') updateClip({ fontWeight: selectedClip.fontWeight === 'bold' ? 'normal' : 'bold' }, true);
        if (type === 'italic') updateClip({ isItalic: !selectedClip.isItalic }, true);
        if (type === 'underline') updateClip({ isUnderline: !selectedClip.isUnderline }, true);
      }
    }
  };

  useEffect(() => {
    if (selectedClip && isSubtitle) setEditingText(selectedClip.content || '');
  }, [selectedClip?.id, isSubtitle]);

  if (isKineticBlock && selectedKineticBlock) {
    const isChildBlock = !!selectedKineticBlock.parentId;
    const blockColor = selectedKineticBlock.color || 'rgba(168, 85, 247, 0.3)';
    const panelBgColor = isChildBlock ? blockColor.replace('0.3', '0.5') : '#121212';
    const headerBgColor = isChildBlock ? blockColor.replace('0.3', '0.6') : '#121212';
    const borderColor = isChildBlock ? blockColor.replace('0.3', '0.8') : 'rgba(39, 39, 42, 0.5)';

    return (
      <div 
        className="w-80 flex flex-col overflow-y-auto custom-scrollbar flex-shrink-0 h-full transition-colors duration-200"
        style={{ backgroundColor: panelBgColor, borderLeft: `1px solid ${borderColor}` }}
      >
        <div 
          className="p-4 sticky top-0 z-10 flex items-center justify-between backdrop-blur-md transition-colors duration-200"
          style={{ backgroundColor: headerBgColor, borderBottom: `1px solid ${borderColor}` }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Type size={14} className={isChildBlock ? "text-white" : "text-purple-400"} style={isChildBlock ? { color: blockColor.replace('0.3', '1') } : undefined} />
              <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                {isChildBlock ? `Kinetic Block: ${selectedKineticBlock.name}` : 'Kinetic Block'}
              </h2>
            </div>
            <p className="text-[9px] font-mono text-zinc-600 truncate opacity-50">{selectedKineticBlock.id}</p>
          </div>
          <button 
            onClick={() => store.deleteKineticBlock(selectedKineticBlock.id)}
            className="text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-2 py-1 rounded transition-colors"
          >
            Ungroup
          </button>
        </div>
        <div className="p-2">
          {store.selectedKineticWordId && selectedKineticBlock.words?.length > 0 && (
            <div className="mb-4 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Type size={12} className="text-purple-400" />
                <span className="text-[10px] font-bold uppercase text-purple-300">Editing Word</span>
              </div>
              <KineticWordEditor 
                clipId={selectedKineticBlock.id}
                words={selectedKineticBlock.words.map((w: any) => ({ ...w, ...(selectedKineticBlock.wordOverrides?.[w.id] || {}) }))} 
                selectedWordId={store.selectedKineticWordId}
                onSelectWord={store.setSelectedKineticWordId}
                onUpdateWord={(wordId, updates) => {
                  store.updateWordOverride(selectedKineticBlock.id, wordId, updates);
                }} 
                onResetWord={(wordId) => {
                  store.clearWordOverride(selectedKineticBlock.id, wordId);
                  store.setSelectedKineticWordId(null);
                }}
                onResetProperty={(wordId, property) => {
                  store.clearWordOverrideProperty(selectedKineticBlock.id, wordId, property);
                }}
                settings={selectedKineticBlock.settings}
                overrides={selectedKineticBlock.wordOverrides}
              />
            </div>
          )}
          <KineticControls selectedClip={{ id: selectedKineticBlock.id, kineticData: selectedKineticBlock }} store={store} isBlock={true} />
        </div>
      </div>
    );
  }

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

              <div className="flex flex-col gap-1.5">
                 <label className="text-[9px] text-zinc-500 font-mono uppercase">Waveform Style</label>
                 <select 
                    value={project.waveformStyle || 'solid'}
                    onChange={(e) => store.setWaveformStyle(e.target.value as 'solid' | 'lines')}
                    className="bg-[#080808] border border-zinc-800 rounded-md p-1.5 text-[10px] text-white outline-none focus:border-indigo-500/50 transition-colors"
                  >
                    <option value="solid">Solid (Default)</option>
                    <option value="lines">Lines (Beat-by-Beat)</option>
                  </select>
              </div>

              <div className="flex flex-col gap-1.5">
                 <ProSlider 
                    label="Waveform Scale" 
                    value={(project.waveformScale ?? 1.0) * 100} 
                    onChange={(v) => store.setWaveformScale(v / 100)}
                    min={10}
                    max={1000}
                    step={10}
                    unit="%"
                    defaultValue={100}
                 />
              </div>
           </div>
        </Section>
      </div>
    );
  }

  const updateClip = (updates: any, finalize: boolean = false) => {
    const currentPos = selectedClip.position || { x: 0.5, y: (isSubtitle ? 0.9 : 0.5) };
    const newPos = updates.position !== undefined ? { ...currentPos, ...updates.position } : currentPos;
    
    storeUpdateClip(
      primaryClipId, 
      { ...updates, position: newPos },
      finalize,
      applyToAll
    );
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

      {allSelectedAreSubtitles && (
        <div className="p-4 border-b border-zinc-800/50">
          <button
            onClick={() => {
              const newBlockId = store.createKineticBlock(selectedClipIds);
              if (newBlockId) {
                store.selectClips([newBlockId]);
              } else {
                store.selectClip(null);
              }
            }}
            className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-widest rounded transition-colors"
          >
            Group into Kinetic Block
          </button>
        </div>
      )}

      {isSubtitle && (
        <div className="flex p-2 gap-2 border-b border-zinc-800/50">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${activeTab === 'basic' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Basic
          </button>
          <button
            onClick={() => setActiveTab('kinetic')}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${activeTab === 'kinetic' ? 'bg-zinc-800 text-purple-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Kinetic
          </button>
        </div>
      )}

      {/* Kinetic Tab Content */}
      {isSubtitle && activeTab === 'kinetic' && (
        <div className="p-2">
           {store.selectedKineticWordId && selectedClip.kineticData?.words?.length > 0 && (
             <div className="mb-4 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
               <div className="flex items-center gap-2 mb-2">
                 <Type size={12} className="text-purple-400" />
                 <span className="text-[10px] font-bold uppercase text-purple-300">Editing Word</span>
               </div>
               <KineticWordEditor 
                 clipId={selectedClip.id}
                 words={selectedClip.kineticData.words.map((w: any) => ({ ...w, ...(selectedClip.kineticData.wordOverrides?.[w.id] || {}) }))} 
                 selectedWordId={store.selectedKineticWordId}
                 onSelectWord={store.setSelectedKineticWordId}
                 onUpdateWord={(wordId, updates) => {
                   store.updateKineticWord(selectedClip.id, wordId, updates);
                 }} 
                 settings={selectedClip.kineticData.settings}
               />
             </div>
           )}
           <KineticControls selectedClip={selectedClip} store={store} />
        </div>
      )}

      {/* Basic Tab Content (or non-subtitle) */}
      {(!isSubtitle || activeTab === 'basic') && (
        <>
          {/* Text Section (Subtitles Only) */}
          {isSubtitle && (
            <Section id="text" title="Text Content" icon={Type} isOpen={sections.text} onToggle={toggleSection}>
            <div className="flex flex-col gap-3">
              <div className="quill-container">
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={editingText}
                  onChange={(content) => {
                    setEditingText(content);
                    // Live update for text content
                    updateClip({ content: content }, false);
                  }}
                  onBlur={() => updateClip({ content: editingText }, true)}
                  modules={{
                    toolbar: false
                  }}
                  placeholder="Enter subtitle text..."
                  className="bg-[#080808] border border-zinc-800 rounded-lg text-xs text-white min-h-[100px] focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 outline-none block w-full font-sans transition-all"
                />
              </div>
              
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
                    onClick={() => handleFormatting('bold')}
                    className={`p-1.5 rounded transition-colors ${selectedClip.fontWeight === 'bold' ? 'bg-zinc-800 text-white shadow-sm' : 'hover:bg-zinc-800 text-zinc-500 hover:text-white'}`}
                  >
                    <Bold size={12} />
                  </button>
                  <button 
                    onClick={() => handleFormatting('italic')}
                    className={`p-1.5 rounded transition-colors ${selectedClip.isItalic ? 'bg-zinc-800 text-white shadow-sm' : 'hover:bg-zinc-800 text-zinc-500 hover:text-white'}`}
                  >
                    <Italic size={12} />
                  </button>
                  <button 
                    onClick={() => handleFormatting('underline')}
                    className={`p-1.5 rounded transition-colors ${selectedClip.isUnderline ? 'bg-zinc-800 text-white shadow-sm' : 'hover:bg-zinc-800 text-zinc-500 hover:text-white'}`}
                  >
                    <Underline size={12} />
                  </button>
                </div>
             </div>
           </div>
        </Section>
      )}

      {/* Transform Section (All Visual Clips) */}
      {isVisual && (
        <Section id="transform" title="Transform" icon={Box} isOpen={sections.transform} onToggle={toggleSection}>
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
                  min={-500}
                  max={600}
                  step={0.1}
                  unit="%"
                  defaultValue={50}
                />
                <ProSlider 
                  label="Y" 
                  value={(selectedClip.position?.y ?? (isSubtitle ? 0.9 : 0.5)) * 100} 
                  onChange={(v) => updateClip({ position: { ...selectedClip.position, y: v / 100 } }, true)}
                  previewId="posY"
                  clipId={selectedClip.id}
                  min={-500}
                  max={600}
                  step={0.1}
                  unit="%"
                  defaultValue={isSubtitle ? 90 : 50}
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
                max={1000}
                step={1}
                unit="%"
                defaultValue={100}
              />
              <ProSlider 
                label="Rotation" 
                value={selectedClip.rotation ?? 0} 
                onChange={(v) => updateClip({ rotation: v }, true)}
                previewId="rotation"
                clipId={selectedClip.id}
                min={-3600}
                max={3600}
                step={1}
                unit="°"
                defaultValue={0}
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
                  defaultValue={100}
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
             
             {/* Removed KineticControls from here as it's now in a tab */}
          </div>
        </Section>
      )}
      </>
      )}

    </div>
  );
};
