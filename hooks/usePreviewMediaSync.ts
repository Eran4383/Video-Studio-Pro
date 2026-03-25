import React, { useEffect, useRef } from 'react';
import { webAudioService } from '../services/WebAudioService';

interface UsePreviewMediaSyncProps {
  isPlaying: boolean;
  currentTime: number;
  renderTime: number;
  project: any;
  assets: any[];
  videoRef: React.RefObject<HTMLVideoElement>;
  audioContainerRef: React.RefObject<HTMLDivElement>;
  audioElementsRef: React.RefObject<Map<string, HTMLAudioElement>>;
  activeVideoAsset: any;
  activeVideoClip: any;
  isVideoSilenceNeeded: boolean;
}

export const usePreviewMediaSync = ({
  isPlaying,
  currentTime,
  renderTime,
  project,
  assets,
  videoRef,
  audioContainerRef,
  audioElementsRef,
  activeVideoAsset,
  activeVideoClip,
  isVideoSilenceNeeded
}: UsePreviewMediaSyncProps) => {
  const lastIsPlaying = useRef(isPlaying);
  const lastRenderTime = useRef(renderTime);

  // 1. Video Sync
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

  // 2. Audio Sync (Web Audio API)
  useEffect(() => {
    const currentActiveSources = project.tracks
      .filter((t: any) => !t.isMuted && t.type !== 'subtitle')
      .flatMap((t: any) => t.clips.map((c: any) => ({ clip: c, asset: assets.find(a => a.id === c.assetId) })))
      .filter((item: any) => {
        if (!item.asset) return false;
        if (item.clip.isSilent) return false;
        if (item.clip.content) return false;
        // If it's the active video clip, we use the video element's audio (unless silenced)
        if (activeVideoClip && item.clip.id === activeVideoClip.id) return false;
        return renderTime >= item.clip.startTime && renderTime < item.clip.startTime + item.clip.duration;
      });

    const currentActiveIds = new Set(currentActiveSources.map((s: any) => s.clip.id));
    
    // Stop clips that are no longer active
    // We can't easily iterate over WebAudioService's internal sources, so we'll just stop what's not in currentActiveIds
    // But wait, we need to know which clips WERE playing.
    // Actually, WebAudioService.playClip stops the previous one anyway.
    // The main issue is when we stop playing or seek.

    if (!isPlaying) {
      webAudioService.stopAll();
    } else {
      // If we just started playing or if we seeked significantly
      const seeked = Math.abs(renderTime - lastRenderTime.current) > 0.1;
      const started = isPlaying && !lastIsPlaying.current;

      if (started || seeked) {
        webAudioService.stopAll();
        currentActiveSources.forEach(({ clip, asset }: any) => {
          if (asset?.audioBuffer) {
            webAudioService.playClip(clip, asset, renderTime);
          }
        });
      }
    }

    lastIsPlaying.current = isPlaying;
    lastRenderTime.current = renderTime;

    // Cleanup on unmount
    return () => {
      if (!isPlaying) webAudioService.stopAll();
    };
  }, [isPlaying, renderTime, project.tracks, assets, activeVideoClip?.id]);
};
