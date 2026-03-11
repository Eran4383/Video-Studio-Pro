import React, { useCallback } from 'react';
import { Project, Clip } from '../types';
import { KineticBoundingBox, KineticSettings } from '../types/kinetic';
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
          boundingBox: lastKineticBox || { x: 0, y: 0, width: 1, height: 1 },
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

  const applySettingsToAllKineticBlocks = useCallback((settings: Partial<KineticSettings>) => {
    setProject(prev => {
      const next = {
        ...prev,
        kineticBlocks: (prev.kineticBlocks || []).map(b => ({
          ...b,
          settings: { ...b.settings, ...settings }
        }))
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
      const newWords = generateBlockLayout(block, allClips, prev.resolution);

      // Preserve manual edits
      const existingWordsMap = new Map<string, any>(block.words?.map(w => [w.sourceClipId, w]) || []);
      const updatedWords = newWords.map(newWord => {
        const existingWord = existingWordsMap.get(newWord.sourceClipId);
        if (existingWord) {
          return {
            ...newWord,
            color: existingWord.color,
            stretchX: existingWord.stretchX,
            stretchY: existingWord.stretchY,
            fontFamily: existingWord.fontFamily,
            fontWeight: existingWord.fontWeight,
            textCase: existingWord.textCase,
            animation: existingWord.animation
          };
        }
        return newWord;
      });

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

  return { createKineticBlock, updateKineticBlock, deleteKineticBlock, applySettingsToAllKineticBlocks, generateBlockAnimation, updateKineticData, updateKineticWord };
};
