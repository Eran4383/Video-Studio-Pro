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
        type: asset.type,
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
      const oldClip = prev.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
      if (!oldClip) return prev;

      const nextTracks = prev.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => clip.id === clipId ? { 
          ...clip, 
          startTime: Math.round(newStartTime * 1000) / 1000, 
          duration: Math.round(newDuration * 1000) / 1000, 
          offset: Math.round(newOffset * 1000) / 1000 
        } : clip)
      }));

      let nextKineticBlocks = prev.kineticBlocks;
      if (prev.kineticBlocks) {
        nextKineticBlocks = prev.kineticBlocks.map(block => {
          if (block.clipIds.includes(clipId)) {
            const updatedWords = (block.words || []).map(word => {
              if (word.sourceClipId === clipId) {
                const relStart = (word.startTime - oldClip.startTime) / oldClip.duration;
                const relEnd = (word.endTime - oldClip.startTime) / oldClip.duration;
                const relSceneEnd = (word.sceneEndTime - oldClip.startTime) / oldClip.duration;
                
                return {
                  ...word,
                  startTime: newStartTime + relStart * newDuration,
                  endTime: newStartTime + relEnd * newDuration,
                  sceneEndTime: newStartTime + relSceneEnd * newDuration
                };
              }
              return word;
            });
            return { ...block, words: updatedWords };
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
            const nextClip = { ...clip, ...updates };
            if (updates.startTime !== undefined) nextClip.startTime = Math.round(updates.startTime * 1000) / 1000;
            if (updates.duration !== undefined) nextClip.duration = Math.round(updates.duration * 1000) / 1000;
            if (updates.offset !== undefined) nextClip.offset = Math.round(updates.offset * 1000) / 1000;
            return nextClip;
          }
          return clip;
        })
      }));

      const contentChanged = updates.content !== undefined;
      const timeChanged = updates.duration !== undefined || updates.startTime !== undefined;
      
      let nextKineticBlocks = prev.kineticBlocks;

      if ((contentChanged || timeChanged) && prev.kineticBlocks) {
        const allNextClips = nextTracks.flatMap(t => t.clips);
        const screenAR = prev.resolution.width / prev.resolution.height;
        
        nextKineticBlocks = prev.kineticBlocks.map(block => {
          const isAffected = block.clipIds.includes(clipId) || (applyToAll && block.clipIds.some(id => selectedClipIds.includes(id)));
          
          if (isAffected) {
            if (contentChanged) {
               return { ...block, words: generateBlockLayout(block, allNextClips, screenAR) };
            } else if (timeChanged) {
               const updatedWords = (block.words || []).map(word => {
                 const targetClipId = word.sourceClipId;
                 if (targetClipId === clipId || (applyToAll && selectedClipIds.includes(targetClipId))) {
                    const oldClip = prev.tracks.flatMap(t => t.clips).find(c => c.id === targetClipId);
                    const newClip = allNextClips.find(c => c.id === targetClipId);
                    
                    if (oldClip && newClip) {
                      const relStart = (word.startTime - oldClip.startTime) / oldClip.duration;
                      const relEnd = (word.endTime - oldClip.startTime) / oldClip.duration;
                      const relSceneEnd = (word.sceneEndTime - oldClip.startTime) / oldClip.duration;
                      
                      return {
                        ...word,
                        startTime: newClip.startTime + relStart * newClip.duration,
                        endTime: newClip.startTime + relEnd * newClip.duration,
                        sceneEndTime: newClip.startTime + relSceneEnd * newClip.duration
                      };
                    }
                 }
                 return word;
               });
               return { ...block, words: updatedWords };
            }
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
