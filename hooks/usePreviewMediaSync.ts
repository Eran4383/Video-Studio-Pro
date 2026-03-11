import React, { useEffect } from 'react';

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

  // 2. Audio Sync
  useEffect(() => {
    if (!audioContainerRef.current) return;
    
    const currentActiveSources = project.tracks
      .filter((t: any) => !t.isMuted && t.type !== 'subtitle')
      .flatMap((t: any) => t.clips.map((c: any) => ({ clip: c, asset: assets.find(a => a.id === c.assetId) })))
      .filter((item: any) => {
        if (!item.asset) return false;
        if (item.clip.isSilent) return false;
        if (item.clip.content) return false;
        if (activeVideoClip && item.clip.id === activeVideoClip.id) return false;
        return renderTime >= item.clip.startTime && renderTime <= item.clip.startTime + item.clip.duration;
      });

    const currentActiveIds = new Set(currentActiveSources.map((s: any) => s.clip.id));
    
    for (const [id, el] of audioElementsRef.current.entries()) {
      if (!currentActiveIds.has(id)) { el.pause(); el.src = ""; el.remove(); audioElementsRef.current.delete(id); }
    }

    currentActiveSources.forEach(({ clip, asset }: any) => {
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
};
