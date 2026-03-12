import React, { useCallback } from 'react';
import { Project, Asset, Clip } from '../types';
import { SubtitleItem } from '../utils/srtParser';

export const useSubtitleActions = (
  setProject: React.Dispatch<React.SetStateAction<Project>>,
  pushToHistory: (p: Project) => void,
  assets: Asset[],
  currentTime: number,
  setSelectedClipIds: (ids: string[]) => void,
  selectedClipIds: string[]
) => {
  const addSubtitleClip = useCallback((text: string, duration?: number) => {
    setProject(prev => {
      const subTracks = prev.tracks.filter(t => t.type === 'subtitle');
      let targetTrack = subTracks[0];
      let newTracks = [...prev.tracks];
      const defaultDuration = duration || 2;
      if (!targetTrack) {
          targetTrack = { id: `track-s-${Date.now()}`, name: `Subtitles ${subTracks.length + 1}`, type: 'subtitle', clips: [], isVisible: true, isMuted: false, isLocked: false, height: 40 };
          newTracks.push(targetTrack);
      }
      const newClip: Clip = { id: `sub-${Date.now()}`, assetId: 'subtitle-asset', startTime: currentTime, duration: defaultDuration, offset: 0, layer: 10, effects: [], content: text, position: { x: 0.5, y: 0.5 }, color: '#ffffff', scale: 1, font: 'Inter, sans-serif', fontWeight: 'bold', textAlign: 'center', opacity: 1, shadow: true };
      newTracks = newTracks.map(t => t.id === targetTrack!.id ? { ...t, clips: [...t.clips, newClip] } : t);
      const next = { ...prev, tracks: newTracks };
      pushToHistory(next);
      setTimeout(() => setSelectedClipIds([newClip.id]), 0);
      return next;
    });
  }, [currentTime, setProject, pushToHistory, setSelectedClipIds]);

  const syncClipsToAnchors = useCallback((onlySelected: boolean = false) => {
    setProject(prev => {
      const allAnchors: number[] = [];
      prev.tracks.forEach(t => {
        if (t.type === 'audio' && !t.isMuted) {
          t.clips.forEach(c => {
            const a = assets.find(asset => asset.id === c.assetId);
            if (a && a.anchors) {
              a.anchors.forEach(anchorTime => {
                allAnchors.push(c.startTime + (anchorTime - c.offset));
              });
            }
          });
        }
      });
      allAnchors.sort((a, b) => a - b);
      if (allAnchors.length === 0) return prev;
      const next = {
        ...prev,
        tracks: prev.tracks.map(track => {
          if (track.type !== 'subtitle') return track;
          const clipsToSync = track.clips.filter(c => !onlySelected || selectedClipIds.includes(c.id));
          if (clipsToSync.length === 0) return track;
          const sortedClips = [...clipsToSync].sort((a, b) => a.startTime - b.startTime);
          const newClipsMap = new Map<string, { startTime: number, duration: number }>();
          let anchorIndex = 0;
          for (let i = 0; i < sortedClips.length; i++) {
            const clip = sortedClips[i];
            let bestAnchor = -1;
            let minDiff = Infinity;
            for (let j = anchorIndex; j < allAnchors.length; j++) {
              const diff = Math.abs(allAnchors[j] - clip.startTime);
              if (diff < minDiff && diff < 5.0) { minDiff = diff; bestAnchor = j; }
              else if (diff > minDiff && diff > 5.0) break;
            }
            if (bestAnchor !== -1) {
              const startTime = allAnchors[bestAnchor];
              let duration = clip.duration;
              if (bestAnchor + 1 < allAnchors.length) {
                  const nextAnchorTime = allAnchors[bestAnchor + 1];
                  if (nextAnchorTime > startTime) duration = Math.max(0.1, nextAnchorTime - startTime - 0.05);
              }
              newClipsMap.set(clip.id, { startTime, duration });
              anchorIndex = bestAnchor + 1;
            }
          }
          return { ...track, clips: track.clips.map(c => newClipsMap.has(c.id) ? { ...c, ...newClipsMap.get(c.id) } : c) };
        })
      };
      pushToHistory(next);
      return next;
    });
  }, [assets, selectedClipIds, setProject, pushToHistory]);

  const importSubtitles = useCallback((items: SubtitleItem[]) => {
    if (!Array.isArray(items) || items.length === 0) return;

    setProject(prev => {
      const subTracks = prev.tracks.filter(t => t.type === 'subtitle');
      let targetTrack = subTracks[0];
      let newTracks = [...prev.tracks];

      if (!targetTrack) {
        targetTrack = {
          id: `track-s-${Date.now()}`,
          name: `Subtitles ${subTracks.length + 1}`,
          type: 'subtitle',
          clips: [],
          isVisible: true,
          isMuted: false,
          isLocked: false,
          height: 40
        };
        newTracks.push(targetTrack);
      }

      const newClips: Clip[] = items.map((item, index) => ({
        id: `sub-import-${Date.now()}-${index}`,
        assetId: 'subtitle-asset',
        startTime: item.startTime,
        duration: Math.max(0.1, item.endTime - item.startTime),
        offset: 0,
        layer: 10,
        effects: [],
        content: item.text,
        position: { x: 0.5, y: 0.85 }, // Positioned at bottom by default
        color: '#ffffff',
        scale: 1,
        font: 'Inter, sans-serif',
        fontWeight: 'bold',
        textAlign: 'center',
        opacity: 1,
        shadow: true
      }));

      newTracks = newTracks.map(t =>
        t.id === targetTrack!.id ? { ...t, clips: [...t.clips, ...newClips] } : t
      );

      const next = { ...prev, tracks: newTracks };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const updateSubtitle = useCallback((
    clipId: string, 
    content?: string, 
    position?: { x: number, y: number }, 
    applyToAll: boolean = false,
    color?: string,
    font?: string,
    scale?: number,
    rotation?: number,
    scaleX?: number,
    scaleY?: number,
    opacity?: number,
    shadow?: boolean,
    fontWeight?: string,
    textAlign?: 'left' | 'center' | 'right',
    finalize: boolean = false
  ) => {
    setProject(prev => {
      const next = {
        ...prev,
        tracks: prev.tracks.map(track => {
          if (track.type === 'audio') return track;
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId || (applyToAll && selectedClipIds.includes(clip.id))) {
                return {
                  ...clip,
                  ...(content !== undefined && { content }),
                  ...(position !== undefined && { position }),
                  ...(color !== undefined && { color }),
                  ...(font !== undefined && { font }),
                  ...(scale !== undefined && { scale }),
                  ...(rotation !== undefined && { rotation }),
                  ...(scaleX !== undefined && { scaleX }),
                  ...(scaleY !== undefined && { scaleY }),
                  ...(opacity !== undefined && { opacity }),
                  ...(shadow !== undefined && { shadow }),
                  ...(fontWeight !== undefined && { fontWeight }),
                  ...(textAlign !== undefined && { textAlign })
                };
              }
              return clip;
            })
          };
        })
      };
      if (finalize) {
        pushToHistory(next);
      }
      return next;
    });
  }, [setProject, pushToHistory, selectedClipIds]);

  return { addSubtitleClip, syncClipsToAnchors, importSubtitles, updateSubtitle };
};
