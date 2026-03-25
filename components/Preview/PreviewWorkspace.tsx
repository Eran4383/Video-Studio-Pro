import React from 'react';
import { KineticTextDOM } from './KineticTextDOM';
import { TransformOverlay } from './TransformOverlay';
import { KineticDrawOverlay } from './KineticDrawOverlay';

interface PreviewWorkspaceProps {
  playerContainerRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  imageRef: React.RefObject<HTMLImageElement>;
  gfxCanvasRef: React.RefObject<HTMLCanvasElement>;
  project: any;
  assets: any[];
  scale: number;
  pan: { x: number, y: number };
  isFullscreen: boolean;
  activeVideoAsset: any;
  activeVideoClip: any;
  isVideoSilenceNeeded: boolean;
  activeSubs: any[];
  activeKineticBlocks: any[];
  renderTime: number;
  selectedClip: any;
  showTransform: boolean;
  isInteractingGFX: boolean;
  isPanning: boolean;
  isDraggingSub: boolean;
  snapGuides: { x: boolean, y: boolean };
  handleWheel: (e: React.WheelEvent) => void;
  handleCanvasMouseDown: (e: React.MouseEvent) => void;
  handleCanvasMouseMove: (e: React.MouseEvent) => void;
  handleCanvasMouseUp: () => void;
  handleSubMouseDown: (e: React.MouseEvent, id: string, pos: any) => void;
  handleSubDoubleClick: (e: React.MouseEvent, id: string, content: string) => void;
  toggleFullscreen: () => void;
  updateClip: any;
  applyToAll: boolean;
  setSnapGuides: (guides: any) => void;
  store: any;
}

export const PreviewWorkspace = ({
  playerContainerRef,
  containerRef,
  videoRef,
  imageRef,
  gfxCanvasRef,
  project,
  assets,
  scale,
  pan,
  isFullscreen,
  activeVideoAsset,
  activeVideoClip,
  isVideoSilenceNeeded,
  activeSubs,
  activeKineticBlocks,
  renderTime,
  selectedClip,
  showTransform,
  isInteractingGFX,
  isPanning,
  isDraggingSub,
  snapGuides,
  handleWheel,
  handleCanvasMouseDown,
  handleCanvasMouseMove,
  handleCanvasMouseUp,
  handleSubMouseDown,
  handleSubDoubleClick,
  toggleFullscreen,
  updateClip,
  applyToAll,
  setSnapGuides,
  store
}: PreviewWorkspaceProps) => {
  return (
    <div 
      ref={playerContainerRef}
      className={`relative flex-1 flex items-center justify-center bg-[#1a1a1a] overflow-hidden cursor-default ${isFullscreen ? 'p-0 w-screen h-screen' : 'p-8'}`}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onDoubleClick={toggleFullscreen}
      onClick={() => store.setSelectedKineticWordId(null)}
    >
      <div 
        ref={containerRef}
        className="absolute origin-center shadow-2xl"
        style={{ 
          width: project.resolution.width,
          height: project.resolution.height,
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${scale})`,
          backgroundColor: project.backgroundColor || '#000000',
        }}
      >
        {/* Hidden Media Container */}
        <div className="absolute inset-0 pointer-events-none opacity-0 -z-50 overflow-hidden">
          {activeVideoAsset && activeVideoClip && (
            activeVideoAsset.type === 'VIDEO' ? (
              <video 
                key={activeVideoAsset.id}
                ref={videoRef} 
                src={activeVideoAsset.url} 
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                muted={isVideoSilenceNeeded}
              />
            ) : (
              <img 
                key={activeVideoAsset.id}
                ref={imageRef}
                src={activeVideoAsset.url} 
                className="absolute inset-0 w-full h-full"
                referrerPolicy="no-referrer" 
              />
            )
          )}
        </div>
        
        <canvas 
          ref={gfxCanvasRef} 
          width={project.resolution?.width || 1920} 
          height={project.resolution?.height || 1080} 
          className={`absolute inset-0 w-full h-full z-10 ${isInteractingGFX ? 'cursor-grabbing' : isPanning ? 'cursor-move' : 'cursor-default'}`} 
          style={{ imageRendering: 'auto' }}
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
          )
        })}

        {activeKineticBlocks.map((block: any) => (
          <KineticTextDOM key={block.id} block={block} currentTime={renderTime} store={store} showTransformControls={showTransform} />
        ))}

        {snapGuides.x && (
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-emerald-500 z-50 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        )}
        {snapGuides.y && (
          <div className="absolute left-0 right-0 top-1/2 h-px bg-emerald-500 z-50 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        )}

        {showTransform && selectedClip && (
          (() => {
            const track = project.tracks.find((t: any) => t.clips.some((c: any) => c.id === selectedClip.id));
            const isVisual = track && (track.type === 'video' || track.type === 'image' || track.type === 'subtitle');
            const isVisible = renderTime >= selectedClip.startTime && renderTime < selectedClip.startTime + selectedClip.duration;
            if (!isVisual || !isVisible) return null;

            const isVideo = track?.type === 'video' || track?.type === 'image';
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
                if (assetAspect > containerAspect) height = containerW / assetAspect;
                else width = containerH * assetAspect;
                mediaDimensions = { width, height };
              }
            }

            return (
              <TransformOverlay 
                clip={selectedClip}
                containerRef={containerRef}
                isVideo={isVideo}
                mediaDimensions={mediaDimensions}
                isCanvasMagnetEnabled={store.isCanvasMagnetEnabled}
                onUpdate={(pos, scale, rot, scaleX, scaleY, e) => {
                  let newPos = { ...pos };
                  const isSnappingActive = store.isCanvasMagnetEnabled && !e?.ctrlKey;
                  const guides = { x: false, y: false };
                  
                  if (isSnappingActive) {
                    if (newPos.x === 0.5) guides.x = true;
                    if (newPos.y === 0.5) guides.y = true;
                  }
                  
                  setSnapGuides(guides);
                  if (updateClip) {
                    updateClip(selectedClip.id, { 
                      position: newPos, 
                      scale, 
                      rotation: rot, 
                      scaleX, 
                      scaleY 
                    }, false, applyToAll);
                  }
                }}
                onFinalize={() => {
                  setSnapGuides({ x: false, y: false });
                  if (updateClip) {
                    updateClip(selectedClip.id, {}, true, applyToAll);
                  }
                }}
              />
            );
          })()
        )}
        
        <KineticDrawOverlay store={store} />
      </div>
    </div>
  );
};
