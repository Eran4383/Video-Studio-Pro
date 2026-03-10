import React, { useCallback } from 'react';
import { Project, Clip } from '../types';
import { KineticBoundingBox } from '../types/kinetic';
import { generateBlockLayout } from '../utils/kinetic/KineticLayoutManager';

export const useKineticActions = (
  setProject: React.Dispatch<React.SetStateAction<Project>>,
  pushToHistory: (p: Project) => void,
  lastKineticBox: KineticBoundingBox | null,
  setLastKineticBox: (box: KineticBoundingBox | null) => void
) => {
  const createKineticBlock = useCallback((clipIds: string[]) => {
    setProject(prev => {
      const clips = prev.tracks.flatMap(t => t.clips).filter(c => clipIds.includes(c.id));
      if (clips.length === 0) return prev;
      
      const startTime = Math.min(...clips.map(c => c.startTime));
      const endTime = Math.max(...clips.map(c => c.startTime + c.duration));
      
      const newBlock: any = {
        id: `kb-${Date.now()}`,
        name: 'Kinetic Block',
        color: 'rgba(234, 179, 8, 0.3)',
        startTime,
        endTime,
        clipIds,
        settings: {
          boundingBox: lastKineticBox || { x: 10, y: 10, width: 80, height: 80 },
          layoutStyle: 'pop-in-place',
          animationStyle: 'pop',
          animationOrder: 'reading',
          direction: 'auto',
          paletteId: 'default',
          primaryFont: 'Inter',
          secondaryFont: 'Inter',
          randomMode: false,
          gap: 2,
          blockHandling: 'separate'
        },
        words: []
      };

      const next = {
        ...prev,
        kineticBlocks: [...(prev.kineticBlocks || []), newBlock]
      };
      pushToHistory(next);
      return next;
    });
  }, [lastKineticBox, setProject, pushToHistory]);

  const updateKineticBlock = useCallback((blockId: string, updates: any) => {
    setProject(prev => {
      const block = prev.kineticBlocks?.find(b => b.id === blockId);
      if (block && updates.settings?.boundingBox) {
        setLastKineticBox(updates.settings.boundingBox);
      }
      
      const next = {
        ...prev,
        kineticBlocks: (prev.kineticBlocks || []).map(b => 
          b.id === blockId ? { 
            ...b, 
            ...updates, 
            settings: { ...b.settings, ...(updates.settings || {}) } 
          } : b
        )
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory, setLastKineticBox]);

  const deleteKineticBlock = useCallback((blockId: string) => {
    setProject(prev => {
      const next = {
        ...prev,
        kineticBlocks: (prev.kineticBlocks || []).filter(b => b.id !== blockId)
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const generateBlockAnimation = useCallback((blockId: string) => {
    setProject(prev => {
      const block = prev.kineticBlocks?.find(b => b.id === blockId);
      if (!block) return prev;

      const allClips = prev.tracks.flatMap(t => t.clips);
      const updatedWords = generateBlockLayout(block, allClips);

      const next = {
        ...prev,
        kineticBlocks: (prev.kineticBlocks || []).map(b => 
          b.id === blockId ? { ...b, words: updatedWords } : b
        )
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const updateKineticData = useCallback((clipId: string, updates: any) => {
    setProject(prev => {
      const next = {
        ...prev,
        tracks: prev.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id === clipId) {
              return { 
                ...clip, 
                kineticData: { ...(clip.kineticData || {}), ...updates, settings: { ...(clip.kineticData?.settings || {}), ...(updates.settings || {}) } } 
              };
            }
            return clip;
          })
        }))
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const updateKineticWord = useCallback((clipId: string, wordId: string, updates: any) => {
    setProject(prev => {
      const next = {
        ...prev,
        tracks: prev.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id === clipId && clip.kineticData) {
              return {
                ...clip,
                kineticData: {
                  ...clip.kineticData,
                  words: clip.kineticData.words.map((word: any) => 
                    word.id === wordId ? { ...word, ...updates } : word
                  )
                }
              };
            }
            return clip;
          })
        }))
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  return { createKineticBlock, updateKineticBlock, deleteKineticBlock, generateBlockAnimation, updateKineticData, updateKineticWord };
};
