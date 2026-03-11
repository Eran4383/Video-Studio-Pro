import React, { useRef, useEffect } from 'react';
import { GFX_Engine } from '../services/GFX_Engine';

interface UsePreviewAnimationProps {
  isPlaying: boolean;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  project: any;
  assets: any[];
  localTimeRef: React.MutableRefObject<number>;
  currentTimeRef: React.MutableRefObject<number>;
  videoRef: React.RefObject<HTMLVideoElement>;
  imageRef: React.RefObject<HTMLImageElement>;
  gfxCanvasRef: React.RefObject<HTMLCanvasElement>;
  audioElementsRef: React.RefObject<Map<string, HTMLAudioElement>>;
  liveOverrides: React.MutableRefObject<Record<string, any>>;
  totalDuration: number;
  isLooping: boolean;
}

export const usePreviewAnimation = ({
  isPlaying,
  currentTime,
  setCurrentTime,
  setIsPlaying,
  project,
  assets,
  localTimeRef,
  currentTimeRef,
  videoRef,
  imageRef,
  gfxCanvasRef,
  audioElementsRef,
  liveOverrides,
  totalDuration,
  isLooping
}: UsePreviewAnimationProps) => {
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const lastGlobalUpdateRef = useRef<number>(performance.now());

  const animate = (time: number) => {
    if (isPlaying) {
      let nextTime = localTimeRef.current;
      let synced = false;

      // 1. Audio-Slaved Timing
      for (const [clipId, audioEl] of audioElementsRef.current.entries()) {
        if (!audioEl.paused && !audioEl.ended && audioEl.readyState >= 2) {
          let foundClip: any = null;
          for (const t of project.tracks) {
            if (t.type === 'audio') {
              const c = t.clips.find((c: any) => c.id === clipId);
              if (c) { foundClip = c; break; }
            }
          }
          
          if (foundClip) {
            const calculatedTime = audioEl.currentTime - foundClip.offset + foundClip.startTime;
            if (Math.abs(calculatedTime - localTimeRef.current) < 1.0) {
              nextTime = calculatedTime;
              synced = true;
              break;
            }
          }
        }
      }

      // 2. Video-Slaved Timing
      if (!synced && videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 2) {
        const currentT = localTimeRef.current;
        const vidClip = project.tracks
          .filter((t: any) => t.type === 'video' && t.isVisible)
          .flatMap((t: any) => t.clips)
          .find((c: any) => currentT >= c.startTime && currentT <= c.startTime + c.duration);
          
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

      if (totalDuration > 0 && nextTime >= totalDuration) {
        if (isLooping) {
          localTimeRef.current = 0;
          setCurrentTime(0);
          lastTimeRef.current = performance.now();
        } else {
          localTimeRef.current = totalDuration;
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
        
        const activeVideoClip = project.tracks.slice().reverse()
          .filter((t: any) => t.type === 'video' && t.isVisible)
          .flatMap((t: any) => t.clips)
          .find((c: any) => {
            const asset = assets.find(a => a.id === c.assetId);
            return currentRenderTime >= c.startTime && currentRenderTime <= c.startTime + c.duration && (asset?.type === 'VIDEO' || asset?.type === 'IMAGE');
          });
        const activeVideoAsset = activeVideoClip ? assets.find(a => a.id === activeVideoClip.assetId) : null;
        
        const element = activeVideoAsset?.type === 'VIDEO' ? videoRef.current : imageRef.current;
        const activeMedia = activeVideoClip && element ? {
          element,
          clipId: activeVideoClip.id,
          asset: activeVideoAsset
        } : undefined;

        GFX_Engine.render(ctx, project, currentRenderTime, liveOverrides.current, activeMedia);
      }
    }

    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, isLooping, totalDuration, project]);

  return { requestRef };
};
