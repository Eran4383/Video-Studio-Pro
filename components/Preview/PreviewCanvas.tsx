
import React, { useRef, useEffect } from 'react';
import { Project, Asset, Clip } from '../../types';
import { GFX_Engine } from '../../services/GFX_Engine';
import { TransformOverlay } from './TransformOverlay';
import { KineticTextDOM } from './KineticTextDOM';
import { KineticDrawOverlay } from './KineticDrawOverlay';
import { Magnet, Scan } from 'lucide-react';
import { Tooltip } from '../UI/Tooltip';

interface PreviewCanvasProps {
  project: Project;
  assets: Asset[];
  renderTime: number;
  scale: number;
  pan: { x: number, y: number };
  selectedClipIds: string[];
  isCanvasMagnetEnabled: boolean;
  showTransformControls: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  imageRef: React.RefObject<HTMLImageElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  store: any;
  setIsCanvasMagnetEnabled: (enabled: boolean) => void;
  setShowTransformControls: (show: boolean) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  // Subtitle handlers
  onSubMouseDown: (e: React.MouseEvent, subId: string, currentPos: {x: number, y: number}) => void;
  onSubDoubleClick: (e: React.MouseEvent, subId: string, content: string) => void;
  isDraggingSub: boolean;
  editingSubId: string | null;
  snapGuides: { x: boolean, y: boolean };
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  project, assets, renderTime, scale, pan, selectedClipIds,
  isCanvasMagnetEnabled, showTransformControls, videoRef, imageRef, containerRef, store,
  setIsCanvasMagnetEnabled, setShowTransformControls, onMouseDown, onMouseMove, onMouseUp,
  onSubMouseDown, onSubDoubleClick, isDraggingSub, editingSubId, snapGuides
}) => {
  const gfxCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveOverrides = useRef<Record<string, any>>({});

  const selectedClip = project.tracks.flatMap(t => t.clips).find(c => selectedClipIds.includes(c.id));
  const activeVideoClip = project.tracks.slice().reverse()
    .filter(t => (t.type === 'video' || t.type === 'image') && t.isVisible)
    .flatMap(t => t.clips)
    .find(c => renderTime >= c.startTime && renderTime <= c.startTime + c.duration);
  const activeVideoAsset = activeVideoClip ? assets.find(a => a.id === activeVideoClip.assetId) : null;

  // Render GFX
  useEffect(() => {
    const canvas = gfxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const activeMedia = activeVideoClip && (videoRef.current || imageRef.current) ? {
        element: (activeVideoAsset?.type === 'VIDEO' ? videoRef.current : imageRef.current) as HTMLVideoElement | HTMLImageElement,
        clipId: activeVideoClip.id,
        asset: activeVideoAsset
    } : undefined;

    GFX_Engine.render(ctx, project, renderTime, liveOverrides.current, activeMedia);
  }, [project, renderTime, activeVideoClip, activeVideoAsset, videoRef, imageRef]);

  const activeSubs = project.tracks
    .filter(t => t.isVisible)
    .flatMap(t => t.clips)
    .filter(c => c.content && renderTime >= c.startTime && renderTime <= c.startTime + c.duration);

  const activeKineticBlocks = (project.kineticBlocks || []).map((b: any) => {
    const clips = project.tracks.flatMap(t => t.clips).filter(c => b.clipIds.includes(c.id));
    if (clips.length === 0) return null;
    const startTime = Math.min(...clips.map(c => c.startTime));
    const endTime = Math.max(...clips.map(c => c.startTime + c.duration));
    return { ...b, startTime, endTime };
  }).filter((b: any) => b && renderTime >= b.startTime && renderTime <= b.endTime);

  return (
    <div 
      className="flex-1 flex items-center justify-center p-6 overflow-hidden cursor-default relative bg-[#18181b]"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div 
        ref={containerRef}
        className="rounded shadow-2xl border border-white/5 flex items-center justify-center overflow-hidden relative transition-transform duration-75 ease-out"
        style={{ 
          transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`, 
          backgroundColor: project.backgroundColor || '#000000',
          aspectRatio: `${project.resolution.width} / ${project.resolution.height}`,
          maxWidth: '100%', maxHeight: '100%',
          width: project.resolution.width > project.resolution.height ? '100%' : 'auto',
          height: project.resolution.height >= project.resolution.width ? '100%' : 'auto'
        }}
      >
        <canvas 
          ref={gfxCanvasRef} 
          width={project.resolution?.width || 1920} 
          height={project.resolution?.height || 1080} 
          className="absolute inset-0 w-full h-full z-10" 
        />

        {/* Subtitles Overlay */}
        {activeSubs.map(sub => {
          const isPartOfBlock = project.kineticBlocks?.some((b: any) => b.clipIds.includes(sub.id));
          if (isPartOfBlock) return null;

          return (
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
              onMouseDown={(e) => onSubMouseDown(e, sub.id, sub.position || {x: 0.5, y: 0.9})}
              onDoubleClick={(e) => onSubDoubleClick(e, sub.id, sub.content || "")}
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
          );
        })}

        {/* Kinetic Blocks Overlay */}
        {activeKineticBlocks.map((block: any) => (
          <KineticTextDOM 
            key={block.id} 
            block={block} 
            currentTime={renderTime} 
            store={store} 
            showTransformControls={showTransformControls} 
          />
        ))}

        {/* Snap Guides */}
        {snapGuides.x && (
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-emerald-500 z-50 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        )}
        {snapGuides.y && (
          <div className="absolute left-0 right-0 top-1/2 h-px bg-emerald-500 z-50 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        )}

        {/* Transform Overlay */}
        {showTransformControls && selectedClip && (
          (() => {
            const track = project.tracks.find(t => t.clips.some(c => c.id === selectedClip.id));
            const isVisual = track && (track.type === 'video' || track.type === 'image' || track.type === 'subtitle');
            const isVisible = renderTime >= selectedClip.startTime && renderTime <= selectedClip.startTime + selectedClip.duration;
            return isVisual && isVisible;
          })()
        ) && (
          <TransformOverlay 
            clip={selectedClip}
            containerRef={containerRef}
            isVideo={project.tracks.find(t => t.clips.some(c => c.id === selectedClip.id))?.type === 'video'}
            onUpdate={(pos, scale, rot, scaleX, scaleY) => {
              store.updateClip(selectedClip.id, { position: pos, scale, rotation: rot, scaleX, scaleY }, false, store.applyToAll);
            }}
            onFinalize={() => {
              store.updateClip(selectedClip.id, {}, true, store.applyToAll);
            }}
          />
        )}
        
        <KineticDrawOverlay store={store} />
      </div>

      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-40">
        <div className="pointer-events-auto">
          <Tooltip text="Toggle Transform Controls" position="right">
            <button 
              onClick={() => setShowTransformControls(!showTransformControls)} 
              className={`p-2 rounded-lg transition-all ${showTransformControls ? 'bg-indigo-600 text-white' : 'bg-black/50 text-zinc-400 hover:text-white'}`}
            >
              <Scan size={16} />
            </button>
          </Tooltip>
        </div>
        <div className="pointer-events-auto">
          <Tooltip text="Magnetic Snapping" position="right">
            <button 
              onClick={() => setIsCanvasMagnetEnabled(!isCanvasMagnetEnabled)} 
              className={`p-2 rounded-lg transition-all ${isCanvasMagnetEnabled ? 'bg-indigo-600 text-white' : 'bg-black/50 text-zinc-400 hover:text-white'}`}
            >
              <Magnet size={16} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
