import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Scan } from 'lucide-react';
import { Tooltip } from '../UI/Tooltip';
import { usePreviewAnimation } from '../../hooks/usePreviewAnimation';
import { usePreviewMediaSync } from '../../hooks/usePreviewMediaSync';
import { usePreviewInteractions } from '../../hooks/usePreviewInteractions';
import { PreviewWorkspace } from './PreviewWorkspace';
import { PreviewControls } from './PreviewControls';

interface PreviewPlayerProps {
  store: any;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ store }) => {
  const { 
    project, assets, isPlaying, isLooping, currentTime, 
    setIsPlaying, setIsLooping, setCurrentTime, updateSubtitle, 
    selectedClipIds, selectClip, setProject, finalizeMove, applyToAll 
  } = store;

  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const gfxCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showTransform, setShowTransform] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapGuides, setSnapGuides] = useState({ x: false, y: false });

  const localTimeRef = useRef(currentTime);
  const currentTimeRef = useRef(currentTime);
  const liveOverrides = useRef<Record<string, any>>({});

  const totalDuration = useMemo(() => {
    if (project.tracks.every((t: any) => t.clips.length === 0)) return 0;
    return Math.max(0, ...project.tracks.flatMap((t: any) => t.clips).map((c: any) => c.startTime + c.duration));
  }, [project.tracks]);

  const renderTime = isPlaying ? localTimeRef.current : currentTime;

  const activeVideoClip = project.tracks.slice().reverse()
    .filter((t: any) => t.type === 'video' && t.isVisible)
    .flatMap((t: any) => t.clips)
    .find((c: any) => {
      const asset = assets.find(a => a.id === c.assetId);
      return renderTime >= c.startTime && renderTime <= c.startTime + c.duration && (asset?.type === 'VIDEO' || asset?.type === 'IMAGE');
    });
  const activeVideoAsset = activeVideoClip ? assets.find(a => a.id === activeVideoClip.assetId) : null;
  const isVideoSilenceNeeded = activeVideoClip?.isSilent || project.tracks.find((t: any) => t.clips.some((c: any) => c.id === activeVideoClip?.id))?.isMuted;

  const activeSubs = project.tracks
    .filter((t: any) => t.isVisible)
    .flatMap((t: any) => t.clips)
    .filter((c: any) => c.content && renderTime >= c.startTime && renderTime <= c.startTime + c.duration);

  const activeKineticBlocks = (project.kineticBlocks || []).map((b: any) => {
    const clips = project.tracks.flatMap((t: any) => t.clips).filter((c: any) => b.clipIds.includes(c.id));
    if (clips.length === 0) return null;
    const startTime = Math.min(...clips.map((c: any) => c.startTime));
    const endTime = Math.max(...clips.map((c: any) => c.startTime + c.duration));
    return { ...b, startTime, endTime };
  }).filter((b: any) => b && renderTime >= b.startTime && renderTime <= b.endTime);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerContainerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const resetView = React.useCallback(() => {
    if (playerContainerRef.current) {
      const padding = 60;
      const availableW = playerContainerRef.current.clientWidth - padding;
      const availableH = playerContainerRef.current.clientHeight - padding;
      
      const newScale = Math.min(availableW / project.resolution.width, availableH / project.resolution.height);
      setScale(newScale);
      setPan({ x: 0, y: 0 });
    }
  }, [project.resolution.width, project.resolution.height]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => resetView());
    if (playerContainerRef.current) resizeObserver.observe(playerContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [resetView]);

  usePreviewAnimation({
    isPlaying, currentTime, setCurrentTime, setIsPlaying, project, assets,
    localTimeRef, currentTimeRef, videoRef, imageRef, gfxCanvasRef,
    audioElementsRef, liveOverrides, totalDuration, isLooping
  });

  usePreviewMediaSync({
    isPlaying, currentTime, renderTime, project, assets, videoRef,
    audioContainerRef, audioElementsRef, activeVideoAsset, activeVideoClip, isVideoSilenceNeeded
  });

  const interactions = usePreviewInteractions({
    project, selectedClipIds, selectClip, updateSubtitle, applyToAll,
    finalizeMove, setProject, gfxCanvasRef, scale, setScale, pan, setPan, toggleFullscreen
  });

  return (
    <div className="flex flex-col w-full h-full relative bg-[#0a0a0a] border-x border-zinc-800/50">
      <div ref={audioContainerRef} className="hidden" aria-hidden="true" />
      
      {/* Viewport - The flexible window that hides overflows */}
      <div ref={playerContainerRef} className="relative flex-1 w-full overflow-hidden flex items-center justify-center">
        <PreviewWorkspace 
          {...interactions}
          playerContainerRef={playerContainerRef}
          containerRef={containerRef}
          videoRef={videoRef}
          imageRef={imageRef}
          gfxCanvasRef={gfxCanvasRef}
          project={project}
          assets={assets}
          scale={scale}
          pan={pan}
          isFullscreen={isFullscreen}
          activeVideoAsset={activeVideoAsset}
          activeVideoClip={activeVideoClip}
          isVideoSilenceNeeded={isVideoSilenceNeeded}
          activeSubs={activeSubs}
          activeKineticBlocks={activeKineticBlocks}
          renderTime={renderTime}
          selectedClip={project.tracks.flatMap((t: any) => t.clips).find((c: any) => selectedClipIds.includes(c.id))}
          showTransform={showTransform}
          snapGuides={snapGuides}
          setSnapGuides={setSnapGuides}
          toggleFullscreen={toggleFullscreen}
          updateSubtitle={updateSubtitle}
          applyToAll={applyToAll}
          store={store}
        />

        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-40">
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
      </div>

      <PreviewControls 
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        isLooping={isLooping}
        setIsLooping={setIsLooping}
        currentTime={currentTime}
        setCurrentTime={setCurrentTime}
        scale={scale}
        setScale={setScale}
        resetView={resetView}
        toggleFullscreen={toggleFullscreen}
      />
    </div>
  );
};
