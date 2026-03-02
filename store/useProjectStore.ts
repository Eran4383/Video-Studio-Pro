
import { useState, useCallback, useRef } from 'react';
import { Project, Asset, Clip, Track, MediaType } from '../types';

const INITIAL_PROJECT: Project = {
  id: 'proj-1',
  name: 'New Project',
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  tracks: [
    { id: 'track-v1', name: 'Video 1', type: 'video', clips: [], isVisible: true, isMuted: false, isLocked: false, height: 72 },
    { id: 'track-a1', name: 'Audio 1', type: 'audio', clips: [], isVisible: true, isMuted: false, isLocked: false, height: 72 }
  ],
  markers: []
};

export const useProjectStore = () => {
  const [project, setProject] = useState<Project>(INITIAL_PROJECT);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(10);
  const [isMagnetEnabled, setIsMagnetEnabled] = useState(true);

  const historyRef = useRef<Project[]>([INITIAL_PROJECT]);
  const historyIndexRef = useRef<number>(0);

  const pushToHistory = (newProject: Project) => {
    const currentHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    const updatedHistory = [...currentHistory, JSON.parse(JSON.stringify(newProject))];
    if (updatedHistory.length > 50) updatedHistory.shift();
    historyRef.current = updatedHistory;
    historyIndexRef.current = updatedHistory.length - 1;
  };

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      setProject(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      setProject(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, []);

  const addMarker = useCallback(() => {
    setProject(prev => {
      const threshold = 0.1; // 100ms tolerance
      let next: Project;

      if (selectedClipId) {
        // Handle Clip Marker
        let markerActionTaken = false;
        const newTracks = prev.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id === selectedClipId) {
              const relativeTime = (currentTime - clip.startTime) + clip.offset;
              
              // Check for existing marker to delete
              const existingMarkerIndex = clip.markers?.findIndex(m => Math.abs(m.time - relativeTime) < threshold);
              
              if (existingMarkerIndex !== undefined && existingMarkerIndex !== -1) {
                // Delete existing marker
                markerActionTaken = true;
                const newMarkers = [...(clip.markers || [])];
                newMarkers.splice(existingMarkerIndex, 1);
                return { ...clip, markers: newMarkers };
              } else {
                // Add new marker
                markerActionTaken = true;
                const newMarker: Marker = {
                  id: `marker-c-${Date.now()}`,
                  time: relativeTime,
                  color: '#00FF00', // Green for clip markers
                  label: ''
                };
                return { ...clip, markers: [...(clip.markers || []), newMarker] };
              }
            }
            return clip;
          })
        }));

        if (markerActionTaken) {
          next = { ...prev, tracks: newTracks };
        } else {
           // Fallback to global if something went wrong, or maybe just return prev
           return prev;
        }
      } else {
        // Handle Global Marker
        const existingMarkerIndex = prev.markers?.findIndex(m => Math.abs(m.time - currentTime) < threshold);
        
        if (existingMarkerIndex !== undefined && existingMarkerIndex !== -1) {
          // Delete existing
          const newMarkers = [...(prev.markers || [])];
          newMarkers.splice(existingMarkerIndex, 1);
          next = { ...prev, markers: newMarkers };
        } else {
          // Add new
          const newMarker: Marker = {
            id: `marker-g-${Date.now()}`,
            time: currentTime,
            color: '#FF0000', // Red for global markers
            label: ''
          };
          next = { ...prev, markers: [...(prev.markers || []), newMarker] };
        }
      }
      
      pushToHistory(next);
      return next;
    });
  }, [currentTime, selectedClipId]);

  const updateMarker = useCallback((markerId: string, updates: Partial<Marker>, clipId?: string) => {
    setProject(prev => {
      let next: Project;
      if (clipId) {
        next = {
          ...prev,
          tracks: prev.tracks.map(t => ({
            ...t,
            clips: t.clips.map(c => c.id === clipId ? {
              ...c,
              markers: c.markers?.map(m => m.id === markerId ? { ...m, ...updates } : m)
            } : c)
          }))
        };
      } else {
        next = {
          ...prev,
          markers: prev.markers?.map(m => m.id === markerId ? { ...m, ...updates } : m)
        };
      }
      pushToHistory(next);
      return next;
    });
  }, []);

  const deleteMarker = useCallback((markerId: string, clipId?: string) => {
    setProject(prev => {
      let next: Project;
      if (clipId) {
        next = {
          ...prev,
          tracks: prev.tracks.map(t => ({
            ...t,
            clips: t.clips.map(c => c.id === clipId ? {
              ...c,
              markers: c.markers?.filter(m => m.id !== markerId)
            } : c)
          }))
        };
      } else {
        next = {
          ...prev,
          markers: prev.markers?.filter(m => m.id !== markerId)
        };
      }
      pushToHistory(next);
      return next;
    });
  }, []);

  const moveClip = useCallback((clipId: string, targetTrackId: string, xPos: number) => {
    setProject(prev => {
      let targetClip: Clip | null = null;
      for (const track of prev.tracks) {
        const found = track.clips.find(c => c.id === clipId);
        if (found) { targetClip = found; break; }
      }
      if (!targetClip) return prev;
      let finalX = Math.max(0, xPos);
      
      if (isMagnetEnabled) {
         const snapThreshold = 0.2;
         const allClips = prev.tracks.flatMap(t => t.clips).filter(c => c.id !== clipId && c.id !== targetClip?.linkedClipId);
         
         // Snap to clips
         for (const c of allClips) {
            if (Math.abs(finalX - (c.startTime + c.duration)) < snapThreshold) { finalX = c.startTime + c.duration; break; }
            if (Math.abs((finalX + targetClip.duration) - c.startTime) < snapThreshold) { finalX = c.startTime - targetClip.duration; break; }
            if (Math.abs(finalX - c.startTime) < snapThreshold) { finalX = c.startTime; break; }
         }

         // Snap to Global Markers
         if (prev.markers) {
            for (const m of prev.markers) {
                if (Math.abs(finalX - m.time) < snapThreshold) { finalX = m.time; break; }
                if (Math.abs((finalX + targetClip.duration) - m.time) < snapThreshold) { finalX = m.time - targetClip.duration; break; }
            }
         }

         // Snap to Playhead
         if (Math.abs(finalX - currentTime) < snapThreshold) { finalX = currentTime; }
      }

      const deltaX = finalX - targetClip.startTime;
      return {
        ...prev,
        tracks: prev.tracks.map(track => {
          const isTargetTrack = track.id === targetTrackId;
          const hasMovingClip = track.clips.some(c => c.id === clipId || c.id === targetClip?.linkedClipId);
          if (!isTargetTrack && !hasMovingClip) return track;
          let newClips = track.clips.map(c => (c.id === clipId || c.id === targetClip?.linkedClipId) ? { ...c, startTime: c.startTime + deltaX } : c);
          if (isTargetTrack && !track.clips.some(c => c.id === clipId)) {
            const source = prev.tracks.flatMap(t => t.clips).find(c => c.id === clipId);
            if (source) newClips.push({ ...source, startTime: finalX });
          } else if (!isTargetTrack && track.clips.some(c => c.id === clipId)) {
            newClips = newClips.filter(c => c.id !== clipId);
          }
          return { ...track, clips: newClips };
        })
      };
    });
  }, [isMagnetEnabled, currentTime]);

  const toggleTrackProperty = useCallback((trackId: string, property: 'isVisible' | 'isMuted' | 'isLocked') => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => t.id === trackId ? { ...t, [property]: !t[property] } : t)
    }));
  }, []);

  const setTrackHeight = useCallback((trackId: string, height: number) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => t.id === trackId ? { ...t, height } : t)
    }));
  }, []);

  const addTrack = useCallback((type: 'video' | 'audio' | 'subtitle') => {
    setProject(prev => {
      const id = `track-${type[0]}${prev.tracks.filter(t => t.type === type).length + 1}`;
      return {
        ...prev,
        tracks: [...prev.tracks, { 
          id, 
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${prev.tracks.filter(t => t.type === type).length + 1}`, 
          type, 
          clips: [], 
          isVisible: true, 
          isMuted: false, 
          isLocked: false, 
          height: 72 
        }]
      };
    });
  }, []);

  const addAsset = useCallback((asset: Asset) => {
    console.log("Store: Adding asset", asset);
    setAssets(prev => [...prev, asset]);
  }, []);

  const addClipAtPosition = useCallback((trackId: string, asset: Asset, startTime: number) => {
    setProject(prev => {
        const newClip: Clip = {
            id: `clip-${Date.now()}`,
            assetId: asset.id,
            startTime,
            duration: asset.duration,
            offset: 0,
            content: asset.type === MediaType.TEXT ? 'New Text' : undefined
        };
        const next = {
            ...prev,
            tracks: prev.tracks.map(t => t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t)
        };
        pushToHistory(next);
        return next;
    });
  }, []);

  const addClips = useCallback((trackId: string, newClips: Clip[]) => {
      setProject(prev => {
          const next = {
              ...prev,
              tracks: prev.tracks.map(t => t.id === trackId ? { ...t, clips: [...t.clips, ...newClips] } : t)
          };
          pushToHistory(next);
          return next;
      });
  }, []);

  const resizeClip = useCallback((clipId: string, newStart: number, newDur: number, newOffset: number) => {
    setProject(prev => {
      return {
        ...prev,
        tracks: prev.tracks.map(t => ({
          ...t,
          clips: t.clips.map(c => c.id === clipId ? { ...c, startTime: newStart, duration: newDur, offset: newOffset } : c)
        }))
      };
    });
  }, []);

  const detachAudio = useCallback((clipId: string) => {
      setProject(prev => {
          let audioClip: Clip | null = null;
          const newTracks = prev.tracks.map(t => {
              const clip = t.clips.find(c => c.id === clipId);
              if (clip && t.type === 'video') {
                  audioClip = { ...clip, id: `clip-a-${Date.now()}`, linkedClipId: undefined, assetId: clip.assetId }; // Ensure assetId is preserved
                  return { ...t, clips: t.clips.map(c => c.id === clipId ? { ...c, linkedClipId: undefined } : c) };
              }
              return t;
          });
          
          if (audioClip) {
              const audioTrack = newTracks.find(t => t.type === 'audio');
              if (audioTrack) {
                  audioTrack.clips.push(audioClip);
              }
          }
          const next = { ...prev, tracks: newTracks };
          pushToHistory(next);
          return next;
      });
  }, []);

  const deleteClip = useCallback((clipId: string) => { 
      setProject(prev => {
          const next = {...prev, tracks: prev.tracks.map(t => ({...t, clips: t.clips.filter(c => c.id !== clipId && c.linkedClipId !== clipId)}))};
          pushToHistory(next);
          return next;
      });
      setSelectedClipId(null);
  }, []);

  const splitClip = useCallback((targetId: string | null, time: number) => {
      if (!targetId) return;
      setProject(prev => {
          let actionTaken = false;
          const nextTracks = prev.tracks.map(t => {
              const clipIndex = t.clips.findIndex(c => c.id === targetId);
              if (clipIndex === -1) return t;
              
              const clip = t.clips[clipIndex];
              if (time <= clip.startTime || time >= clip.startTime + clip.duration) return t;

              actionTaken = true;
              const splitPoint = time - clip.startTime;
              const firstPart = { ...clip, duration: splitPoint };
              const secondPart = { 
                  ...clip, 
                  id: `clip-${Date.now()}`, 
                  startTime: time, 
                  duration: clip.duration - splitPoint, 
                  offset: clip.offset + splitPoint 
              };
              
              const newClips = [...t.clips];
              newClips.splice(clipIndex, 1, firstPart, secondPart);
              return { ...t, clips: newClips };
          });
          
          if (actionTaken) {
              const next = { ...prev, tracks: nextTracks };
              pushToHistory(next);
              return next;
          }
          return prev;
      });
  }, []);

  return {
    project, assets, currentTime, isPlaying, isLooping, selectedClipId, zoom, isMagnetEnabled,
    setZoom, setCurrentTime, setIsPlaying, setIsLooping, setSelectedClipId, setIsMagnetEnabled,
    toggleTrackProperty, setTrackHeight, addTrack, addAsset, addClipAtPosition, addClips, detachAudio, deleteClip, splitClip, moveClip, resizeClip, addMarker, updateMarker, deleteMarker,
    finalizeMove: () => pushToHistory(project), undo, redo, canUndo: historyIndexRef.current > 0, canRedo: historyIndexRef.current < historyRef.current.length - 1, setProject
  };
};
