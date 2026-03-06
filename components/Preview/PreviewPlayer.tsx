import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize, Repeat, ZoomIn, ZoomOut, RotateCcw, Scan } from 'lucide-react';
import { Project, Asset } from '../../types';
import { Tooltip } from '../UI/Tooltip';
import { GFX_Engine } from '../../services/GFX_Engine';
import { GFX_Gizmo } from '../../services/GFX_Gizmo';
import { GFX_InteractionManager } from '../../services/GFX_InteractionManager';
import { useProjectStore } from '../../store/useProjectStore';
import { TransformOverlay } from './TransformOverlay';

interface PreviewPlayerProps {
  store: any; // Using any to avoid circular type issues with the hook return type, or we could define a Store interface
}

const interactionManager = new GFX_InteractionManager();

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ store }) => {
  // Destructure what we need from the store prop
  const { 
    project, assets, isPlaying, isLooping, currentTime, 
    setIsPlaying, setIsLooping, setCurrentTime, updateSubtitle, 
    selectedClipIds, selectClip, setProject, finalizeMove, applyToAll 
  } = store;

  const videoRef = useRef<HTMLVideoElement>(null);
  const gfxCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [showTransform, setShowTransform] = useState(true);

  // GFX State
  const [isInteractingGFX, setIsInteractingGFX] = useState(false);
  // Use the first selected clip for GFX/Transform interactions for now
  const selectedClip = project.tracks.flatMap(t => t.clips).find(c => selectedClipIds.includes(c.id));

  // Subtitle State
  const [isDraggingSub, setIsDraggingSub] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const subDragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const lastSubPosRef = useRef<{x: number, y: number} | null>(null);

  const totalDuration = useMemo(() => {
    if (project.tracks.every(t => t.clips.length === 0)) return 0;
    return Math.max(0, ...project.tracks.flatMap(t => t.clips).map(c => c.startTime + c.duration));
  }, [project.tracks]);

  const [snapGuides, setSnapGuides] = useState({ x: false, y: false });

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
    if (isDraggingSub) {
      handleSubMouseMove(e);
      return;
    }
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
    if (isDraggingSub) {
      handleSubMouseUp();
      return;
    }
    if (isPanning) handleMouseUp();
    if (isInteractingGFX) {
      finalizeMove();
    }
    setIsInteractingGFX(false);
    interactionManager.onMouseUp();
  };

  const [localTime, setLocalTime] = useState(currentTime);
  const localTimeRef = useRef(currentTime);
  const currentTimeRef = useRef(currentTime);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (!isPlaying) {
      setLocalTime(currentTime);
      localTimeRef.current = currentTime;
    }
  }, [currentTime, isPlaying]);

  const renderTime = isPlaying ? localTime : currentTime;

  // --- Media Sync ---
  const activeVideoClip = project.tracks.slice().reverse()
    .filter(t => t.type === 'video' && t.isVisible)
    .flatMap(t => t.clips)
    .find(c => {
      const asset = assets.find(a => a.id === c.assetId);
      return renderTime >= c.startTime && renderTime <= c.startTime + c.duration && (asset?.type === 'VIDEO' || asset?.type === 'IMAGE');
    });
  const activeVideoAsset = activeVideoClip ? assets.find(a => a.id === activeVideoClip.assetId) : null;
  const isVideoSilenceNeeded = activeVideoClip?.isSilent || project.tracks.find(t => t.clips.some(c => c.id === activeVideoClip?.id))?.isMuted;
  
  // Note: Audio and Subtitle calculations moved to effects/refs for performance

  // --- Subtitles ---
  const activeSubs = project.tracks
    .filter(t => t.isVisible)
    .flatMap(t => t.clips)
    .filter(c => c.content && renderTime >= c.startTime && renderTime <= c.startTime + c.duration);

  const activeSub = activeSubs[0]; // For the editor panel

  const handleSubMouseDown = (e: React.MouseEvent, subId: string, currentPos: {x: number, y: number}) => {
    e.stopPropagation();
    setIsDraggingSub(true);
    setEditingSubId(subId);
    selectClip(subId); // Select the clip when clicking on it
    
    subDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: currentPos.x,
      startY: currentPos.y,
    };
  };

  const handleSubMouseMove = (e: React.MouseEvent) => {
    if (isDraggingSub && editingSubId && updateSubtitle) {
      const containerRect = gfxCanvasRef.current?.parentElement?.getBoundingClientRect();
      if (!containerRect) return;

      const deltaX = (e.clientX - subDragStartRef.current.x) / containerRect.width;
      const deltaY = (e.clientY - subDragStartRef.current.y) / containerRect.height;

      const newX = Math.max(0, Math.min(1, subDragStartRef.current.startX + deltaX));
      const newY = Math.max(0, Math.min(1, subDragStartRef.current.startY + deltaY));
      lastSubPosRef.current = { x: newX, y: newY };

      updateSubtitle(editingSubId, undefined, { x: newX, y: newY }, applyToAll, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, false);
    }
  };

  const handleSubMouseUp = () => {
    if (isDraggingSub && editingSubId && updateSubtitle && lastSubPosRef.current) {
      updateSubtitle(editingSubId, undefined, lastSubPosRef.current, applyToAll, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);
      lastSubPosRef.current = null;
    }
    setIsDraggingSub(false);
  };

  const handleSubDoubleClick = (e: React.MouseEvent, subId: string, content: string) => {
    e.stopPropagation();
    setEditingSubId(subId);
    setEditingText(content);
  };

  const handleSubTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingText(e.target.value);
  };

  const handleSubTextSubmit = (e: React.KeyboardEvent | React.FocusEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    if (editingSubId && updateSubtitle) {
      updateSubtitle(editingSubId, editingText, undefined, false, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, false);
    }
    setEditingSubId(null);
  };

  // Performance Stats
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const lastGlobalUpdateRef = useRef(performance.now());

  // --- Live Overrides for Performance ---
  const liveOverrides = useRef<Record<string, any>>({});

  useEffect(() => {
    const handleOverride = (e: Event) => {
      const { clipId, property, value } = (e as CustomEvent).detail;
      const current = liveOverrides.current[clipId] || {};
      
      // Update ref for canvas rendering
      if (property === 'posX') {
        liveOverrides.current[clipId] = { ...current, posX: value };
      } else if (property === 'posY') {
        liveOverrides.current[clipId] = { ...current, posY: value };
      } else if (property === 'scale') {
        liveOverrides.current[clipId] = { ...current, scale: value / 100, scaleX: value / 100, scaleY: value / 100 };
      } else if (property === 'rotation') {
        liveOverrides.current[clipId] = { ...current, rotation: value };
      }

      // Direct DOM Manipulation for Subtitles (60FPS)
      const subDom = document.getElementById(`sub-dom-${clipId}`);
      const subText = document.getElementById(`sub-text-${clipId}`);
      const mediaDom = document.getElementById(`media-dom-${clipId}`);
      
      if (subDom && subText) {
         if (property === 'posX') {
             subDom.style.left = `${value}%`;
         }
         if (property === 'posY') {
             subDom.style.top = `${value}%`;
         }
         if (property === 'rotation') {
             subDom.style.transform = `translate(-50%, -50%) rotate(${value}deg)`;
         }
         if (property === 'scale') {
             // Base font size is 1.25rem * scale
             subText.style.fontSize = `${(value / 100) * 1.25}rem`;
         }
         if (property === 'opacity') {
             subDom.style.opacity = `${value / 100}`;
         }
      }

      if (mediaDom) {
         if (property === 'posX') {
             mediaDom.style.left = `${value}%`;
         }
         if (property === 'posY') {
             mediaDom.style.top = `${value}%`;
         }
         
         // We need to combine rotation and scale
         const currentRot = liveOverrides.current[clipId]?.rotation ?? project.tracks.flatMap(t => t.clips).find(c => c.id === clipId)?.rotation ?? 0;
         const currentScale = liveOverrides.current[clipId]?.scale ?? project.tracks.flatMap(t => t.clips).find(c => c.id === clipId)?.scale ?? 1;

         if (property === 'rotation' || property === 'scale') {
             mediaDom.style.transform = `translate(-50%, -50%) rotate(${currentRot}deg) scale(${currentScale})`;
         }
      }
    };

    const handleClear = () => {
      liveOverrides.current = {};
    };

    window.addEventListener('gfx-override', handleOverride);
    window.addEventListener('gfx-override-clear', handleClear);
    return () => {
      window.removeEventListener('gfx-override', handleOverride);
      window.removeEventListener('gfx-override-clear', handleClear);
    };
  }, []);

  // --- Animation Loop ---
  const animate = (time: number) => {
    if (isPlaying) {
      let nextTime = localTimeRef.current;
      let synced = false;

      // 1. Audio-Slaved Timing (Priority: Audio -> Video -> Clock)
      // Check active audio elements
      for (const [clipId, audioEl] of audioElementsRef.current.entries()) {
        if (!audioEl.paused && !audioEl.ended && audioEl.readyState >= 2) {
           // Find clip info to map time back to timeline
           // We iterate tracks to find the clip. This is fast enough for < 100 clips.
           let foundClip: any = null;
           for(const t of project.tracks) {
               if(t.type === 'audio') {
                   const c = t.clips.find(c => c.id === clipId);
                   if(c) { foundClip = c; break; }
               }
           }
           
           if (foundClip) {
               // Calculate timeline time: current = audioTime - offset + startTime
               const calculatedTime = audioEl.currentTime - foundClip.offset + foundClip.startTime;
               // Sanity check: don't jump if difference is huge (e.g. looping artifact), but generally trust audio
               if (Math.abs(calculatedTime - localTimeRef.current) < 1.0) {
                   nextTime = calculatedTime;
                   synced = true;
                   break; // Found master
               }
           }
        }
      }

      // 2. Video-Slaved Timing (if no audio master)
      if (!synced && videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 2) {
          // Find active video clip for current time
          const currentT = localTimeRef.current;
          const vidClip = project.tracks
            .filter(t => t.type === 'video' && t.isVisible)
            .flatMap(t => t.clips)
            .find(c => currentT >= c.startTime && currentT <= c.startTime + c.duration);
            
          if (vidClip) {
              const calculatedTime = videoRef.current.currentTime - vidClip.offset + vidClip.startTime;
               if (Math.abs(calculatedTime - localTimeRef.current) < 1.0) {
                   nextTime = calculatedTime;
                   synced = true;
               }
          }
      }

      // 3. Fallback to System Clock
      if (!synced) {
          const deltaTime = (time - lastTimeRef.current) / 1000;
          nextTime = localTimeRef.current + deltaTime;
      }

      localTimeRef.current = nextTime;
      setLocalTime(nextTime);

      if (totalDuration > 0 && nextTime >= totalDuration) {
        if (isLooping) {
          localTimeRef.current = 0;
          setLocalTime(0);
          setCurrentTime(0);
          lastTimeRef.current = performance.now();
        } else {
          localTimeRef.current = totalDuration;
          setLocalTime(totalDuration);
          setCurrentTime(totalDuration);
          setIsPlaying(false);
        }
      } else {
        if (time - lastGlobalUpdateRef.current > 100) {
          setCurrentTime(nextTime);
          lastGlobalUpdateRef.current = time;
        }
      }
    }

    // GFX Render
    if (gfxCanvasRef.current) {
      const canvas = gfxCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const currentRenderTime = isPlaying ? localTimeRef.current : currentTimeRef.current;
        
        // Apply Live Overrides
        let renderProject = project;
        if (Object.keys(liveOverrides.current).length > 0) {
            renderProject = {
                ...project,
                tracks: project.tracks.map(t => ({
                    ...t,
                    clips: t.clips.map(c => {
                        const override = liveOverrides.current[c.id];
                        if (override) {
                            let merged = { ...c, ...override };
                            // Handle position specially if posX/posY are present
                            if (override.posX !== undefined || override.posY !== undefined) {
                                merged.position = {
                                    x: override.posX !== undefined ? override.posX / 100 : (c.position?.x ?? 0.5),
                                    y: override.posY !== undefined ? override.posY / 100 : (c.position?.y ?? (c.content ? 0.9 : 0.5))
                                };
                            }
                            return merged;
                        }
                        return c;
                    })
                }))
            };
        }

        GFX_Engine.render(ctx, renderProject, currentRenderTime);
        // GFX_Gizmo.draw removed to prevent ghost box - we use TransformOverlay now
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
  }, [isPlaying, isLooping, totalDuration, project, selectedClipIds]);

  // 2. Video Sync
  useEffect(() => {
    if (!videoRef.current) return;
    if (activeVideoAsset && activeVideoClip) {
      videoRef.current.muted = !!isVideoSilenceNeeded;
      videoRef.current.volume = 1.0;
      const targetTime = (renderTime - activeVideoClip.startTime) + activeVideoClip.offset;
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
        return renderTime >= item.clip.startTime && renderTime <= item.clip.startTime + item.clip.duration;
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
      
      const targetTime = (renderTime - clip.startTime) + clip.offset;
      if (Math.abs(el.currentTime - targetTime) > 0.2) el.currentTime = targetTime;
      
      if (isPlaying) {
        if (el.paused) el.play().catch(() => {});
      } else {
        if (!el.paused) el.pause();
      }
    });
  }, [isPlaying, currentTime, project.tracks, assets]);

  // --- Keyboard Controls for Clip Movement ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!selectedClip || !updateSubtitle) return;

      const step = e.shiftKey ? 0.05 : 0.005;
      let dx = 0;
      let dy = 0;

      if (e.key === 'ArrowUp') dy = -step;
      if (e.key === 'ArrowDown') dy = step;
      if (e.key === 'ArrowLeft') dx = -step;
      if (e.key === 'ArrowRight') dx = step;

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        const currentX = selectedClip.position?.x ?? 0.5;
        const currentY = selectedClip.position?.y ?? (selectedClip.content ? 0.9 : 0.5);
        
        updateSubtitle(
          selectedClip.id, 
          undefined, 
          { x: currentX + dx, y: currentY + dy }, 
          applyToAll, 
          undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 
          true // finalize immediately for keyboard
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClip, updateSubtitle, applyToAll]);

  return (
    <div className="flex-1 flex flex-col relative group overflow-hidden border-x border-zinc-800/50">
      <div ref={audioContainerRef} className="hidden" aria-hidden="true" />
      
      <div 
        className="flex-1 flex items-center justify-center p-6 overflow-hidden cursor-crosshair relative bg-[#18181b]"
        onWheel={handleWheel}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        <div 
          ref={containerRef}
          className="w-full max-w-4xl rounded shadow-2xl border border-white/5 flex items-center justify-center overflow-hidden relative transition-transform duration-75 ease-out"
          style={{ 
            transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`, 
            backgroundColor: project.backgroundColor || '#000000',
            aspectRatio: `${project.resolution.width} / ${project.resolution.height}`
          }}
        >
          {activeVideoAsset ? (
            (() => {
                // Calculate precise media dimensions for the DOM element to match TransformOverlay
                let mediaW = '100%';
                let mediaH = '100%';
                if (activeVideoAsset && project.resolution) {
                    const cAspect = project.resolution.width / project.resolution.height;
                    const aAspect = (activeVideoAsset.width || 1920) / (activeVideoAsset.height || 1080);
                    if (aAspect > cAspect) {
                        mediaH = `${(1 / aAspect) * cAspect * 100}%`;
                    } else {
                        mediaW = `${(aAspect / cAspect) * 100}%`;
                    }
                }

                return (
                    <div 
                      id={`media-dom-${activeVideoClip?.id}`}
                      className="absolute pointer-events-none"
                      style={{
                        width: mediaW,
                        height: mediaH,
                        left: `${(activeVideoClip?.position?.x ?? 0.5) * 100}%`,
                        top: `${(activeVideoClip?.position?.y ?? 0.5) * 100}%`,
                        transform: `translate(-50%, -50%) rotate(${activeVideoClip?.rotation || 0}deg) scale(${activeVideoClip?.scale || 1})`
                      }}
                    >
                      {activeVideoAsset.type === 'VIDEO' ? (
                        <video 
                          key={activeVideoAsset.id}
                          ref={videoRef} 
                          src={activeVideoAsset.url} 
                          className="w-full h-full object-contain" 
                          playsInline
                          muted={isVideoSilenceNeeded}
                        />
                      ) : (
                        <img 
                          key={activeVideoAsset.id}
                          src={activeVideoAsset.url} 
                          className="w-full h-full object-contain" 
                          referrerPolicy="no-referrer" 
                        />
                      )}
                    </div>
                );
            })()
          ) : (
            project.tracks.length === 0 && (
              <div className="text-zinc-800 text-[10px] font-black uppercase tracking-widest animate-pulse pointer-events-none">Monitor Standby...</div>
            )
          )}
          
          <canvas 
            ref={gfxCanvasRef} width={1920} height={1080} 
            onMouseDown={handleCanvasMouseDown}
            className={`absolute inset-0 w-full h-full z-10 ${isInteractingGFX ? 'cursor-grabbing' : isPanning ? 'cursor-move' : 'cursor-default'}`} 
            style={{ imageRendering: 'auto' }}
          />

          {/* Subtitles Overlay */}
          {activeSubs.map(sub => (
            <div 
              key={sub.id}
              id={`sub-dom-${sub.id}`}
              className="absolute z-50"
              style={{
                left: `${(sub.position?.x ?? 0.5) * 100}%`,
                top: `${(sub.position?.y ?? 0.9) * 100}%`,
                transform: `translate(-50%, -50%) rotate(${sub.rotation || 0}deg)`,
                cursor: isDraggingSub ? 'grabbing' : 'grab',
                pointerEvents: 'auto'
              }}
              onMouseDown={(e) => handleSubMouseDown(e, sub.id, sub.position || {x: 0.5, y: 0.9})}
              onDoubleClick={(e) => handleSubDoubleClick(e, sub.id, sub.content || "")}
            >
              <div 
                id={`sub-text-${sub.id}`}
                className="text-center max-w-[80%] select-none"
                style={{ 
                  color: sub.color || '#ffffff', 
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  fontFamily: sub.font || 'Inter, sans-serif',
                  fontSize: `${(sub.scale || 1) * 1.25}rem`,
                  fontWeight: 'bold'
                }}
              >
                {sub.content}
              </div>
            </div>
          ))}

          {/* Snap Guides */}
          {snapGuides.x && (
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-emerald-500 z-50 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          )}
          {snapGuides.y && (
            <div className="absolute left-0 right-0 top-1/2 h-px bg-emerald-500 z-50 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          )}

          {/* Transform Overlay for Selected Clip (Video/Image/Subtitle) */}
          {showTransform && selectedClip && (
            // Check if clip is visual and visible at current time
            (() => {
              const track = project.tracks.find(t => t.clips.some(c => c.id === selectedClip.id));
              const isVisual = track && (track.type === 'video' || track.type === 'image' || track.type === 'subtitle');
              const isVisible = renderTime >= selectedClip.startTime && renderTime <= selectedClip.startTime + selectedClip.duration;
              return isVisual && isVisible;
            })()
          ) && (
            (() => {
                const track = project.tracks.find(t => t.clips.some(c => c.id === selectedClip.id));
                const isVideo = track?.type === 'video' || track?.type === 'image';
                
                // Calculate media dimensions for TransformOverlay
                let mediaDimensions = undefined;
                if (isVideo && containerRef.current) {
                    const asset = assets.find(a => a.id === selectedClip.assetId);
                    if (asset) {
                        const containerW = containerRef.current.clientWidth;
                        const containerH = containerRef.current.clientHeight;
                        const containerAspect = containerW / containerH;
                        const assetAspect = (asset.width || 1920) / (asset.height || 1080);
                        
                        let width = containerW;
                        let height = containerH;
                        
                        // "object-contain" logic
                        if (assetAspect > containerAspect) {
                            // Asset is wider than container -> Width matches, Height reduced
                            height = containerW / assetAspect;
                        } else {
                            // Asset is taller than container -> Height matches, Width reduced
                            width = containerH * assetAspect;
                        }
                        mediaDimensions = { width, height };
                    }
                }

                return (
                    <TransformOverlay 
                      clip={selectedClip}
                      containerRef={containerRef}
                      isVideo={isVideo}
                      mediaDimensions={mediaDimensions}
                      onUpdate={(pos, scale, rot, scaleX, scaleY) => {
                        let newPos = { ...pos };
                        const snapThreshold = 0.02; // 2% threshold
                        const guides = { x: false, y: false };

                        if (Math.abs(newPos.x - 0.5) < snapThreshold) {
                          newPos.x = 0.5;
                          guides.x = true;
                        }
                        if (Math.abs(newPos.y - 0.5) < snapThreshold) {
                          newPos.y = 0.5;
                          guides.y = true;
                        }
                        setSnapGuides(guides);

                        if (updateSubtitle) {
                          updateSubtitle(selectedClip.id, undefined, newPos, applyToAll, undefined, undefined, scale, rot, scaleX, scaleY, undefined, undefined, undefined, undefined, false);
                        }
                      }}
                      onFinalize={() => {
                         setSnapGuides({ x: false, y: false });
                         if (updateSubtitle) {
                           // Trigger finalize
                           updateSubtitle(selectedClip.id, undefined, undefined, applyToAll, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);
                         }
                      }}
                    />
                );
            })()
          )}
        </div>

        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-40">
           {/* Toggle Transform Overlay */}
           <div className="pointer-events-auto">
             <Tooltip text="Toggle Transform Controls" position="right">
               <button 
                 onClick={() => setShowTransform(!showTransform)} 
                 className={`p-2 rounded-lg transition-all ${showTransform ? 'bg-indigo-600 text-white' : 'bg-black/50 text-zinc-400 hover:text-white'}`}
               >
                 <Scan size={16} />
               </button>
             </Tooltip>
           </div>
        </div>

        {/* Subtitle Editing Panel moved to dedicated PropertiesPanel */}
      </div>

      <div className="h-14 bg-[#121212] border-t border-zinc-800 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <button className="text-zinc-500 hover:text-white" onClick={() => setCurrentTime(0)}><SkipBack size={16} /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-all shadow-xl">
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
           <span className="text-[10px] font-mono w-8 text-center">{Math.round(scale * 100)}%</span>
           <button onClick={() => setScale(s => Math.min(5, s + 0.2))} className="hover:text-white"><ZoomIn size={14} /></button>
           <div className="w-px h-4 bg-zinc-800" />
           <Tooltip text={isLooping ? "Loop On" : "Loop Off"} position="top">
             <button onClick={() => setIsLooping(!isLooping)} className={`transition-colors ${isLooping ? 'text-indigo-400' : 'hover:text-white'}`}><Repeat size={16} /></button>
           </Tooltip>
        </div>
      </div>
    </div>
  );
};
