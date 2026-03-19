import React, { useCallback } from 'react';
import { Project, Clip } from '../types';
import { KineticBoundingBox, KineticSettings, KineticWord, KineticBlock } from '../types/kinetic';
import { generateBlockLayout } from '../utils/kinetic/KineticLayoutManager';

export const useKineticActions = (
  setProject: React.Dispatch<React.SetStateAction<Project>>,
  pushToHistory: (p: Project) => void,
  pushToHistoryDebounced: (p: Project, delay?: number) => void,
  lastKineticBox: KineticBoundingBox | null,
  setLastKineticBox: (box: KineticBoundingBox | null) => void
) => {
  const createKineticBlock = useCallback((clipIds: string[]) => {
    let newBlockId = '';
    setProject(prev => {
      const clips = prev.tracks.flatMap(t => t.clips).filter(c => clipIds.includes(c.id));
      if (clips.length === 0) return prev;
      
      const startTime = Math.min(...clips.map(c => c.startTime));
      const endTime = Math.max(...clips.map(c => c.startTime + c.duration));
      
      newBlockId = `kb-${Date.now()}`;
      const newBlock: any = {
        id: newBlockId,
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
    return newBlockId;
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
          b.id === blockId || b.parentId === blockId ? { 
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

  const generateBlockAnimation = useCallback(async (blockId: string) => {
    await document.fonts.ready;
    setProject(prev => {
      const block = prev.kineticBlocks?.find(b => b.id === blockId);
      if (!block) return prev;

      const allClips = prev.tracks.flatMap(t => t.clips);
      const screenAR = prev.resolution.width / prev.resolution.height;
      const updatedWords = generateBlockLayout(block, allClips, screenAR);

      // Group words by chunkId
      const chunks = updatedWords.reduce((acc, word) => {
        const cid = word.chunkId || 'default';
        if (!acc[cid]) acc[cid] = [];
        acc[cid].push(word);
        return acc;
      }, {} as Record<string, KineticWord[]>);

      const chunkKeys = Object.keys(chunks);
      if (chunkKeys.length === 0) return prev;

      const isChild = !!block.parentId;
      const isParent = (prev.kineticBlocks || []).some(b => b.parentId === block.id);

      if (isChild || (chunkKeys.length === 1 && !isParent)) {
        // If it's already a child block, or it only has 1 chunk (and wasn't a parent), just update it.
        const next = {
          ...prev,
          kineticBlocks: (prev.kineticBlocks || []).map(b => 
            b.id === blockId ? { ...b, words: updatedWords } : b
          )
        };
        pushToHistory(next);
        return next;
      }

      // It's a parent block (or standalone becoming a parent).
      // We create/update child blocks.
      const newBlocks: KineticBlock[] = chunkKeys.map((cid, index) => {
        const words = chunks[cid];
        const startTime = Math.min(...words.map(w => w.startTime));
        const endTime = Math.max(...words.map(w => w.endTime));
        
        // Find clips that overlap with this chunk
        const chunkClipIds = Array.from(new Set(words.map(w => w.sourceClipId)));
        
        // Determine the chosen layout style for this chunk
        const chosenLayoutStyle = words[0]?.layoutStyle || block.settings.layoutStyle;
        const chosenFont = words[0]?.fontFamily || block.settings.primaryFont;
        const chosenAnimation = words[0]?.animation || block.settings.animationStyle;
        const chosenTextCase = words[0]?.textCase || block.settings.textCase;

        const colors = ['rgba(239, 68, 68, 0.3)', 'rgba(59, 130, 246, 0.3)', 'rgba(16, 185, 129, 0.3)', 'rgba(245, 158, 11, 0.3)', 'rgba(139, 92, 246, 0.3)', 'rgba(236, 72, 153, 0.3)'];
        const newColor = colors[Math.floor(Math.random() * colors.length)];

        return {
          ...block,
          id: `kb-${Date.now()}-${index}`,
          parentId: block.id,
          name: `${block.name} ${index + 1}`,
          color: newColor,
          startTime,
          endTime,
          clipIds: chunkClipIds,
          words: words,
          settings: {
            ...block.settings,
            layoutStyle: chosenLayoutStyle,
            primaryFont: chosenFont,
            animationStyle: chosenAnimation,
            textCase: chosenTextCase,
            // Disable random mode and arrays since we've baked the choices
            randomMode: false,
            fontMultiSelect: false,
            animationMultiSelect: false,
          },
          wordOverrides: {}
        };
      });

      // Update the parent block:
      const updatedParentBlock = {
        ...block,
        words: [], // Parent block doesn't render words directly
        wordOverrides: {} // Overrides move to children
      };

      // Remove any existing children of this parent block
      const existingBlocks = (prev.kineticBlocks || []).filter(b => b.id !== blockId && b.parentId !== blockId);

      const next = {
        ...prev,
        kineticBlocks: [
          ...existingBlocks,
          updatedParentBlock,
          ...newBlocks
        ]
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

  const updateWordOverride = useCallback((blockId: string, wordId: string, updates: Partial<KineticWord>) => {
    setProject(prev => {
      const block = prev.kineticBlocks?.find(b => b.id === blockId);
      if (!block) return prev;

      const currentOverrides = block.wordOverrides || {};
      const currentWordOverride = currentOverrides[wordId] || {};

      const next = {
        ...prev,
        kineticBlocks: prev.kineticBlocks?.map(b => 
          b.id === blockId ? {
            ...b,
            wordOverrides: {
              ...currentOverrides,
              [wordId]: {
                ...currentWordOverride,
                ...updates
              }
            }
          } : b
        )
      };
      pushToHistoryDebounced(next);
      return next;
    });
  }, [setProject, pushToHistoryDebounced]);

  const clearWordOverrideProperty = useCallback((blockId: string, wordId: string, propertyKey: keyof KineticWord) => {
    setProject(prev => {
      const block = prev.kineticBlocks?.find(b => b.id === blockId);
      if (!block || !block.wordOverrides || !block.wordOverrides[wordId]) return prev;

      const currentWordOverride = { ...block.wordOverrides[wordId] };
      delete currentWordOverride[propertyKey];
      
      // If we're resetting position, also reset anchor
      if (propertyKey === 'position') {
        delete currentWordOverride['anchor'];
      }

      const next = {
        ...prev,
        kineticBlocks: prev.kineticBlocks?.map(b => 
          b.id === blockId ? {
            ...b,
            wordOverrides: {
              ...block.wordOverrides,
              [wordId]: currentWordOverride
            }
          } : b
        )
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const clearWordOverride = useCallback((blockId: string, wordId: string) => {
    setProject(prev => {
      const block = prev.kineticBlocks?.find(b => b.id === blockId);
      if (!block || !block.wordOverrides) return prev;

      const { [wordId]: _, ...rest } = block.wordOverrides;

      const next = {
        ...prev,
        kineticBlocks: prev.kineticBlocks?.map(b => 
          b.id === blockId ? {
            ...b,
            wordOverrides: rest
          } : b
        )
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const clearAllWordOverrides = useCallback((blockId: string) => {
    setProject(prev => {
      const next = {
        ...prev,
        kineticBlocks: prev.kineticBlocks?.map(b => 
          b.id === blockId ? {
            ...b,
            wordOverrides: {}
          } : b
        )
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  const splitKineticChunk = useCallback((blockId: string, chunkId: string, splitTime: number) => {
    setProject(prev => {
      const block = prev.kineticBlocks?.find(b => b.id === blockId);
      if (!block) {
        return prev;
      }

      // Find clips that belong to the first part and second part
      const allClips = prev.tracks.flatMap(t => t.clips).filter(c => block.clipIds.includes(c.id));
      
      const firstPartClips = allClips.filter(c => c.startTime < splitTime);
      const secondPartClips = allClips.filter(c => c.startTime >= splitTime);

      if (firstPartClips.length === 0 || secondPartClips.length === 0) {
        console.warn('Cannot split: one of the parts would be empty', { firstPartClips: firstPartClips.length, secondPartClips: secondPartClips.length });
        return prev; // Don't split if one side is empty
      }

      const firstPartClipIds = firstPartClips.map(c => c.id);
      const secondPartClipIds = secondPartClips.map(c => c.id);

      const firstPartEndTime = Math.max(...firstPartClips.map(c => c.startTime + c.duration));
      const secondPartStartTime = Math.min(...secondPartClips.map(c => c.startTime));

      // Create the new block for the second part
      const newBlockId = `kb-${Date.now()}`;
      
      // Assign a new color to the new block
      const colors = ['rgba(239, 68, 68, 0.3)', 'rgba(59, 130, 246, 0.3)', 'rgba(16, 185, 129, 0.3)', 'rgba(245, 158, 11, 0.3)', 'rgba(139, 92, 246, 0.3)', 'rgba(236, 72, 153, 0.3)'];
      const newColor = colors[Math.floor(Math.random() * colors.length)];

      const newBlock: KineticBlock = {
        ...block,
        id: newBlockId,
        color: newColor,
        startTime: secondPartStartTime,
        endTime: block.endTime,
        clipIds: secondPartClipIds,
        words: (block.words || []).filter(w => w.startTime >= splitTime),
        wordOverrides: {} // Reset overrides for the new block to avoid confusion
      };

      // Update the original block to only contain the first part
      const updatedOriginalBlock: KineticBlock = {
        ...block,
        endTime: firstPartEndTime,
        clipIds: firstPartClipIds,
        words: (block.words || []).filter(w => w.startTime < splitTime),
        // Filter overrides to only keep those for words in the first part
        wordOverrides: Object.fromEntries(
          Object.entries(block.wordOverrides || {}).filter(([wordId]) => {
            const word = (block.words || []).find(w => w.id === wordId);
            return word && word.startTime < splitTime;
          })
        )
      };

      const next = {
        ...prev,
        kineticBlocks: [
          ...(prev.kineticBlocks?.filter(b => b.id !== blockId) || []),
          updatedOriginalBlock,
          newBlock
        ]
      };
      pushToHistory(next);
      return next;
    });
  }, [setProject, pushToHistory]);

  return { 
    createKineticBlock, 
    updateKineticBlock, 
    deleteKineticBlock, 
    applySettingsToAllKineticBlocks, 
    generateBlockAnimation, 
    updateKineticData, 
    updateKineticWord, 
    updateWordOverride,
    clearWordOverrideProperty,
    clearWordOverride,
    clearAllWordOverrides,
    splitKineticChunk
  };
};
