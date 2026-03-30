import React, { useCallback } from 'react';
import { Project, Clip } from '../types';

export const useMoveActions = (
  setProject: React.Dispatch<React.SetStateAction<Project>>,
  setSelectedClipIds: React.Dispatch<React.SetStateAction<string[]>>,
  selectedClipIds: string[],
  isMagnetEnabled: boolean,
  currentTime: number,
  pushToHistory: (p: Project) => void
) => {
  const moveClip = useCallback((clipId: string, targetTrackId: string, xPos: number, enableSnapping: boolean = true) => {
    setProject(prev => {
      let primaryClip: Clip | null = null;
      let primaryTrackId: string | null = null;
      let primaryTrackIndex: number = -1;
      for (let i = 0; i < prev.tracks.length; i++) {
        const track = prev.tracks[i];
        const found = track.clips.find(c => c.id === clipId);
        if (found) { primaryClip = found; primaryTrackId = track.id; primaryTrackIndex = i; break; }
      }
      if (!primaryClip || !primaryTrackId) return prev;
      const isMultiSelection = selectedClipIds.includes(clipId) && selectedClipIds.length > 1;
      const movingClipIds = isMultiSelection ? selectedClipIds : [clipId, ...(primaryClip.linkedClipId ? [primaryClip.linkedClipId] : [])];
      let finalX = Math.max(0, xPos);
      if (enableSnapping) {
         const staticClips = prev.tracks.flatMap(t => t.clips).filter(c => !movingClipIds.includes(c.id));
         for (const c of staticClips) {
            if (Math.abs(finalX - (c.startTime + c.duration)) < 0.2) { finalX = c.startTime + c.duration; break; }
            if (Math.abs((finalX + primaryClip.duration) - c.startTime) < 0.2) { finalX = c.startTime - primaryClip.duration; break; }
            if (Math.abs(finalX - c.startTime) < 0.2) { finalX = c.startTime; break; }
            if (Math.abs((finalX + primaryClip.duration) - (c.startTime + c.duration)) < 0.2) { finalX = c.startTime + c.duration - primaryClip.duration; break; }
         }
         if (Math.abs(finalX - currentTime) < 0.2) { finalX = currentTime; }
         if (Math.abs((finalX + primaryClip.duration) - currentTime) < 0.2) { finalX = currentTime - primaryClip.duration; }
      }
      const deltaX = finalX - primaryClip.startTime;
      const targetTrackIndex = prev.tracks.findIndex(t => t.id === targetTrackId);
      let trackDelta = 0;
      if (targetTrackIndex !== -1) {
          const rawDelta = targetTrackIndex - primaryTrackIndex;
          let minTrackIdx = prev.tracks.length;
          let maxTrackIdx = -1;
          prev.tracks.forEach((t, idx) => {
              if (t.clips.some(c => movingClipIds.includes(c.id))) {
                  if (idx < minTrackIdx) minTrackIdx = idx;
                  if (idx > maxTrackIdx) maxTrackIdx = idx;
              }
          });
          if (minTrackIdx !== prev.tracks.length) {
              trackDelta = Math.max(-minTrackIdx, Math.min(prev.tracks.length - 1 - maxTrackIdx, rawDelta));
          }
      }
      const movePlan = new Map<string, { newStartTime: number, targetTrackId: string }>();
      movingClipIds.forEach(mId => {
          let originalClip: Clip | null = null;
          let originalTrackIndex = -1;
          for(let i=0; i<prev.tracks.length; i++) {
              const c = prev.tracks[i].clips.find(cl => cl.id === mId);
              if (c) { originalClip = c; originalTrackIndex = i; break; }
          }
          if (originalClip && originalTrackIndex !== -1) {
              const newStartTime = Math.round(Math.max(0, originalClip.startTime + deltaX) * 1000) / 1000;
              const newTrackIndex = originalTrackIndex + trackDelta;
              if (newTrackIndex >= 0 && newTrackIndex < prev.tracks.length) {
                  movePlan.set(mId, { newStartTime, targetTrackId: prev.tracks[newTrackIndex].id });
              }
          }
      });
      const newTracks = prev.tracks.map(track => {
          const remainingClips = track.clips.filter(c => !movingClipIds.includes(c.id));
          const incomingClips: Clip[] = [];
          movePlan.forEach((plan, mId) => {
              if (plan.targetTrackId === track.id) {
                  const originalClip = prev.tracks.flatMap(t => t.clips).find(c => c.id === mId);
                  if (originalClip) incomingClips.push({ ...originalClip, startTime: plan.newStartTime });
              }
          });
          
          let allClips = [...remainingClips, ...incomingClips];
          
          if (isMagnetEnabled) {
              // Sort all clips by their center point to determine sequence
              allClips.sort((a, b) => {
                  const centerA = a.startTime + a.duration / 2;
                  const centerB = b.startTime + b.duration / 2;
                  return centerA - centerB;
              });

              // Pack clips to prevent overlaps, pushing subsequent clips to the right
              let currentX = 0;
              for (let i = 0; i < allClips.length; i++) {
                  const clip = allClips[i];
                  if (clip.startTime < currentX) {
                      clip.startTime = Math.round(currentX * 1000) / 1000;
                  }
                  currentX = Math.round((clip.startTime + clip.duration) * 1000) / 1000;
              }
          }

          return { ...track, clips: allClips };
      });
      return { ...prev, tracks: newTracks };
    });
  }, [isMagnetEnabled, currentTime, selectedClipIds, setProject]);

  const selectClip = useCallback((id: string | null, multi: boolean = false) => {
    if (id === null) { setSelectedClipIds([]); return; }
    setSelectedClipIds(prev => multi ? (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]) : [id]);
  }, [setSelectedClipIds]);

  const splitClip = useCallback((targetId: string | null | undefined, time: number) => {
    setProject(prev => {
      let newlyCreatedIds: string[] = [];
      const newTracks = prev.tracks.map(track => {
        if (track.isLocked) return track;
        let clipsToSplit = targetId ? track.clips.filter(c => c.id === targetId && time > c.startTime && time < c.startTime + c.duration) : track.clips.filter(c => time > c.startTime && time < c.startTime + c.duration);
        if (clipsToSplit.length === 0) return track;
        let newClips = [...track.clips];
        for (const clip of clipsToSplit) {
          const relativeSplitPoint = Math.round((time - clip.startTime) * 1000) / 1000;
          if (relativeSplitPoint <= 0.01 || relativeSplitPoint >= clip.duration - 0.01) continue;
          const leftClip: Clip = { ...clip, duration: relativeSplitPoint };
          const rightClipId = `clip-${Math.random().toString(36).substr(2, 9)}`;
          newlyCreatedIds.push(rightClipId);
          const rightClip: Clip = { 
            ...clip, 
            id: rightClipId, 
            startTime: Math.round(time * 1000) / 1000, 
            offset: Math.round((clip.offset + relativeSplitPoint) * 1000) / 1000, 
            duration: Math.round((clip.duration - relativeSplitPoint) * 1000) / 1000, 
            linkedClipId: undefined 
          };
          const clipIdx = newClips.findIndex(c => c.id === clip.id);
          newClips.splice(clipIdx, 1, leftClip, rightClip);
        }
        return { ...track, clips: newClips };
      });
      if (newlyCreatedIds.length > 0) setTimeout(() => setSelectedClipIds(newlyCreatedIds), 0);
      const next = { ...prev, tracks: newTracks };
      pushToHistory(next);
      return next;
    });
  }, [setProject, setSelectedClipIds, pushToHistory]);

  return { moveClip, selectClip, splitClip };
};
