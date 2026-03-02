import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize, Repeat, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Project, Asset } from '../../types';
import { Tooltip } from '../UI/Tooltip';
import { GFX_Engine } from '../../services/GFX_Engine';
import { GFX_Gizmo } from '../../services/GFX_Gizmo';
import { GFX_InteractionManager } from '../../services/GFX_InteractionManager';
import { useProjectStore } from '../../store/useProjectStore';

interface PreviewPlayerProps {
  project: Project;
  assets: Asset[];
  isPlaying: boolean;
  isLooping: boolean;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  currentTime: number;
  onTimeUpdate: (t: number) => void;
}

const interactionManager = new GFX_InteractionManager();

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ 
  project, assets, isPlaying, isLooping, onTogglePlay, onToggleLoop, currentTime, onTimeUpdate 
}) => {
  const store = useProjectStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const gfxCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(performance.now());
  
  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // GFX State
  const [isInteractingGFX, setIsInteractingGFX] = useState(false);
  const selectedClip = project.tracks.flatMap(t => t.clips).find(c => c.id === store.selectedClipId);

  const totalDuration = useMemo(() => {
    if (project.tracks.every(t => t.clips.length === 0)) return 0;
    return Math.max(0, ...project.tracks.flatMap(t => t.clips).map(c => c.startTime + c.duration));
  }, [project.tracks]);

  // --- Animation Loop ---
  // (Moved to bottom to avoid ReferenceError)

  // --- Zoom & Pan Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.1, scale + delta), 5);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (gfxCanvasRef.current && selectedClip) {
       if (isInteractingGFX) return; 
    }

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.stopPropagation();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // --- GFX Interaction Handlers ---
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!gfxCanvasRef.current || !selectedClip) {
      handleMouseDown(e); 
      return;
    }
    
    const canvas = gfxCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    
    const layer = GFX_Engine.getLayerForClip(selectedClip, project.resolution);
    if (layer) {
      const mode = interactionManager.onMouseDown(x, y, layer);
      if (mode !== 'IDLE') {
        setIsInteractingGFX(true);
        e.stopPropagation();
      } else {
        handleMouseDown(e);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) { handleMouseMove(e); return; }

    if (!isInteractingGFX || !gfxCanvasRef.current || !selectedClip) return;
    const canvas = gfxCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const layer = GFX_Engine.getLayerForClip(selectedClip, project.resolution);
    if (layer) {
      const updated = interactionManager.onMouseMove(x, y, layer);
      if (updated) {
        // Normalize back to 0-1 range for storage
        const normalized = GFX_Engine.normalizeProperties(layer, project.resolution);
        
        store.setProject(prev => ({
          ...prev,
          tracks: prev.tracks.map(t => ({
            ...t,
            clips: t.clips.map(c => c.id === selectedClip.id ? {
              ...c,
              effects: [
                ...c.effects.filter(eff => eff.name !== 'GFX_PROPS'),
                { 
                  id: 'gfx-props',
                  type: 'adjustment',
                  name: 'GFX_PROPS',
                  params: normalized 
                }
              ]
            } : c)
          }))
        }));
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isPanning) handleMouseUp();
    setIsInteractingGFX(false);
    interactionManager.onMouseUp();
  };

  // --- Media Sync ---
  const activeVideoClip = project.tracks.slice().reverse().filter(t => t.type === 'video' && t.isVisible).flatMap(t => t.clips).find(c => currentTime >= c.startTime && currentTime <= c.startTime + c.duration && assets.find(a => a.id === c.assetId)?.type === 'VIDEO');
  const activeVideoAsset = activeVideoClip ? assets.find(a => a.id === activeVideoClip.assetId) : null;
  const isVideoSilenceNeeded = activeVideoClip?.isSilent || project.tracks.find(t => t.clips.some(c => c.id === activeVideoClip?.id))?.isMuted;
  
  // Note: Audio and Subtitle calculations moved to effects/refs for performance

  // Subtitles Ref
  const subtitleRef = useRef<HTMLDivElement>(null);

  // Performance Stats
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());

  // --- Animation Loop ---
  const animate = (time: number) => {
    if (isPlaying) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      const nextTime = currentTime + deltaTime;

      if (totalDuration > 0 && nextTime >= totalDuration) {
        if (isLooping) {
          onTimeUpdate(0);
          lastTimeRef.current = performance.now();
        } else {
          onTimeUpdate(totalDuration);
          onTogglePlay();
        }
      } else {
        onTimeUpdate(nextTime);
      }
    }

    // Subtitle Update (Direct DOM manipulation for performance)
    if (subtitleRef.current) {
      const activeSub = project.tracks
        .filter(t => t.type === 'subtitle' && t.isVisible)
        .flatMap(t => t.clips)
        .find(c => currentTime >= c.startTime && currentTime <= c.startTime + c.duration);
      
      if (subtitleRef.current.innerText !== (activeSub?.content || '')) {
        subtitleRef.current.innerText = activeSub?.content || '';
        subtitleRef.current.style.display = activeSub ? 'block' : 'none';
      }
    }

    // GFX Render
    if (gfxCanvasRef.current) {
      const canvas = gfxCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        GFX_Engine.render(ctx, project, currentTime);
        if (selectedClip && currentTime >= selectedClip.startTime && currentTime <= selectedClip.startTime + selectedClip.duration) {
          const layer = GFX_Engine.getLayerForClip(selectedClip, project.resolution);
          if (layer) GFX_Gizmo.draw(ctx, layer);
        }
      }
    }

    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  // --- Effects ---
  
  // 1. Start Animation Loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, currentTime, isLooping, totalDuration, project, store.selectedClipId]);

  // 2. Video Sync
  useEffect(() => {
    if (!videoRef.current) return;
    if (activeVideoAsset && activeVideoClip) {
      videoRef.current.muted = !!isVideoSilenceNeeded;
      videoRef.current.volume = 1.0;
      const targetTime = (currentTime - activeVideoClip.startTime) + activeVideoClip.offset;
      if (Math.abs(videoRef.current.currentTime - targetTime) > 0.2) videoRef.current.currentTime = targetTime;
      if (isPlaying) videoRef.current.play().catch(() => {}); else videoRef.current.pause();
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, activeVideoAsset?.id, isVideoSilenceNeeded, currentTime, activeVideoClip?.startTime, activeVideoClip?.offset]);

  // 3. Audio Sync (Excluding Subtitles)
  useEffect(() => {
    if (!audioContainerRef.current) return;
    
    // Calculate active sources - EXCLUDING SUBTITLES
    const currentActiveSources = project.tracks
      .filter(t => !t.isMuted && t.type !== 'subtitle')
      .flatMap(t => t.clips.map(c => ({ clip: c, asset: assets.find(a => a.id === c.assetId) })))
      .filter(item => {
        if (!item.asset) return false;
        if (item.clip.isSilent) return false;
        if (item.clip.content) return false; // Extra safeguard: Subtitles should never play audio
        if (activeVideoClip && item.clip.id === activeVideoClip.id) return false;
        return currentTime >= item.clip.startTime && currentTime <= item.clip.startTime + item.clip.duration;
      });

    const currentActiveIds = new Set(currentActiveSources.map(s => s.clip.id));
    
    // Cleanup inactive
    for (const [id, el] of audioElementsRef.current.entries()) {
      if (!currentActiveIds.has(id)) { el.pause(); el.src = ""; el.remove(); audioElementsRef.current.delete(id); }
    }

    // Update/Create active
    currentActiveSources.forEach(({ clip, asset }) => {
      if (!asset) return;
      let el = audioElementsRef.current.get(clip.id);
      if (!el) { 
        el = document.createElement('audio'); 
        el.src = asset.url; 
        el.preload = "auto"; 
        audioContainerRef.current!.appendChild(el); 
        audioElementsRef.current.set(clip.id, el); 
      }
      
      const targetTime = (currentTime - clip.startTime) + clip.offset;
      if (Math.abs(el.currentTime - targetTime) > 0.2) el.currentTime = targetTime;
      
      if (isPlaying) {
        if (el.paused) el.play().catch(() => {});
      } else {
        if (!el.paused) el.pause();
      }
    });
  }, [isPlaying, currentTime, project.tracks, assets]);

  return (
    <div className="flex-1 bg-black flex flex-col relative group overflow-hidden border-x border-zinc-800/50">
      <div ref={audioContainerRef} className="hidden" aria-hidden="true" />
      
      <div 
        className="flex-1 flex items-center justify-center p-6 bg-[#0a0a0a] overflow-hidden cursor-crosshair relative"
        onWheel={handleWheel}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        <div 
          className="aspect-video w-full max-w-4xl bg-black rounded shadow-2xl border border-white/5 flex items-center justify-center overflow-hidden relative transition-transform duration-75 ease-out"
          style={{ transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)` }}
        >
          {activeVideoAsset ? (
            <video ref={videoRef} src={activeVideoAsset.url} className="w-full h-full object-contain pointer-events-none" />
          ) : (
            <div className="text-zinc-800 text-[10px] font-black uppercase tracking-widest animate-pulse pointer-events-none">Monitor Standby...</div>
          )}
          
          <canvas 
            ref={gfxCanvasRef} width={1920} height={1080} 
            onMouseDown={handleCanvasMouseDown}
            className={`absolute inset-0 w-full h-full z-10 ${isInteractingGFX ? 'cursor-grabbing' : isPanning ? 'cursor-move' : 'cursor-default'}`} 
            style={{ imageRendering: 'auto' }}
          />

          {/* Subtitles Overlay (Ref-based for performance) */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-end items-center pb-10 z-20">
             <div ref={subtitleRef} className="bg-black/50 px-4 py-2 rounded text-white text-xl font-bold text-center max-w-[80%] mb-2 backdrop-blur-sm hidden"></div>
          </div>
        </div>

        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
          <div className="px-2 py-1 bg-black/60 backdrop-blur rounded text-[9px] font-mono border border-white/10 uppercase text-zinc-400">
            Preview {Math.round(scale * 100)}%
          </div>
          <div className="px-2 py-1 bg-black/60 backdrop-blur rounded text-[9px] font-mono border border-white/10 uppercase text-zinc-400">
            FPS: {fps}
          </div>
          <div className="px-2 py-1 bg-black/60 backdrop-blur rounded text-[9px] font-mono border border-white/10 uppercase text-zinc-400">
            Mem: {(performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'}
          </div>
        </div>
      </div>

      <div className="h-14 bg-[#121212] border-t border-zinc-800 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <button className="text-zinc-500 hover:text-white" onClick={() => onTimeUpdate(0)}><SkipBack size={16} /></button>
            <button onClick={onTogglePlay} className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-all shadow-xl">
              {isPlaying ? <Pause className="text-black fill-black" size={16} /> : <Play className="text-black fill-black translate-x-0.5" size={16} />}
            </button>
            <button className="text-zinc-500 hover:text-white"><SkipForward size={16} /></button>
          </div>
          <div className="font-mono text-[13px] text-indigo-400 tabular-nums bg-indigo-500/5 px-3 py-1 rounded border border-indigo-500/10">
            {new Date(currentTime * 1000).toISOString().substr(11, 8)}<span className="opacity-40">:{Math.floor((currentTime % 1) * 30).toString().padStart(2, '0')}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-zinc-500">
           <Tooltip text="Reset View" position="top">
             <button onClick={resetView} className="hover:text-indigo-400 transition-colors"><RotateCcw size={14} /></button>
           </Tooltip>
           <div className="w-px h-4 bg-zinc-800" />
           <button onClick={() => setScale(s => Math.max(0.1, s - 0.2))} className="hover:text-white"><ZoomOut size={14} /></button>
           <button onClick={() => setScale(s => Math.min(5, s + 0.2))} className="hover:text-white"><ZoomIn size={14} /></button>
           <div className="w-px h-4 bg-zinc-800" />
           <Tooltip text={isLooping ? "Loop On" : "Loop Off"} position="top">
             <button onClick={onToggleLoop} className={`transition-colors ${isLooping ? 'text-indigo-400' : 'hover:text-white'}`}><Repeat size={16} /></button>
           </Tooltip>
        </div>
      </div>
    </div>
  );
};