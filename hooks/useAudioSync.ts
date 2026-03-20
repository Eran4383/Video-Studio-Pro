
import { useEffect, useRef } from 'react';
import { Project, Asset, Clip } from '../types';
import { webAudioEngine } from '../services/WebAudioEngine';

/**
 * useAudioSync manages the synchronization between the timeline and Web Audio playback.
 * It ensures that audio clips play, stop, and seek in perfect sync with the master clock.
 */
export const useAudioSync = (
  project: Project,
  assets: Asset[],
  isPlaying: boolean,
  renderTime: number,
  activeVideoClipId?: string
) => {
  const playingClipsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isPlaying) {
      webAudioEngine.stopAll();
      playingClipsRef.current.clear();
      return;
    }

    // Identify active audio clips for the current render time
    const currentActiveSources = project.tracks
      .filter(t => !t.isMuted && t.type !== 'subtitle')
      .flatMap(t => t.clips.map(c => ({ clip: c, asset: assets.find(a => a.id === c.assetId) })))
      .filter(item => {
        if (!item.asset) return false;
        if (item.clip.isSilent) return false;
        // If it's a video clip with audio, we might skip it if it's already handled by the video element
        // But for professional editing, we often want to handle ALL audio through WebAudioEngine
        // For now, we skip if it's the active video clip to avoid double audio
        if (activeVideoClipId && item.clip.id === activeVideoClipId) return false;
        
        return renderTime >= item.clip.startTime && renderTime <= item.clip.startTime + item.clip.duration;
      });

    const currentActiveIds = new Set(currentActiveSources.map(s => s.clip.id));

    // Stop clips that are no longer active
    playingClipsRef.current.forEach(id => {
      if (!currentActiveIds.has(id)) {
        webAudioEngine.stopClip(id);
        playingClipsRef.current.delete(id);
      }
    });

    // Start clips that just became active
    currentActiveSources.forEach(({ clip, asset }) => {
      if (!asset) return;
      
      // Ensure the buffer is cached in the engine
      if (asset.audioBuffer && !webAudioEngine.getBuffer(asset.id)) {
        webAudioEngine.cacheBuffer(asset.id, asset.audioBuffer);
      }
      
      const isAlreadyPlaying = playingClipsRef.current.has(clip.id);
      
      if (!isAlreadyPlaying) {
        webAudioEngine.playClip(clip, asset.id, renderTime);
        playingClipsRef.current.add(clip.id);
      }
    });
  }, [isPlaying, activeVideoClipId, project.tracks, assets, renderTime]);

  // Handle seeking: If the time jumps significantly, we restart all audio
  const lastRenderTimeRef = useRef(renderTime);
  useEffect(() => {
    if (isPlaying && Math.abs(renderTime - lastRenderTimeRef.current) > 0.3) {
      webAudioEngine.stopAll();
      playingClipsRef.current.clear();
    }
    lastRenderTimeRef.current = renderTime;
  }, [renderTime, isPlaying]);

  return null;
};
