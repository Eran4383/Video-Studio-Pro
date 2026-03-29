
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Project, Asset, Clip, Effect, MediaType, WAVEFORM_SAMPLES_PER_SECOND } from './types';
import { Library } from './components/AssetLibrary/Library';
import { EffectsSidebar } from './components/AssetLibrary/EffectsSidebar';
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
import { ProjectDashboard } from './components/Dashboard/ProjectDashboard';
import { Settings, Download, Layers, Palette, Type as TypeIcon, Scissors, Music, Keyboard, Bug, Captions, Maximize, FileText, Trash2, Home, ChevronDown, FolderOpen, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseSRT } from './utils/srtParser';
import { ResolutionSwitcher } from './components/ProjectSettings/ResolutionSwitcher';
import { FileMenu } from './components/UI/FileMenu';
import { AssetService } from './services/AssetService';
import { webAudioEngine } from './services/WebAudioEngine';
import { FilePersistenceService } from './services/FilePersistenceService';

// Initialize Error Reporting on App Load
ErrorReportingService.init();

const App = () => {
  const store = useProjectStore();
  const shortcutStore = useShortcutStore();
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [needsRepair, setNeedsRepair] = useState(false);
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

  const decodingAssetsRef = useRef<Set<string>>(new Set());
  const [decodeRetryCount, setDecodeRetryCount] = useState<Record<string, number>>({});

  // Re-decode assets if audioBuffer is missing (e.g. after project import)
  // Also recover blob URLs from IndexedDB if they are dead
  useEffect(() => {
    const assetsToProcess = store.assets.filter(asset => 
      !decodingAssetsRef.current.has(asset.id)
    );

    if (assetsToProcess.length === 0) return;

    assetsToProcess.forEach(async (asset) => {
      // If we've already tried too many times, skip
      if ((decodeRetryCount[asset.id] || 0) > 3) return;

      decodingAssetsRef.current.add(asset.id);
      
      let currentUrl = asset.url;
      let needsUrlUpdate = false;

      // Check if blob URL is dead by attempting a HEAD fetch or just checking if it exists in IDB
      if (currentUrl.startsWith('blob:')) {
        try {
          const resp = await fetch(currentUrl, { method: 'HEAD' });
          if (!resp.ok) throw new Error('Dead blob');
        } catch (err) {
          console.warn(`[App] Detected dead blob URL for asset ${asset.id}. Attempting recovery from IndexedDB...`);
          const file = await FilePersistenceService.getFile(asset.id);
          if (file) {
            currentUrl = URL.createObjectURL(file);
            needsUrlUpdate = true;
            console.log(`[App] Recovered asset ${asset.id} from IndexedDB. New URL: ${currentUrl}`);
          } else {
            console.error(`[App] Could not recover asset ${asset.id} from IndexedDB. User must re-upload.`);
            // Don't remove from decodingAssetsRef so we don't keep retrying a lost cause
            return;
          }
        }
      }

      // If we recovered a new URL, update the store
      if (needsUrlUpdate) {
        store.updateAsset(asset.id, { url: currentUrl });
      }

      // Now handle audio decoding if needed
      const needsAudioDecoding = (asset.type === MediaType.VIDEO || asset.type === MediaType.AUDIO) && 
                                (!asset.audioBuffer || typeof asset.audioBuffer.getChannelData !== 'function');

      if (needsAudioDecoding) {
        try {
          console.log(`[App] Decoding audio for asset: ${asset.name} (${asset.id})`);
          const samples = Math.ceil((asset.duration || 5) * WAVEFORM_SAMPLES_PER_SECOND);
          const result = await AssetService.extractWaveformAndBuffer(currentUrl, samples, asset.id);
          
          if (result.audioBuffer) {
            console.log(`[App] Successfully decoded audio for asset: ${asset.id}`);
            webAudioEngine.cacheBuffer(asset.id, result.audioBuffer);
            store.updateAsset(asset.id, { 
              audioBuffer: result.audioBuffer,
              waveform: asset.waveform && asset.waveform.length > 0 ? asset.waveform : result.waveform
            });
          } else {
            throw new Error("Decoding returned empty buffer");
          }
        } catch (err) {
          console.warn(`[App] Failed to decode audio for asset ${asset.id}:`, err);
          // Remove from decodingAssetsRef so it can be retried if the effect runs again
          decodingAssetsRef.current.delete(asset.id);
          setDecodeRetryCount(prev => ({ ...prev, [asset.id]: (prev[asset.id] || 0) + 1 }));
          setNeedsRepair(true);
        }
      }
    });
  }, [store.assets, store.updateAsset, decodeRetryCount]);

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
    if (
      e.target instanceof HTMLInputElement || 
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLElement && e.target.isContentEditable)
    ) return;
    
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

  const [activePanel, setActivePanel] = useState<'library' | 'effects'>('library');

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
      <header className="h-10 bg-[#0c0c0c] border-b border-zinc-800/30 flex items-center justify-between px-4 z-50 relative">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsDashboardOpen(true)}>
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-[9px] font-black shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform">NX</div>
            <h1 className="text-[11px] font-black tracking-tighter uppercase flex items-center gap-1.5">
              Nexus <span className="text-zinc-600 font-medium">Studio</span>
            </h1>
          </div>
          
          <div className="h-4 w-px bg-zinc-800/50 mx-1" />

          {/* Dashboard Tab */}
          <button 
            onClick={() => setIsDashboardOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700 transition-all group"
          >
            <Home size={12} className="text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-black tracking-widest uppercase text-zinc-400">Dashboard</span>
          </button>

          {/* File Tab */}
          <div className="flex items-center gap-1 group/file relative h-full">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800 transition-all cursor-default">
              <FolderOpen size={12} className="text-indigo-400" />
              <span className="text-[9px] font-black tracking-widest uppercase text-zinc-400">File</span>
              <ChevronDown size={10} className="text-zinc-600 group-hover/file:rotate-180 transition-transform" />
            </div>
            {/* Transparent bridge to prevent closing on gap */}
            <div className="absolute top-full left-0 w-full h-2 bg-transparent z-[99]" />
            <div className="absolute top-full left-0 opacity-0 pointer-events-none group-hover/file:opacity-100 group-hover/file:pointer-events-auto transition-all duration-200 z-[100]">
              <div className="bg-[#121212] border border-zinc-800 rounded-2xl shadow-2xl p-1 mt-0 min-w-[200px] backdrop-blur-xl">
                <FileMenu store={store} onOpenDashboard={() => setIsDashboardOpen(true)} headless />
              </div>
            </div>
          </div>

          {/* Resolution Tab */}
          <div className="flex items-center gap-1 group/res relative h-full">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800 transition-all cursor-default">
              <Maximize size={12} className="text-indigo-400" />
              <span className="text-[9px] font-black tracking-widest uppercase text-zinc-400">Resolution</span>
              <ChevronDown size={10} className="text-zinc-600 group-hover/res:rotate-180 transition-transform" />
            </div>
            {/* Transparent bridge */}
            <div className="absolute top-full left-0 w-full h-2 bg-transparent z-[99]" />
            <div className="absolute top-full left-0 opacity-0 pointer-events-none group-hover/res:opacity-100 group-hover/res:pointer-events-auto transition-all duration-200 z-[100]">
              <div className="bg-[#121212] border border-zinc-800 rounded-2xl shadow-2xl p-1 mt-0 min-w-[200px] backdrop-blur-xl">
                <ResolutionSwitcher store={store} headless />
              </div>
            </div>
          </div>

          {needsRepair && (
            <button 
              onClick={() => {
                decodingAssetsRef.current.clear();
                setDecodeRetryCount({});
                setNeedsRepair(false);
                webAudioEngine.getContext().resume();
              }} 
              className="px-3 py-1 bg-orange-500/10 hover:bg-orange-500/20 rounded-full text-orange-400 transition-all flex items-center gap-2 border border-orange-500/20 animate-pulse"
            >
              <Music size={12} /> <span className="text-[9px] font-black uppercase tracking-widest">Repair Audio</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Standalone Fullscreen Button */}
          <button 
            onClick={handleDoubleClick}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800 hover:text-white transition-all group"
            title="Toggle Fullscreen (F)"
          >
            <Maximize size={12} className="text-zinc-400 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-black tracking-widest uppercase text-zinc-500 group-hover:text-zinc-300">Fullscreen</span>
          </button>

          {/* Tools Group */}
          <div className="flex items-center gap-1 group/tools relative h-full">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800 transition-all cursor-default">
              <Settings size={12} className="text-zinc-400" />
              <span className="text-[9px] font-black tracking-widest uppercase text-zinc-500">Tools</span>
              <ChevronDown size={10} className="text-zinc-600 group-hover/tools:rotate-180 transition-transform" />
            </div>
            {/* Transparent bridge */}
            <div className="absolute top-full right-0 w-full h-2 bg-transparent z-[99]" />
            <div className="absolute top-full right-0 opacity-0 pointer-events-none group-hover/tools:opacity-100 group-hover/tools:pointer-events-auto transition-all duration-200 z-[100]">
              <div className="bg-[#121212] border border-zinc-800 rounded-2xl shadow-2xl p-2 grid grid-cols-2 gap-1 min-w-[280px] backdrop-blur-xl mt-0">
                <button 
                  onClick={() => { if (window.confirm("Clear memory cache?")) window.location.reload(); }} 
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-800 text-zinc-500 hover:text-orange-400 transition-all"
                >
                  <Trash2 size={14} /> <span className="text-[9px] font-bold uppercase">Clear Mem</span>
                </button>
                <button onClick={handleGenerateReport} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-all">
                  <Bug size={14} /> <span className="text-[9px] font-bold uppercase">Report Bug</span>
                </button>
                <button 
                  onClick={() => {
                    const subtitleTrack = store.project.tracks.find(t => t.type === 'subtitle');
                    if (!subtitleTrack || subtitleTrack.clips.length === 0) { alert("No subtitles found."); return; }
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
                      srtContent += `${index + 1}\n${formatTime(clip.startTime)} --> ${formatTime(clip.startTime + clip.duration)}\n${clip.content || ""}\n\n`;
                    });
                    const blob = new Blob([srtContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url; link.download = `${store.project.name.toLowerCase().replace(/\s+/g, '_')}_subtitles.srt`;
                    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
                  }} 
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all"
                >
                  <FileText size={14} /> <span className="text-[9px] font-bold uppercase">Export SRT</span>
                </button>
                <button onClick={() => setIsShortcutModalOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all">
                  <Keyboard size={14} /> <span className="text-[9px] font-bold uppercase">Shortcuts</span>
                </button>
              </div>
            </div>
          </div>

          <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full transition-all active:scale-95 shadow-lg shadow-indigo-600/30 tracking-widest uppercase">
            <Download size={12} /> Export
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-14 bg-[#121212] border-r border-zinc-800/50 flex flex-col items-center py-6 gap-8">
          <Tooltip text="Asset Library" position="right">
            <button 
              onClick={() => setActivePanel('library')}
              className={`p-2 rounded-xl transition-all ${activePanel === 'library' ? 'text-indigo-500 bg-indigo-500/10' : 'text-zinc-600 hover:text-indigo-400'}`}
            >
              <Layers size={22} />
            </button>
          </Tooltip>
          
          <Tooltip text="Effects & Transitions" position="right">
            <button 
              onClick={() => setActivePanel('effects')}
              className={`p-2 rounded-xl transition-all ${activePanel === 'effects' ? 'text-indigo-500 bg-indigo-500/10' : 'text-zinc-600 hover:text-indigo-400'}`}
            >
              <Sparkles size={22} />
            </button>
          </Tooltip>

          <Tooltip text="Color & Grading" position="right"><button className="text-zinc-600 hover:text-indigo-400 transition-all"><Palette size={22} /></button></Tooltip>
          <Tooltip text="Titles & GFX" position="right"><button onClick={() => store.addSubtitleClip("New Subtitle")} className="text-zinc-600 hover:text-indigo-400 transition-all"><TypeIcon size={22} /></button></Tooltip>
          <Tooltip text="AI Captions" position="right"><button onClick={() => setTranscriptionState(prev => ({ ...prev, isOpen: true, isMinimized: false }))} className="text-zinc-600 hover:text-indigo-400 transition-all"><Captions size={22} /></button></Tooltip>
          <Tooltip text="Razor Tool" position="right" shortcut="S/B"><button className="text-zinc-600 hover:text-indigo-400 transition-all" onClick={() => store.splitClip(store.selectedClipIds[0], store.currentTime)}><Scissors size={22} /></button></Tooltip>
          
          <div className="flex-1" />
          <Tooltip text="Keyboard Shortcuts" position="right"><button onClick={() => setIsShortcutModalOpen(true)} className="text-zinc-600 hover:text-indigo-400 transition-all"><Keyboard size={22} /></button></Tooltip>
          <Tooltip text="System Diagnostics" position="right"><button onClick={() => setIsDiagnosticsModalOpen(true)} className="text-zinc-600 hover:text-indigo-400 transition-all"><Bug size={22} /></button></Tooltip>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="h-[55%] flex border-b border-zinc-800/50">
            {activePanel === 'library' ? (
              <Library assets={store.assets} onAddAsset={store.addAsset} onDeleteAsset={store.deleteAsset} onGenerateAI={handleAICompose} onDragAssetToTimeline={handleAssetToTimeline} />
            ) : (
              <EffectsSidebar onApplyEffect={(effect) => {
                if (store.selectedClipIds.length > 0) {
                  const clipId = store.selectedClipIds[0];
                  const clip = store.project.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
                  if (clip) {
                    const newEffect: Effect = { ...effect, id: `effect-${Date.now()}` } as Effect;
                    const currentEffects = clip.effects || [];
                    store.updateClip(clipId, { effects: [...currentEffects, newEffect] });
                  }
                } else {
                  console.warn("Select a clip on the timeline first to apply an effect.");
                }
              }} />
            )}
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
      
      <AnimatePresence>
        {isDashboardOpen && (
          <ProjectDashboard onClose={() => setIsDashboardOpen(false)} />
        )}
      </AnimatePresence>
      
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
