
import React, { useRef, useState, useMemo } from 'react';
import { PreviewCanvas } from './PreviewCanvas';
import { PreviewControls } from './PreviewControls';
import { useAnimationLoop } from '../../hooks/useAnimationLoop';
import { useAudioSync } from '../../hooks/useAudioSync';

interface PreviewPlayerProps {
  store: any;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ store }) => {
  const { 
    project, assets, isPlaying, isLooping, currentTime, 
    setIsPlaying, setIsLooping, setCurrentTime, updateClip, 
    selectedClipIds, selectClip, isCanvasMagnetEnabled, setIsCanvasMagnetEnabled,
    showTransformControls, setShowTransformControls, applyToAll
  } = store;

  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [localTime, setLocalTime] = useState(currentTime);
  const [isDraggingSub, setIsDraggingSub] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [snapGuides, setSnapGuides] = useState({ x: false, y: false });
  const subDragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

  const totalDuration = useMemo(() => {
    if (project.tracks.every(t => t.clips.length === 0)) return 0;
    return Math.max(0, ...project.tracks.flatMap(t => t.clips).map(c => c.startTime + c.duration));
  }, [project.tracks]);

  const renderTime = isPlaying ? localTime : currentTime;

  // Main Animation Loop
  useAnimationLoop(
    isPlaying, isLooping, totalDuration, project, videoRef,
    (time) => { setLocalTime(time); setCurrentTime(time); },
    (time) => { setLocalTime(time); }
  );

  // Audio Sync (Web Audio API)
  useAudioSync(project, assets, isPlaying, renderTime);

  // Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    if (isDraggingSub && editingSubId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = (e.clientX - subDragStartRef.current.x) / rect.width;
      const dy = (e.clientY - subDragStartRef.current.y) / rect.height;
      updateClip(editingSubId, { position: { x: subDragStartRef.current.startX + dx, y: subDragStartRef.current.startY + dy } }, false, applyToAll);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (isDraggingSub && editingSubId) updateClip(editingSubId, {}, true, applyToAll);
    setIsDraggingSub(false);
  };

  const handleSubMouseDown = (e: React.MouseEvent, subId: string, pos: {x: number, y: number}) => {
    e.stopPropagation();
    setIsDraggingSub(true);
    setEditingSubId(subId);
    selectClip(subId);
    subDragStartRef.current = { x: e.clientX, y: e.clientY, startX: pos.x, startY: pos.y };
  };

  return (
    <div className="flex-1 flex flex-col relative group overflow-hidden border-x border-zinc-800/50">
      <div className="hidden">
        {project.tracks.flatMap(t => t.clips).map(c => {
          const asset = assets.find(a => a.id === c.assetId);
          if (!asset || (renderTime < c.startTime || renderTime > c.startTime + c.duration)) return null;
          return asset.type === 'VIDEO' ? 
            <video key={c.id} ref={videoRef} src={asset.url} playsInline muted /> : 
            <img key={c.id} ref={imageRef} src={asset.url} referrerPolicy="no-referrer" />;
        })}
      </div>

      <PreviewCanvas 
        project={project} assets={assets} renderTime={renderTime}
        scale={scale} pan={pan} selectedClipIds={selectedClipIds}
        isCanvasMagnetEnabled={isCanvasMagnetEnabled}
        showTransformControls={showTransformControls}
        videoRef={videoRef} imageRef={imageRef} containerRef={containerRef}
        store={store} setIsCanvasMagnetEnabled={setIsCanvasMagnetEnabled}
        setShowTransformControls={setShowTransformControls}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        onSubMouseDown={handleSubMouseDown} onSubDoubleClick={() => {}} 
        isDraggingSub={isDraggingSub} editingSubId={editingSubId} snapGuides={snapGuides}
      />

      <PreviewControls 
        isPlaying={isPlaying} isLooping={isLooping} currentTime={renderTime} scale={scale}
        setIsPlaying={setIsPlaying} setIsLooping={setIsLooping} setCurrentTime={setCurrentTime}
        setScale={setScale} resetView={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
      />
    </div>
  );
};
