import React, { useCallback } from 'react';
import { Project, Track } from '../types';

export const useTrackActions = (
  setProject: React.Dispatch<React.SetStateAction<Project>>,
  pushToHistory: (p: Project) => void
) => {
  const toggleTrackProperty = useCallback((trackId: string, property: 'isVisible' | 'isMuted' | 'isLocked' | 'receiveAdjustmentEffects') => {
    setProject(prev => {
      const next = {
        ...prev,
        tracks: prev.tracks.map(t => t.id === trackId ? { ...t, [property]: !t[property] } : t)
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const setTrackHeight = useCallback((trackId: string, height: number) => {
    setProject(prev => ({
        ...prev,
        tracks: prev.tracks.map(t => t.id === trackId ? { ...t, height: Math.max(40, height) } : t)
    }));
  }, [setProject]);

  const addTrack = useCallback((type: 'video' | 'audio' | 'subtitle', trackId?: string) => {
    setProject(prev => {
      const typeCount = prev.tracks.filter(t => t.type === type).length + 1;
      const newTrack: Track = {
        id: trackId || `track-${type[0]}-${Date.now()}`,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${typeCount}`,
        type,
        clips: [],
        isVisible: true,
        isMuted: false,
        isLocked: false,
        height: type === 'subtitle' ? 40 : 72
      };
      const videoTracks = prev.tracks.filter(t => t.type === 'video');
      const audioTracks = prev.tracks.filter(t => t.type === 'audio');
      const subTracks = prev.tracks.filter(t => t.type === 'subtitle');
      
      let newTracks: Track[] = [];
      if (type === 'video') newTracks = [...videoTracks, newTrack, ...audioTracks, ...subTracks];
      else if (type === 'audio') newTracks = [...videoTracks, ...audioTracks, newTrack, ...subTracks];
      else newTracks = [...videoTracks, ...audioTracks, ...subTracks, newTrack];

      const next = { ...prev, tracks: newTracks };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const deleteTrack = useCallback((trackId: string) => {
    console.log('[useTrackActions] Deleting track:', trackId);
    setProject(prev => {
      const next = {
        ...prev,
        tracks: prev.tracks.filter(t => t.id !== trackId)
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  return { toggleTrackProperty, setTrackHeight, addTrack, deleteTrack };
};
