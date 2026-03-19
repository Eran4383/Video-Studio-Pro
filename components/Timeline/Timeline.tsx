import React, { useRef, useState, useEffect } from 'react';
import { Project, Clip, Track, Asset } from '../../types';
import { TimelineToolbar } from './TimelineToolbar';
import { AssetService } from '../../services/AssetService';
import { MagneticAnchorService } from '../../services/MagneticAnchorService';
import { useTimelineSnapping } from '../../hooks/useTimelineSnapping';
import { TimelineTracks } from './TimelineTracks';
import { KineticBlocksOverlay } from './KineticBlocksOverlay';
import { useProjectStore } from '../../store/useProjectStore';

interface TimelineProps {
  project: Project;
  assets: Asset[];
  currentTime: number;
  zoom: number;
  isMagnetEnabled: boolean;
  setZoom: (z: number) => void;
  setIsMagnetEnabled: (m: boolean) => void;
  onTimeChange: (time: number) => void;
  onClipMove: (clipId: string, trackId: string, time: number, forceDisableMagnet?: boolean) => void;
  onClipResize: (clipId: string, newStart: number, newDur: number, newOffset: number) => void;
  onClipFinalize: () => void;
  onClipSplit: (clipId: string | null, time: number) => void;
  onClipDelete: (clipId: string) => void;
  onToggleTrack: (trackId: string, prop: 'isVisible' | 'isMuted' | 'isLocked') => void;
  onSetTrackHeight: (trackId: string, height: number) => void;
  onAddClipAtPosition: (trackId: string, asset: Asset, startTime: number) => void;
  onAddTrack: (type: 'video' | 'audio' | 'subtitle', trackId?: string) => void;
  onDetachAudio: (clipId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  selectedClipIds: string[];
  onSelectClip: (id: string | null, multi?: boolean) => void;
  onSelectClips: (ids: string[]) => void;
  onSelectAllTrack: (trackId: string) => void;
  onAddAsset: (asset: Asset) => void;
  onSyncToAnchors: (onlySelected?: boolean) => void;
  onImportSubtitles: (file: File) => void;
}

type DragMode = 'MOVE' | 'RESIZE_L' | 'RESIZE_R';

interface DragState {
  id: string;
  startX: number;
  mode: DragMode;
  trackId: string;
  originalState: {
    startTime: number;
    duration: number;
    offset: number;
  };
}

export const Timeline: React.FC<TimelineProps> = ({
  project, assets, currentTime, zoom, isMagnetEnabled, setZoom, setIsMagnetEnabled, onTimeChange, onClipMove, onClipResize, onClipFinalize, onClipSplit, onClipDelete, onToggleTrack, onSetTrackHeight, onAddClipAtPosition, onAddTrack, onDetachAudio, onUndo, onRedo, canUndo, canRedo, selectedClipIds, onSelectClip, onSelectClips, onSelectAllTrack, onAddAsset, onSyncToAnchors, onImportSubtitles
}) => {
  const store = useProjectStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [middlePanning, setMiddlePanning] = useState<{ startX: number, scrollLeft: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, clipId: string, assetType: string } | null>(null);
  const [ghostTime, setGhostTime] = useState<number | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const { getSnappedStartTime } = useTimelineSnapping(project, assets, isMagnetEnabled);

  // Box Selection State
  const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);

  const pxPerSec = zoom * 10;
  const HEADER_WIDTH = 150;
  const RESIZE_HANDLE_WIDTH = 10;

  // Auto-scroll logic
  useEffect(() => {
    if (!scrollRef.current || !isAutoScrollEnabled) return;
    
    const scrollContainer = scrollRef.current;
    const playheadX = HEADER_WIDTH + (currentTime * pxPerSec);
    if (isNaN(playheadX)) {
        console.error('PlayheadX is NaN:', { currentTime, pxPerSec, HEADER_WIDTH });
    }
    const scrollLeft = scrollContainer.scrollLeft;
    const viewportWidth = scrollContainer.clientWidth;
    
    // Check if playhead is outside visible area (with some padding)
    const padding = 100;
    if (playheadX > scrollLeft + viewportWidth - padding || playheadX < scrollLeft + HEADER_WIDTH) {
      // Center the playhead or just scroll it into view
      scrollContainer.scrollLeft = playheadX - (viewportWidth / 2);
    }
  }, [currentTime, pxPerSec, isAutoScrollEnabled]);

