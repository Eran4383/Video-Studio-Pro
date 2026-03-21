
import React, { useState, useEffect, useCallback } from 'react';
import { Library } from './components/AssetLibrary/Library';
import { Timeline } from './components/Timeline/Timeline';
import { PreviewPlayer } from './components/Preview/PreviewPlayer';
import { ShortcutModal } from './components/Shortcuts/ShortcutModal';
import { ExportModal } from './components/Export/ExportModal';
import { Tooltip } from './components/UI/Tooltip';
import { useProjectStore } from './store/useProjectStore';
import { useShortcutStore } from './store/useShortcutStore';
import { GeminiService } from './services/geminiService';
import { ErrorReportingService } from './services/ErrorReportingService';
import { TranscriptionModal } from './components/Transcription/TranscriptionModal';
import { TranscriptionProgress } from './components/Transcription/TranscriptionProgress';
import { DiagnosticsModal } from './components/Diagnostics/DiagnosticsModal';
import { VERSION } from './config/version';
import { PropertiesPanel } from './components/Properties/PropertiesPanel';
import { Settings, Download, Layers, Palette, Type as TypeIcon, Scissors, Music, Keyboard, Bug, Captions, Maximize, FileText, Trash2 } from 'lucide-react';
import { MediaType, Asset } from './types';
import { parseSRT } from './utils/srtParser';
import { ResolutionSwitcher } from './components/ProjectSettings/ResolutionSwitcher';

// Initialize Error Reporting on App Load
ErrorReportingService.init();

