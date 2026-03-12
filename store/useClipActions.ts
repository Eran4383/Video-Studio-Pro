import React, { useCallback } from 'react';
import { Project, Asset, Clip, MediaType } from '../types';
import { generateBlockLayout } from '../utils/kinetic/KineticLayoutManager';

export const useClipActions = (
  setProject: React.Dispatch<React.SetStateAction<Project>>,
  pushToHistory: (p: Project) => void,
  assets: Asset[],
  selectedClipIds: string[],
  setSelectedClipIds: React.Dispatch<React.SetStateAction<string[]>>
) => {
  const addClips = useCallback((trackId: string, newClips: Clip[]) => {
    setProject(prev => {
      const targetTrack = prev.tracks.find(t => t.id === trackId);
      if (!targetTrack) return prev;
      const next = { ...prev, tracks: prev.tracks.map(t => t.id === trackId ? { ...t, clips: [...t.clips, ...newClips] } : t) };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const addClipAtPosition = useCallback((trackId: string, asset: Asset, startTime: number) => {
    setProject(prev => {
      let targetTrack = prev.tracks.find(t => t.id === trackId);
      if (!targetTrack || targetTrack.isLocked) return prev;
      const hasVisualClips = prev.tracks.some(t => (t.type === 'video' || t.type === 'image') && t.clips.length > 0);
      let resolution = prev.resolution;
      if (!hasVisualClips && (asset.type === MediaType.VIDEO || asset.type === MediaType.IMAGE) && asset.width && asset.height) {
         resolution = { width: asset.width, height: asset.height };
      }
      const newClip: Clip = {
        id: `clip-${Math.random().toString(36).substr(2, 9)}`,
        assetId: asset.id,
        startTime: startTime,
        offset: 0,
        duration: asset.duration || 5,
        layer: 0,
        effects: [],
        position: { x: 0.5, y: 0.5 },
        isSilent: false
      };
      const next = { ...prev, resolution, tracks: prev.tracks.map(t => t.id === targetTrack!.id ? { ...t, clips: [...t.clips, newClip] } : t) };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const resizeClip = useCallback((clipId: string, newStartTime: number, newDuration: number, newOffset: number) => {
    setProject(prev => {
      const nextTracks = prev.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => clip.id === clipId ? { ...clip, startTime: newStartTime, duration: newDuration, offset: newOffset } : clip)
      }));

      let nextKineticBlocks = prev.kineticBlocks;
      if (prev.kineticBlocks) {
        const allNextClips = nextTracks.flatMap(t => t.clips);
        const screenAR = prev.resolution.width / prev.resolution.height;
        nextKineticBlocks = prev.kineticBlocks.map(block => {
          if (block.clipIds.includes(clipId)) {
            return { ...block, words: generateBlockLayout(block, allNextClips, screenAR) };
          }
          return block;
        });
      }

      return {
        ...prev,
        tracks: nextTracks,
        kineticBlocks: nextKineticBlocks
      };
    });
  }, [setProject]);

  const deleteClip = useCallback((clipId: string) => { 
      setProject(prev => {
        const next = {...prev, tracks: prev.tracks.map(t => ({...t, clips: t.clips.filter(c => c.id !== clipId && c.linkedClipId !== clipId)}))};
        pushToHistory(next);
        return next;
      });
      setSelectedClipIds(prev => prev.filter(id => id !== clipId));
  }, [setProject, pushToHistory, setSelectedClipIds]);

  const deleteSelectedClips = useCallback(() => {
      if (selectedClipIds.length === 0) return;
      setProject(prev => {
        const next = {
          ...prev, 
          tracks: prev.tracks.map(t => ({
            ...t, 
            clips: t.clips.filter(c => !selectedClipIds.includes(c.id) && (!c.linkedClipId || !selectedClipIds.includes(c.linkedClipId)))
          }))
        };
        pushToHistory(next);
        return next;
      });
      setSelectedClipIds([]);
  }, [setProject, pushToHistory, selectedClipIds, setSelectedClipIds]);

  const updateClipProperties = useCallback((clipId: string, updates: Partial<Clip>, finalize: boolean = true, applyToAll: boolean = false) => {
    setProject(prev => {
      const nextTracks = prev.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id === clipId || (applyToAll && selectedClipIds.includes(clip.id))) {
            return { ...clip, ...updates };
          }
          return clip;
        })
      }));

      const needsKineticRefresh = updates.content !== undefined || updates.duration !== undefined || updates.startTime !== undefined;
      let nextKineticBlocks = prev.kineticBlocks;

      if (needsKineticRefresh && prev.kineticBlocks) {
        const allNextClips = nextTracks.flatMap(t => t.clips);
        const screenAR = prev.resolution.width / prev.resolution.height;
        nextKineticBlocks = prev.kineticBlocks.map(block => {
          const isAffected = block.clipIds.includes(clipId) || (applyToAll && block.clipIds.some(id => selectedClipIds.includes(id)));
          if (isAffected) {
            return { ...block, words: generateBlockLayout(block, allNextClips, screenAR) };
          }
          return block;
        });
      }

      const next = {
        ...prev,
        tracks: nextTracks,
        kineticBlocks: nextKineticBlocks
      };

      if (finalize) {
        pushToHistory(next);
      }
      return next;
    });
  }, [setProject, pushToHistory, selectedClipIds]);

  return { addClips, addClipAtPosition, resizeClip, deleteClip, deleteSelectedClips, updateClipProperties };
};