  const getT = (clientX: number) => {
    if (!scrollRef.current) return 0;
    const rect = scrollRef.current.getBoundingClientRect();
    return Math.max(0, (clientX - rect.left + scrollRef.current.scrollLeft - HEADER_WIDTH) / pxPerSec);
  };

  const getResizeMode = (e: React.MouseEvent, clip: Clip): DragMode => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < RESIZE_HANDLE_WIDTH) return 'RESIZE_L';
    if (x > rect.width - RESIZE_HANDLE_WIDTH) return 'RESIZE_R';
    return 'MOVE';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (middlePanning && scrollRef.current) {
        scrollRef.current.scrollLeft = middlePanning.scrollLeft - (e.clientX - middlePanning.startX);
        return;
      }
      
      if (isDraggingPlayhead) {
        let t = getT(e.clientX);
        
        // Snap playhead to clip edges if magnet is enabled
        if (isMagnetEnabled && !e.shiftKey) {
            const snapThreshold = 10 / pxPerSec; // 10 pixels threshold
            let closestDiff = Infinity;
            let snapTarget = -1;

            project.tracks.forEach(track => {
                track.clips.forEach(clip => {
                    const startDiff = Math.abs(t - clip.startTime);
                    const endDiff = Math.abs(t - (clip.startTime + clip.duration));

                    if (startDiff < snapThreshold && startDiff < closestDiff) {
                        closestDiff = startDiff;
                        snapTarget = clip.startTime;
                    }
                    if (endDiff < snapThreshold && endDiff < closestDiff) {
                        closestDiff = endDiff;
                        snapTarget = clip.startTime + clip.duration;
                    }
                });
            });

            if (snapTarget !== -1) {
                t = snapTarget;
            }
        }
        
        onTimeChange(t);
      }

      // Box Selection Update
      if (selectionBox) {
        setSelectionBox(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
      }

      // Only update ghost time if we are hovering the tracks container and NOT dragging anything
      if (!isDraggingPlayhead && !dragging && !middlePanning && !selectionBox && tracksRef.current) {
         const rect = tracksRef.current.getBoundingClientRect();
         // Check if mouse is strictly within the tracks area
         if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
             const time = getT(e.clientX);
             setGhostTime(time);
         } else {
             setGhostTime(null);
         }
      } else {
         setGhostTime(null);
      }

      if (dragging) {
        const deltaSeconds = (e.clientX - dragging.startX) / pxPerSec;
        const { originalState, id, trackId } = dragging;
        const track = project.tracks.find(t => t.id === trackId);
        if (!track) return;
        const clip = track.clips.find(c => c.id === id);
        if (!clip) return;
        const asset = assets.find(a => a.id === clip.assetId);
        const assetDuration = asset ? asset.duration : 100;

        if (dragging.mode === 'MOVE') {
            let targetTrack = track;
            if (tracksRef.current) {
                const rect = tracksRef.current.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                let accumulatedHeight = 0;
                for (const t of project.tracks) {
                    accumulatedHeight += (t.height || 72);
                    if (relativeY < accumulatedHeight) { targetTrack = t; break; }
                }
            }
            if (!targetTrack.isLocked) {
                // Magnet Logic:
                // If Magnet is ON, Ctrl disables it (XOR: 1 ^ 1 = 0)
                // If Magnet is OFF, Ctrl enables it (XOR: 0 ^ 1 = 1)
                const isCtrl = e.ctrlKey || e.metaKey;
                const shouldSnap = isMagnetEnabled ? !isCtrl : isCtrl;
                
                const rawStartTime = Math.max(0, originalState.startTime + deltaSeconds);
                
                onClipMove(id, targetTrack.id, rawStartTime, shouldSnap);
            }
        } else if (dragging.mode === 'RESIZE_R') {
            // New duration = original duration + delta
            // Max duration = asset length - offset (only for video/audio)
            let newDur = Math.max(0.1, originalState.duration + deltaSeconds);
            const isUnlimited = clip.type === 'image' || clip.type === 'text';
            
            if (!isUnlimited && originalState.offset + newDur > assetDuration) {
                newDur = assetDuration - originalState.offset;
            }
            onClipResize(id, originalState.startTime, newDur, originalState.offset);

        } else if (dragging.mode === 'RESIZE_L') {
            // Start time changes, duration changes inverse, offset changes
            let newStart = originalState.startTime + deltaSeconds;
            let newDur = originalState.duration - deltaSeconds;
            let newOffset = originalState.offset + deltaSeconds;

            // Constraints
            const isSubtitle = track.type === 'subtitle';
            if (newOffset < 0 && !isSubtitle) {
               // Cannot start before asset starts (except for subtitles which have no fixed asset start)
               const correction = 0 - newOffset;
               newOffset = 0;
               newStart += correction; // Push start back
               newDur -= correction;
            }
            if (newDur < 0.1) {
                // Min duration
                newStart = originalState.startTime + originalState.duration - 0.1;
                newDur = 0.1;
                newOffset = originalState.offset + originalState.duration - 0.1;
            }
            
            onClipResize(id, Math.max(0, newStart), newDur, Math.max(0, newOffset));
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1) setMiddlePanning(null);
      if (dragging) onClipFinalize();
      setIsDraggingPlayhead(false);
      setDragging(null);

      // Finalize Box Selection
      if (selectionBox && tracksRef.current) {
        const rect = tracksRef.current.getBoundingClientRect();
        
        // Calculate selection box in timeline coordinates (time and track index)
        const startX = Math.min(selectionBox.startX, selectionBox.currentX);
        const endX = Math.max(selectionBox.startX, selectionBox.currentX);
        const startY = Math.min(selectionBox.startY, selectionBox.currentY);
        const endY = Math.max(selectionBox.startY, selectionBox.currentY);

        // Convert X to Time
        const startTime = Math.max(0, (startX - rect.left - HEADER_WIDTH) / pxPerSec);
        const endTime = Math.max(0, (endX - rect.left - HEADER_WIDTH) / pxPerSec);

        // Find intersecting clips
        const newSelectedIds: string[] = [];
        let currentY = rect.top;
        
        project.tracks.forEach(track => {
          const trackHeight = track.height || 72;
          const trackTop = currentY;
          const trackBottom = currentY + trackHeight;
          
          // Check if track is within vertical selection range
          if (trackBottom > startY && trackTop < endY) {
             track.clips.forEach(clip => {
               const clipStart = clip.startTime;
               const clipEnd = clip.startTime + clip.duration;
               
               // Check if clip is within horizontal time range
               // Box selection usually selects anything that touches the box or is fully inside.
               // Let's go with "touches" for easier selection.
               if (clipEnd > startTime && clipStart < endTime) {
                 newSelectedIds.push(clip.id);
               }
             });
          }
          currentY += trackHeight;
        });

        if (e.ctrlKey || e.metaKey) {
           // Add to existing selection
           const combined = new Set([...selectedClipIds, ...newSelectedIds]);
           onSelectClips(Array.from(combined));
        } else {
           onSelectClips(newSelectedIds);
        }
        setSelectionBox(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDraggingPlayhead, dragging, middlePanning, pxPerSec, project.tracks, ghostTime, selectionBox, selectedClipIds]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) { 
      // Handled by useEffect for preventDefault
    }
    else if (e.altKey && scrollRef.current) { e.preventDefault(); scrollRef.current.scrollLeft += e.deltaY * 5; }
  };

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleWheelEvent = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -2 : 2;
        setZoom(Math.min(100, Math.max(1, zoom + delta)));
      }
    };

    scrollContainer.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => scrollContainer.removeEventListener('wheel', handleWheelEvent);
  }, [zoom, setZoom]);

  const handleDrop = async (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('assetId');
    if (assetId) {
      const asset = assets.find(a => a.id === assetId);
      if (asset) onAddClipAtPosition(trackId, asset, getT(e.clientX));
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (const file of Array.from(e.dataTransfer.files) as File[]) {
        try { const asset = await AssetService.processFile(file); onAddAsset(asset); onAddClipAtPosition(trackId, asset, getT(e.clientX)); } catch (err) {}
      }
    }
  };

  const handleClipMouseMove = (e: React.MouseEvent, clip: Clip) => {
    const mode = getResizeMode(e, clip);
    e.currentTarget.style.cursor = mode === 'MOVE' ? 'grab' : 'col-resize';
  };

  const handleClipMouseDown = (e: React.MouseEvent, clip: Clip, trackId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    
    // Multi-selection logic
    if (e.ctrlKey || e.metaKey) {
      onSelectClip(clip.id, true);
    } else {
       if (!selectedClipIds.includes(clip.id)) {
         onSelectClip(clip.id, false);
       }
    }

    const mode = getResizeMode(e, clip);
    setDragging({ id: clip.id, startX: e.clientX, mode, trackId, originalState: { startTime: clip.startTime, duration: clip.duration, offset: clip.offset } });
  };

  const handleContextMenu = (e: React.MouseEvent, clipId: string, assetType: string) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    onSelectClip(clipId); 
    setContextMenu({ x: e.clientX, y: e.clientY, clipId, assetType });
  };

  const handleTrackAreaMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
       // Start Box Selection
       // We don't check e.target === e.currentTarget because we want to allow starting selection 
       // even if clicking on empty space within a track row (which are children).
       // Clips stop propagation, so this won't fire for clips.
       setSelectionBox({ startX: e.clientX, startY: e.clientY, currentX: e.clientX, currentY: e.clientY });
       if (!e.ctrlKey && !e.metaKey) {
         onSelectClip(null);
       }
    }
  };

  const timelineContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if focus is within the timeline container
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || activeElement?.getAttribute('contenteditable') === 'true';
      
      if (isInput) return;
      
      const isTimelineFocused = timelineContainerRef.current?.contains(activeElement);

      // Ctrl+A or Ctrl+ש (Hebrew 'a' is 'ש')
      if (isTimelineFocused && (e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A' || e.key === 'ש')) {
        e.preventDefault();
        const allClipIds = project.tracks.flatMap(t => t.clips.map(c => c.id));
        onSelectClips(allClipIds);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project.tracks, onSelectClips]);

  return (
    <div 
      ref={timelineContainerRef}
      tabIndex={0}
      className="flex-1 bg-[#0f0f0f] flex flex-col overflow-hidden border-t border-zinc-800 relative select-none outline-none" 
      onWheel={handleWheel} 
      onMouseDown={(e) => {
        // Focus timeline on click
        if (timelineContainerRef.current && document.activeElement !== timelineContainerRef.current) {
          timelineContainerRef.current.focus();
        }
        if (e.button === 1 && scrollRef.current) {
          e.preventDefault();
          setMiddlePanning({ startX: e.clientX, scrollLeft: scrollRef.current.scrollLeft });
        }
      }}
    >
      {contextMenu && (
        <div className="fixed z-[100] w-48 bg-[#1a1a1a] border border-zinc-700 rounded-lg shadow-2xl py-1 overflow-hidden" style={{ top: contextMenu.y, left: contextMenu.x }} onMouseDown={(e) => e.stopPropagation()}>
          <button onClick={() => { onClipSplit(contextMenu.clipId, currentTime); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-[11px] hover:bg-indigo-600 flex items-center gap-2 font-bold transition-colors">Split Selected</button>
          {contextMenu.assetType === 'video' && <button onClick={() => { onDetachAudio(contextMenu.clipId); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-[11px] hover:bg-indigo-600 flex items-center gap-2 font-bold border-t border-zinc-800">Unlink Audio</button>}
          <button onClick={() => { onClipDelete(contextMenu.clipId); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-[11px] hover:bg-red-600 text-red-400 hover:text-white flex items-center gap-2 font-bold border-t border-zinc-800">Delete</button>
        </div>
      )}

      <TimelineToolbar 
        canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} onSplit={() => onClipSplit(selectedClipIds[0], currentTime)}
        onDelete={() => selectedClipIds.length > 0 && selectedClipIds.forEach(id => onClipDelete(id))} onAddTrack={onAddTrack}
        isMagnet={isMagnetEnabled} onToggleMagnet={() => setIsMagnetEnabled(!isMagnetEnabled)}
        isAutoScroll={isAutoScrollEnabled} onToggleAutoScroll={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
        zoom={zoom} setZoom={setZoom} selectedClipCount={selectedClipIds.length}
        projectDuration={Math.max(10, ...project.tracks.flatMap(t => t.clips).map(c => c.startTime + c.duration))}
        onSyncToAnchors={onSyncToAnchors}
        onImportSubtitles={onImportSubtitles}
      />

      <div ref={scrollRef} className={`flex-1 overflow-auto relative custom-scrollbar flex flex-col ${middlePanning ? 'cursor-grabbing' : 'cursor-default'}`} onMouseDown={(e) => { if (e.button === 0 && e.target === e.currentTarget) { onSelectClip(null); onTimeChange(getT(e.clientX)); } }}>
        <div className="min-w-max relative flex-1">
          <div className="sticky top-0 h-8 bg-[#161616] border-b border-zinc-800 z-30 flex items-stretch cursor-pointer" onMouseDown={(e) => e.button === 0 && (e.preventDefault(), setIsDraggingPlayhead(true), onTimeChange(getT(e.clientX)))}>
            <div className="w-[150px] sticky left-0 bg-[#161616] z-40 border-r border-zinc-800 flex items-center px-4 font-mono text-[11px] text-indigo-400 font-bold">{Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}:{Math.floor((currentTime % 1) * 30).toString().padStart(2, '0')}</div>
            <div className="flex-1 relative h-full" style={{ width: 10000 * pxPerSec }}>{Array.from({ length: 200 }).map((_, i) => i % 5 === 0 && (<div key={i} className="absolute top-0 h-full border-l border-zinc-800/50 pl-1 text-[9px] text-zinc-600 font-mono" style={{ left: i * pxPerSec }}>{i}s</div>))}</div>
          </div>

          <div className="flex flex-col relative" ref={tracksRef} onMouseDown={handleTrackAreaMouseDown}>
            <KineticBlocksOverlay 
              project={project} 
              pxPerSec={pxPerSec} 
              selectedClipIds={selectedClipIds}
              kineticCutMode={store.kineticCutMode}
              onSelectBlock={(id) => onSelectClip(id)}
            />
            <TimelineTracks 
              project={project}
              assets={assets}
              zoom={zoom}
              selectedClipIds={selectedClipIds}
              onToggleTrack={onToggleTrack}
              onSetTrackHeight={onSetTrackHeight}
              onDrop={handleDrop}
              onSelectClip={onSelectClip}
              onSelectAllTrack={onSelectAllTrack}
              onContextMenu={handleContextMenu}
              onClipMouseDown={handleClipMouseDown}
              onClipMouseMove={handleClipMouseMove}
            />
            
            {/* Box Selection Overlay */}
            {selectionBox && (
              <div 
                className="absolute bg-indigo-500/20 border border-indigo-500 z-[60] pointer-events-none"
                style={{
                  left: Math.min(selectionBox.startX, selectionBox.currentX) - (tracksRef.current?.getBoundingClientRect().left || 0),
                  top: Math.min(selectionBox.startY, selectionBox.currentY) - (tracksRef.current?.getBoundingClientRect().top || 0),
                  width: Math.abs(selectionBox.currentX - selectionBox.startX),
                  height: Math.abs(selectionBox.currentY - selectionBox.startY)
                }}
              />
            )}
          </div>

          <div className="absolute top-0 bottom-0 w-px bg-red-500 z-50 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.5)]" style={{ left: HEADER_WIDTH + (currentTime * pxPerSec) }}>
              <div className="absolute top-0 -left-1.5 w-3 h-3 bg-red-500 rounded-sm rotate-45" />
          </div>

          {ghostTime !== null && (
              <div className="absolute top-8 bottom-0 w-px bg-white/20 z-40 pointer-events-none" style={{ left: HEADER_WIDTH + (ghostTime * pxPerSec) }}>
                  <div className="absolute top-2 left-1 text-[9px] font-mono text-zinc-400 bg-black/80 px-1 rounded">{ghostTime.toFixed(2)}s</div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