const App: React.FC = () => {
  const store = useProjectStore();
  const shortcutStore = useShortcutStore();
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [transcriptionState, setTranscriptionState] = useState({
    isOpen: false,
    isMinimized: false,
    isProcessing: false,
    status: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if ((isExportModalOpen || transcriptionState.isOpen) && store.isPlaying) {
      store.setIsPlaying(false);
    }
  }, [isExportModalOpen, transcriptionState.isOpen]);

  const handleTranscriptionStart = () => {
    setTranscriptionState(prev => ({ ...prev, isProcessing: true, status: 'Initializing...' }));
  };

  const handleTranscriptionUpdate = (status: string) => {
    setTranscriptionState(prev => ({ ...prev, status }));
  };

  const handleTranscriptionComplete = () => {
    setTranscriptionState({ isOpen: false, isMinimized: false, isProcessing: false, status: '' });
  };

  const handleTranscriptionClose = () => {
    if (transcriptionState.isProcessing) {
      // If processing, just minimize instead of closing completely? 
      // Or confirm cancellation. For now, let's allow minimizing.
      setTranscriptionState(prev => ({ ...prev, isOpen: false, isMinimized: true }));
    } else {
      setTranscriptionState(prev => ({ ...prev, isOpen: false }));
    }
  };


  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    
    // Frame Stepping with Arrow Keys
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        store.setCurrentTime(Math.max(0, store.currentTime - (1 / store.project.fps)));
        return;
    }
    if (e.key === 'ArrowRight') {
        e.preventDefault();
        store.setCurrentTime(store.currentTime + (1 / store.project.fps));
        return;
    }

    if (e.code === 'KeyF') {
        e.preventDefault();
        handleDoubleClick();
        return;
    }

    const action = shortcutStore.getAction(e);
    if (!action) return;
    if (action === 'redo') { store.redo(); e.preventDefault(); return; }
    e.preventDefault();
    switch (action) {
      case 'play_pause': store.setIsPlaying(!store.isPlaying); break;
      case 'split': store.splitClip(store.selectedClipIds[0], store.currentTime); break;
      case 'delete': store.deleteSelectedClips(); break;
      case 'undo': store.undo(); break;
      case 'zoom_in': store.setZoom(Math.min(100, store.zoom + 5)); break;
      case 'zoom_out': store.setZoom(Math.max(1, store.zoom - 5)); break;
      case 'toggle_magnet': store.setIsMagnetEnabled(!store.isMagnetEnabled); break;
    }
  }, [store, shortcutStore]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleAICompose = async () => {
    const aistudio = (window as any).aistudio;
    if (typeof aistudio !== 'undefined') {
      try { const hasKey = await aistudio.hasSelectedApiKey(); if (!hasKey) await aistudio.openSelectKey(); } catch (err) {}
    }
    const userInput = window.prompt("Describe your scene prompt:");
    if (!userInput) return;
    setIsGenerating(true);
    try {
      const videoUrl = await GeminiService.getInstance().generateVideo(userInput);
      const newAsset: Asset = { 
        id: `ai-${Date.now()}`, 
        name: `AI Gen: ${userInput.substring(0, 10)}`, 
        type: MediaType.VIDEO, 
        url: videoUrl, 
        duration: 5, 
        thumbnail: 'https://picsum.photos/320/180' 
      };
      store.addAsset(newAsset);
      store.addClipAtPosition('track-v1', newAsset, store.currentTime);
    } catch (error) {
      alert("AI Generation failed. Check API configuration.");
    } finally { setIsGenerating(false); }
  };

  const handleGenerateReport = () => {
    ErrorReportingService.generateFullReport(store.project, store.assets, {});
  };

  const handleAssetToTimeline = (asset: Asset) => {
    const targetTrackId = asset.type === MediaType.AUDIO ? 
      (store.project.tracks.find(t => t.type === 'audio')?.id || 'track-a1') : 
      (store.project.tracks.find(t => t.type === 'video')?.id || 'track-v1');
    store.addClipAtPosition(targetTrackId, asset, store.currentTime);
  };

  const handleImportSubtitles = async (file: File) => {
    try {
      const text = await file.text();
      const items = parseSRT(text);
      if (items.length === 0) {
        alert("No subtitles found in the selected file. Please check the SRT format.");
        return;
      }
      store.importSubtitles(items);
    } catch (err) {
      console.error("Failed to parse SRT", err);
      alert("Failed to parse SRT file.");
    }
  };

  const handleDoubleClick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const selectedClip = store.project.tracks.flatMap(t => t.clips).find(c => c.id === store.selectedClipIds[0]);
  const selectedAsset = selectedClip ? store.assets.find(a => a.id === selectedClip.assetId) : null;

  return (
    <div 
      className="h-screen flex flex-col bg-[#080808] text-zinc-200 select-none overflow-hidden font-inter"
      onDoubleClick={(e) => {
        // Only toggle if clicking on empty space (not buttons, inputs, etc)
        if (e.target === e.currentTarget) {
           handleDoubleClick();
        }
      }}
    >
      <header className="h-12 bg-[#121212] border-b border-zinc-800/50 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-black shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform">NX</div>
            <h1 className="text-sm font-black tracking-tighter uppercase flex items-center gap-2">
              Nexus <span className="text-zinc-600 font-medium">Studio</span>
              <span className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-md font-mono border border-zinc-700/50">v{VERSION}</span>
            </h1>
          </div>
          <div className="h-6 w-px bg-zinc-800/50 mx-2" />
          <ResolutionSwitcher store={store} />
        </div>
        <div className="flex items-center gap-2">
          <Tooltip text="Toggle Fullscreen" position="bottom" shortcut="F">
             <button onClick={handleDoubleClick} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all">
               <Maximize size={18} />
             </button>
          </Tooltip>
          <Tooltip text="Clear Memory Cache" position="bottom">
            <button 
              onClick={() => {
                if (window.confirm("Clear memory cache? This will reload the page to free up memory.")) {
                  window.location.reload();
                }
              }} 
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-orange-400 transition-all flex items-center gap-2"
            >
              <Trash2 size={18} /> <span className="text-[10px] font-bold">CLEAR MEM</span>
            </button>
          </Tooltip>
          <Tooltip text="Generate Debug Report" position="bottom">
            <button onClick={handleGenerateReport} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-red-400 transition-all flex items-center gap-2">
              <Bug size={18} /> <span className="text-[10px] font-bold">REPORT ERROR</span>
            </button>
          </Tooltip>
          <Tooltip text="Export Subtitles (SRT)" position="bottom">
            <button 
              onClick={() => {
                const subtitleTrack = store.project.tracks.find(t => t.type === 'subtitle');
                if (!subtitleTrack || subtitleTrack.clips.length === 0) {
                  alert("No subtitles found to export.");
                  return;
                }
                
                // Sort clips by start time
                const clips = [...subtitleTrack.clips].sort((a, b) => a.startTime - b.startTime);
                
                let srtContent = "";
                clips.forEach((clip, index) => {
                  const formatTime = (seconds: number) => {
                    const h = Math.floor(seconds / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    const s = Math.floor(seconds % 60);
                    const ms = Math.floor((seconds % 1) * 1000);
                    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
                  };
                  
                  srtContent += `${index + 1}\n`;
                  srtContent += `${formatTime(clip.startTime)} --> ${formatTime(clip.startTime + clip.duration)}\n`;
                  srtContent += `${clip.content || ""}\n\n`;
                });
                
                const blob = new Blob([srtContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${store.project.name.toLowerCase().replace(/\s+/g, '_')}_subtitles.srt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }} 
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all"
            >
              <FileText size={18} />
            </button>
          </Tooltip>
          <Tooltip text="Keyboard Mapping" position="bottom" shortcut="K">
            <button onClick={() => setIsShortcutModalOpen(true)} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all"><Keyboard size={18} /></button>
          </Tooltip>
          <Tooltip text="Render MP4" position="bottom">
            <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black px-6 py-2 rounded-full transition-all active:scale-95 shadow-lg shadow-indigo-600/30 tracking-widest">
              <Download size={14} /> EXPORT MP4
            </button>
          </Tooltip>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-14 bg-[#121212] border-r border-zinc-800/50 flex flex-col items-center py-6 gap-8">
          <Tooltip text="Asset Layers" position="right"><button className="text-indigo-500 p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 transition-all"><Layers size={22} /></button></Tooltip>
          <Tooltip text="Color & Grading" position="right"><button className="text-zinc-600 hover:text-indigo-400 transition-all"><Palette size={22} /></button></Tooltip>
          <Tooltip text="Titles & GFX" position="right"><button onClick={() => store.addSubtitleClip()} className="text-zinc-600 hover:text-indigo-400 transition-all"><TypeIcon size={22} /></button></Tooltip>
          <Tooltip text="AI Captions" position="right"><button onClick={() => setTranscriptionState(prev => ({ ...prev, isOpen: true, isMinimized: false }))} className="text-zinc-600 hover:text-indigo-400 transition-all"><Captions size={22} /></button></Tooltip>
          <Tooltip text="Razor Tool" position="right" shortcut="S/B"><button className="text-zinc-600 hover:text-indigo-400 transition-all" onClick={() => store.splitClip(store.selectedClipIds[0], store.currentTime)}><Scissors size={22} /></button></Tooltip>
          
          <div className="flex-1" />
          <Tooltip text="Keyboard Shortcuts" position="right"><button onClick={() => setIsShortcutModalOpen(true)} className="text-zinc-600 hover:text-indigo-400 transition-all"><Keyboard size={22} /></button></Tooltip>
          <Tooltip text="System Diagnostics" position="right"><button onClick={() => setIsDiagnosticsModalOpen(true)} className="text-zinc-600 hover:text-indigo-400 transition-all"><Bug size={22} /></button></Tooltip>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="h-[55%] flex border-b border-zinc-800/50">
            <Library assets={store.assets} onAddAsset={store.addAsset} onGenerateAI={handleAICompose} onDragAssetToTimeline={handleAssetToTimeline} />
            <PreviewPlayer store={store} />
            <PropertiesPanel store={store} />
          </div>
            <Timeline 
              project={store.project} assets={store.assets} currentTime={store.currentTime} zoom={store.zoom} isMagnetEnabled={store.isMagnetEnabled}
              setZoom={store.setZoom} setIsMagnetEnabled={store.setIsMagnetEnabled} onTimeChange={store.setCurrentTime}
              onClipMove={store.moveClip} onClipResize={store.resizeClip} onClipFinalize={store.finalizeMove} onClipSplit={store.splitClip} onClipDelete={store.deleteClip}
              onToggleTrack={store.toggleTrackProperty} onSetTrackHeight={store.setTrackHeight} onAddClipAtPosition={store.addClipAtPosition} onAddTrack={store.addTrack} onDeleteTrack={store.deleteTrack}
              onDetachAudio={store.detachAudio} onUndo={store.undo} onRedo={store.redo} canUndo={store.canUndo} canRedo={store.canRedo}
              selectedClipIds={store.selectedClipIds} onSelectClip={store.selectClip} onSelectClips={store.selectClips}
              onSelectAllTrack={(trackId: string) => {
                const track = store.project.tracks.find(t => t.id === trackId);
                if (track) {
                  store.selectClips(track.clips.map(c => c.id));
                }
              }}
              onAddAsset={store.addAsset}
              onSyncToAnchors={store.syncClipsToAnchors}
              onImportSubtitles={handleImportSubtitles}
              showAudioMonitor={store.showAudioMonitor}
              onToggleAudioMonitor={() => store.setShowAudioMonitor(!store.showAudioMonitor)}
            />
        </div>
      </main>
      
      {isShortcutModalOpen && <ShortcutModal shortcuts={shortcutStore.shortcuts} onUpdate={shortcutStore.updateShortcut} onClose={() => setIsShortcutModalOpen(false)} />}
      {isExportModalOpen && <ExportModal project={store.project} assets={store.assets} onClose={() => setIsExportModalOpen(false)} />}
      {isDiagnosticsModalOpen && <DiagnosticsModal onClose={() => setIsDiagnosticsModalOpen(false)} project={store.project} assets={store.assets} />}
      
      {transcriptionState.isOpen && !transcriptionState.isMinimized && (
        <TranscriptionModal 
          assets={store.assets} 
          project={store.project} 
          selectedClipId={store.selectedClipIds[0]} 
          onClose={handleTranscriptionClose}
          onMinimize={() => setTranscriptionState(prev => ({ ...prev, isMinimized: true, isOpen: false }))}
          onAddTrack={store.addTrack}
          onAddClips={store.addClips}
          onStart={handleTranscriptionStart}
          onUpdate={handleTranscriptionUpdate}
          onComplete={handleTranscriptionComplete}
        />
      )}

      <TranscriptionProgress 
        status={transcriptionState.status}
        isMinimized={transcriptionState.isMinimized}
        onToggleMinimize={() => setTranscriptionState(prev => ({ ...prev, isMinimized: false, isOpen: true }))}
        onClose={() => setTranscriptionState(prev => ({ ...prev, isMinimized: false, isProcessing: false }))}
      />

      {isGenerating && (<div className="fixed inset-0 bg-black/95 z-[500] flex flex-col items-center justify-center animate-in fade-in duration-500"><div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6" /><h3 className="text-xl font-black uppercase tracking-tighter">AI Synthesis...</h3></div>)}
    </div>
  );
};

export default App;
