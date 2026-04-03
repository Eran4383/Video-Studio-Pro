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
      
      const nextTracks = prev.tracks.map(t => {
        if (t.id === trackId) {
          return { ...t, clips: [...t.clips, ...newClips] };
        }
        return t;
      });

      const next = { ...prev, tracks: nextTracks };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const addClipAtPosition = useCallback((trackId: string, asset: Asset, startTime: number) => {
    setProject(prev => {
      let targetTrack = prev.tracks.find(t => t.id === trackId);
      if (!targetTrack || targetTrack.isLocked) return prev;
      
      const duration = asset.duration || 5;
      const endTime = startTime + duration;
      
      const hasOverlap = targetTrack.clips.some(c => {
        const cEnd = c.startTime + c.duration;
        return (startTime < cEnd && endTime > c.startTime);
      });

      let actualTrackId = trackId;
      let newTracks = [...prev.tracks];

      if (hasOverlap) {
        const availableTrack = prev.tracks.find(t => 
          t.type === targetTrack!.type && 
          !t.isLocked &&
          !t.clips.some(c => {
            const cEnd = c.startTime + c.duration;
            return (startTime < cEnd && endTime > c.startTime);
          })
        );

        if (availableTrack) {
          actualTrackId = availableTrack.id;
        } else {
          const newTrackId = `track-${targetTrack!.type}-${Math.random().toString(36).substr(2, 9)}`;
          const newTrack = {
            id: newTrackId,
            name: `${targetTrack!.type === 'video' ? 'Video' : 'Audio'} ${prev.tracks.filter(t => t.type === targetTrack!.type).length + 1}`,
            type: targetTrack!.type,
            clips: [],
            isVisible: true,
            isMuted: false,
            isLocked: false,
            height: targetTrack!.height
          };
          
          const targetIndex = prev.tracks.findIndex(t => t.id === trackId);
          newTracks.splice(targetIndex + 1, 0, newTrack);
          actualTrackId = newTrackId;
        }
      }

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
        duration: duration,
        layer: 0,
        effects: [],
        position: { x: 0.5, y: 0.5 },
        isSilent: false
      };
      const next = { ...prev, resolution, tracks: newTracks.map(t => t.id === actualTrackId ? { ...t, clips: [...t.clips, newClip] } : t) };
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

  const addEffect = useCallback((clipId: string, effect: any) => {
    setProject(prev => {
      const next = {
        ...prev,
        tracks: prev.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip;
            return {
              ...clip,
              effects: [...(clip.effects || []), effect]
            };
          })
        }))
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const toggleEffect = useCallback((clipId: string, effectId: string) => {
    setProject(prev => {
      const next = {
        ...prev,
        tracks: prev.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip;
            return {
              ...clip,
              effects: clip.effects.map(eff => 
                eff.id === effectId ? { ...eff, isEnabled: eff.isEnabled === false } : eff
              )
            };
          })
        }))
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const updateEffect = useCallback((clipId: string, effectId: string, updates: any) => {
    setProject(prev => {
      const next = {
        ...prev,
        tracks: prev.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip;
            return {
              ...clip,
              effects: clip.effects.map(eff => 
                eff.id === effectId ? { ...eff, ...updates } : eff
              )
            };
          })
        }))
      };
      // Don't push to history on every mouse move, we'll do it on mouse up
      return next;
    });
  }, [setProject]);

  const deleteEffect = useCallback((clipId: string, effectId: string) => {
    setProject(prev => {
      const next = {
        ...prev,
        tracks: prev.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip;
            return {
              ...clip,
              effects: clip.effects.filter(eff => eff.id !== effectId)
            };
          })
        }))
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const addEffectClip = useCallback((trackId: string, startTime: number, effect: any) => {
    setProject(prev => {
      const targetTrack = prev.tracks.find(t => t.id === trackId);
      if (!targetTrack) return prev;
      
      const duration = 5;
      const newClip: Clip = {
        id: `effect-clip-${Date.now()}`,
        assetId: 'adjustment-layer',
        type: MediaType.EFFECT,
        startTime: startTime,
        offset: 0,
        duration: duration,
        layer: 10,
        effects: [{
          id: `eff-${Date.now()}`,
          type: effect.type || 'filter',
          name: effect.name || 'Effect',
          params: effect.params || {},
          isEnabled: true
        }],
        position: { x: 0.5, y: 0.5 }
      };
      
      const next = { 
        ...prev, 
        tracks: prev.tracks.map(t => t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t) 
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const stretchClipToNextMarker = useCallback((clipId: string, edge: 'L' | 'R') => {
    setProject(prev => {
      const allClips = prev.tracks.flatMap(t => t.clips);
      const clip = allClips.find(c => c.id === clipId);
      if (!clip) return prev;
      
      const markers: number[] = [];
      allClips.forEach(c => {
        markers.push(c.startTime);
        markers.push(c.startTime + c.duration);
        // Include effect boundaries as markers
        if (c.effects) {
          c.effects.forEach(eff => {
            if (eff.type === 'transition') {
              const dur = eff.params?.duration || 1;
              const pos = eff.params?.position || 'start';
              if (pos === 'start') {
                markers.push(c.startTime + dur);
              } else {
                markers.push(c.startTime + c.duration - dur);
              }
            }
          });
        }
      });
      markers.push(0);
      const projectDuration = Math.max(10, ...allClips.map(c => c.startTime + c.duration));
      markers.push(projectDuration);
      
      const sortedMarkers = [...new Set(markers)].sort((a, b) => a - b);
      
      if (edge === 'L') {
        const targetTime = [...sortedMarkers].reverse().find(m => m < clip.startTime - 0.01) ?? 0;
        const newDuration = (clip.startTime + clip.duration) - targetTime;
        const newOffset = clip.offset + (clip.startTime - targetTime);
        
        const next = {
          ...prev,
          tracks: prev.tracks.map(t => ({
            ...t,
            clips: t.clips.map(c => c.id === clipId ? { ...c, startTime: targetTime, duration: newDuration, offset: newOffset } : c)
          }))
        };
        pushToHistory(next);
        return next;
      } else {
        const targetTime = sortedMarkers.find(m => m > (clip.startTime + clip.duration) + 0.01) ?? projectDuration;
        const newDuration = targetTime - clip.startTime;
        
        const next = {
          ...prev,
          tracks: prev.tracks.map(t => ({
            ...t,
            clips: t.clips.map(c => c.id === clipId ? { ...c, duration: newDuration } : c)
          }))
        };
        pushToHistory(next);
        return next;
      }
    });
  }, [setProject, pushToHistory]);

  const stretchEffectToNextMarker = useCallback((clipId: string, effectId: string, edge: 'L' | 'R') => {
    setProject(prev => {
      const allClips = prev.tracks.flatMap(t => t.clips);
      const clip = allClips.find(c => c.id === clipId);
      if (!clip) return prev;
      
      const effect = clip.effects.find(e => e.id === effectId);
      if (!effect || effect.type !== 'transition') return prev;
      
      const markers: number[] = [];
      allClips.forEach(c => {
        markers.push(c.startTime);
        markers.push(c.startTime + c.duration);
        // Include effect boundaries as markers
        if (c.effects) {
          c.effects.forEach(eff => {
            if (eff.type === 'transition') {
              const dur = eff.params?.duration || 1;
              const pos = eff.params?.position || 'start';
              if (pos === 'start') {
                markers.push(c.startTime + dur);
              } else {
                markers.push(c.startTime + c.duration - dur);
              }
            }
          });
        }
      });
      markers.push(0);
      const projectDuration = Math.max(10, ...allClips.map(c => c.startTime + c.duration));
      markers.push(projectDuration);
      
      const sortedMarkers = [...new Set(markers)].sort((a, b) => a - b);
      
      const currentDuration = effect.params?.duration || 1;
      const position = effect.params?.position || 'start';
      const currentTimeOnTimeline = position === 'start' ? clip.startTime + currentDuration : clip.startTime + clip.duration - currentDuration;
      
      let newDuration = currentDuration;
      
      if (position === 'start') {
        // Stretching the right edge of a start transition
        const targetTime = sortedMarkers.find(m => m > currentTimeOnTimeline + 0.01) ?? projectDuration;
        newDuration = Math.min(clip.duration, targetTime - clip.startTime);
      } else {
        // Stretching the left edge of an end transition
        const targetTime = [...sortedMarkers].reverse().find(m => m < currentTimeOnTimeline - 0.01) ?? 0;
        newDuration = Math.min(clip.duration, (clip.startTime + clip.duration) - targetTime);
      }
      
      const next = {
        ...prev,
        tracks: prev.tracks.map(t => ({
          ...t,
          clips: t.clips.map(c => c.id === clipId ? {
            ...c,
            effects: c.effects.map(e => e.id === effectId ? {
              ...e,
              params: { ...e.params, duration: newDuration }
            } : e)
          } : c)
        }))
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  return { addClips, addClipAtPosition, addEffectClip, resizeClip, deleteClip, deleteSelectedClips, updateClipProperties, toggleEffect, addEffect, updateEffect, deleteEffect, stretchClipToNextMarker, stretchEffectToNextMarker };
};
