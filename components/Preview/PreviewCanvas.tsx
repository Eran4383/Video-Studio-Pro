
import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
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
  onWheel: (e: React.WheelEvent) => void;
  // Subtitle handlers
  onSubMouseDown: (e: React.MouseEvent, subId: string, currentPos: {x: number, y: number}) => void;
  onSubDoubleClick: (e: React.MouseEvent, subId: string, content: string) => void;
  isDraggingSub: boolean;
  editingSubId: string | null;
  snapGuides: { x: boolean, y: boolean };
}

export const PreviewCanvas = ({
  project, assets, renderTime, scale, pan, selectedClipIds,
  isCanvasMagnetEnabled, showTransformControls, videoRef, imageRef, containerRef, store,
  setIsCanvasMagnetEnabled, setShowTransformControls, onMouseDown, onMouseMove, onMouseUp,
  onWheel,
  onSubMouseDown, onSubDoubleClick, isDraggingSub, editingSubId, snapGuides
}: PreviewCanvasProps) => {
  const gfxCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveOverrides = useRef<Record<string, any>>({});

  const selectedClip = project.tracks.flatMap(t => t.clips).find(c => selectedClipIds.includes(c.id));
  const activeVideoClip = project.tracks.slice().reverse()
    .filter(t => (t.type === 'video' || (t.type as string) === 'image') && t.isVisible)
    .flatMap(t => t.clips)
    .find(c => renderTime >= c.startTime && renderTime < c.startTime + c.duration);
  const activeVideoAsset = activeVideoClip ? assets.find(a => a.id === activeVideoClip.assetId) : null;

  const latestProps = useRef({ project, renderTime, activeVideoClip, activeVideoAsset, videoRef, imageRef });

  useEffect(() => {
    latestProps.current = { project, renderTime, activeVideoClip, activeVideoAsset, videoRef, imageRef };
  }, [project, renderTime, activeVideoClip, activeVideoAsset, videoRef, imageRef]);

  // Render GFX
  const renderGFX = () => {
    const canvas = gfxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { project: p, renderTime: rt, activeVideoClip: avc, activeVideoAsset: ava, videoRef: vr, imageRef: ir } = latestProps.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const activeMedia = avc && (vr.current || ir.current) ? {
        element: (ava?.type === 'VIDEO' ? vr.current : ir.current) as HTMLVideoElement | HTMLImageElement,
        clipId: avc.id,
        asset: ava
    } : undefined;

    GFX_Engine.render(ctx, p, rt, liveOverrides.current, activeMedia);
  };

  useEffect(() => {
    renderGFX();
  }, [project, renderTime, activeVideoClip, activeVideoAsset, videoRef, imageRef]);

  // Listen for Live Overrides
  useEffect(() => {
    let rafId: number;
    const handleOverride = (e: Event) => {
      const { clipId, property, value } = (e as CustomEvent).detail;
      
      if (!liveOverrides.current[clipId]) {
        liveOverrides.current[clipId] = {};
      }
      liveOverrides.current[clipId][property] = value;

      // Direct DOM manipulation for subtitles
      const subDom = document.getElementById(`sub-dom-${clipId}`);
      if (subDom) {
        const overrides = liveOverrides.current[clipId];
        const clip = project.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
        const x = overrides.posX !== undefined ? overrides.posX : (clip?.position?.x ?? 0.5) * 100;
        const y = overrides.posY !== undefined ? overrides.posY : (clip?.position?.y ?? 0.9) * 100;
        const rot = overrides.rotation !== undefined ? overrides.rotation : (clip?.rotation ?? 0);
        
        subDom.style.left = `${x}%`;
        subDom.style.top = `${y}%`;
        subDom.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
      }

      const subText = document.getElementById(`sub-text-${clipId}`);
      if (subText && property === 'scale') {
         subText.style.fontSize = `${(value / 100) * 1.25}rem`;
      }

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(renderGFX);
    };

    const handleClear = () => {
      liveOverrides.current = {};
      // We don't call renderGFX here to avoid a 1-frame flicker.
      // The canvas will be re-rendered by the useEffect when the React state updates.
      // If the state doesn't update (value didn't change), the canvas will still look correct
      // because the override value matches the current state.
    };

    window.addEventListener('gfx-override', handleOverride);
    window.addEventListener('gfx-override-clear', handleClear);
    return () => {
      window.removeEventListener('gfx-override', handleOverride);
      window.removeEventListener('gfx-override-clear', handleClear);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [project, renderTime, activeVideoClip, activeVideoAsset, videoRef, imageRef]);

  const activeSubs = project.tracks
    .filter(t => t.isVisible)
    .flatMap(t => t.clips)
    .filter(c => c.content && renderTime >= c.startTime && renderTime < c.startTime + c.duration);

  const activeKineticBlocks = (project.kineticBlocks || []).map((b: any) => {
    const clips = project.tracks.flatMap(t => t.clips).filter(c => b.clipIds.includes(c.id));
    if (clips.length === 0) return null;
    const startTime = Math.min(...clips.map(c => c.startTime));
    const endTime = Math.max(...clips.map(c => c.startTime + c.duration));
    return { ...b, startTime, endTime };
  }).filter((b: any) => b && renderTime >= b.startTime && renderTime < b.endTime);

  return (
    <div 
      className="flex-1 flex items-center justify-center p-6 overflow-hidden cursor-default relative bg-[#18181b]"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
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
                  className="select-none"
                  style={{ 
                    color: sub.color || '#ffffff', 
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                    fontFamily: sub.font || 'Inter, sans-serif',
                    fontSize: `${(sub.scale || 1) * 1.25}rem`,
                    fontWeight: sub.fontWeight || 'normal',
                    fontStyle: sub.isItalic ? 'italic' : 'normal',
                    textDecoration: sub.isUnderline ? 'underline' : 'none',
                    textAlign: sub.textAlign || 'center',
                    width: 'max-content',
                    maxWidth: '80vw',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  <ReactMarkdown 
                    rehypePlugins={[rehypeRaw]}
                    remarkPlugins={[remarkBreaks]}
                    components={{
                      p: ({node, ...props}) => <div style={{ margin: 0, display: 'block', width: '100%' }} {...props} />,
                      b: ({node, ...props}) => <strong style={{ fontWeight: 'bold' }} {...props} />,
                      strong: ({node, ...props}) => <strong style={{ fontWeight: 'bold' }} {...props} />,
                      i: ({node, ...props}) => <em style={{ fontStyle: 'italic' }} {...props} />,
                      em: ({node, ...props}) => <em style={{ fontStyle: 'italic' }} {...props} />,
                      u: ({node, ...props}) => <u style={{ textDecoration: 'underline' }} {...props} />,
                    }}
                  >
                    {sub.content || ""}
                  </ReactMarkdown>
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
            const isVisual = track && (track.type === 'video' || (track.type as string) === 'image' || track.type === 'subtitle');
            const isVisible = renderTime >= selectedClip.startTime && renderTime < selectedClip.startTime + selectedClip.duration;
            return isVisual && isVisible;
          })()
        ) && (
          <TransformOverlay 
            clip={selectedClip}
            containerRef={containerRef}
            isVideo={project.tracks.find(t => t.clips.some(c => c.id === selectedClip.id))?.type === 'video'}
            onUpdate={(pos, scale, rot, scaleX, scaleY) => {
              window.dispatchEvent(new CustomEvent('gfx-override', { detail: { clipId: selectedClip.id, property: 'posX', value: pos.x * 100 } }));
              window.dispatchEvent(new CustomEvent('gfx-override', { detail: { clipId: selectedClip.id, property: 'posY', value: pos.y * 100 } }));
              window.dispatchEvent(new CustomEvent('gfx-override', { detail: { clipId: selectedClip.id, property: 'scale', value: scale * 100 } }));
              window.dispatchEvent(new CustomEvent('gfx-override', { detail: { clipId: selectedClip.id, property: 'rotation', value: rot } }));
              if (scaleX !== undefined) window.dispatchEvent(new CustomEvent('gfx-override', { detail: { clipId: selectedClip.id, property: 'scaleX', value: scaleX * 100 } }));
              if (scaleY !== undefined) window.dispatchEvent(new CustomEvent('gfx-override', { detail: { clipId: selectedClip.id, property: 'scaleY', value: scaleY * 100 } }));
            }}
            onFinalize={() => {
              const overrides = liveOverrides.current[selectedClip.id];
              if (overrides) {
                const updates: any = {};
                if (overrides.posX !== undefined || overrides.posY !== undefined) {
                  updates.position = {
                    x: overrides.posX !== undefined ? overrides.posX / 100 : selectedClip.position?.x ?? 0.5,
                    y: overrides.posY !== undefined ? overrides.posY / 100 : selectedClip.position?.y ?? 0.5
                  };
                }
                if (overrides.scale !== undefined) updates.scale = overrides.scale / 100;
                if (overrides.rotation !== undefined) updates.rotation = overrides.rotation;
                if (overrides.scaleX !== undefined) updates.scaleX = overrides.scaleX / 100;
                if (overrides.scaleY !== undefined) updates.scaleY = overrides.scaleY / 100;
                
                if (Object.keys(updates).length > 0) {
                  store.updateClip(selectedClip.id, updates, true, store.applyToAll);
                }
              }
              window.dispatchEvent(new CustomEvent('gfx-override-clear'));
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
