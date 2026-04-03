
import React, { useEffect, useRef } from 'react';
import { Project } from '../types';

/**
 * useAnimationLoop manages the main playback loop for the video editor.
 * It handles time updates, synchronization between video and system clock,
 * and triggers GFX rendering.
 */
export const useAnimationLoop = (
  isPlaying: boolean,
  isLooping: boolean,
  totalDuration: number,
  project: Project,
  currentTime: number,
  onUpdate: (time: number) => void,
  onRender: (time: number) => void,
  mediaElementsRef?: React.RefObject<Record<string, HTMLVideoElement | HTMLImageElement>>
) => {
  const localTimeRef = useRef(currentTime);
  const lastTimeRef = useRef(performance.now());
  const lastGlobalUpdateRef = useRef(performance.now());
  const requestRef = useRef<number>(null);

  // Sync localTimeRef with currentTime when seeking or when paused
  useEffect(() => {
    if (!isPlaying || Math.abs(currentTime - localTimeRef.current) > 0.1) {
      localTimeRef.current = currentTime;
    }
  }, [currentTime, isPlaying]);

  const animate = (time: number) => {
    if (isPlaying) {
      let nextTime = localTimeRef.current;
      let synced = false;

      // 1. Video-Slaved Timing (Priority: Video -> Clock)
      const activeVideoClips = project.tracks
        .filter(t => t.type === 'video' && t.isVisible)
        .flatMap(t => t.clips)
        .filter(c => localTimeRef.current >= c.startTime && localTimeRef.current <= c.startTime + c.duration);
        
      if (activeVideoClips.length > 0) {
          // Use the top-most active video for timing
          const vidClip = activeVideoClips[activeVideoClips.length - 1];
          const videoEl = mediaElementsRef?.current ? mediaElementsRef.current[vidClip.id] as HTMLVideoElement : document.getElementById(`media-${vidClip.id}`) as HTMLVideoElement;
          
          if (videoEl && !videoEl.paused && videoEl.readyState >= 2) {
              const calculatedTime = videoEl.currentTime - vidClip.offset + vidClip.startTime;
               if (Math.abs(calculatedTime - localTimeRef.current) < 1.0) {
                   nextTime = calculatedTime;
                   synced = true;
               }
          }
      }

      // 2. Fallback to System Clock
      if (!synced) {
          const deltaTime = (time - lastTimeRef.current) / 1000;
          nextTime = localTimeRef.current + deltaTime;
      }

      localTimeRef.current = nextTime;

      if (totalDuration > 0 && nextTime >= totalDuration) {
        if (isLooping) {
          localTimeRef.current = 0;
          onUpdate(0);
          lastTimeRef.current = performance.now();
        } else {
          localTimeRef.current = totalDuration;
          onUpdate(totalDuration);
          // Trigger stop
        }
      } else {
        // Update global state every 100ms to avoid excessive React renders
        if (time - lastGlobalUpdateRef.current > 100) {
          onUpdate(nextTime);
          lastGlobalUpdateRef.current = time;
        }
      }
    }

    onRender(localTimeRef.current);
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, isLooping, totalDuration, project]);

  return { localTimeRef };
};
