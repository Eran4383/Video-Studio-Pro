import { useState, useCallback } from 'react';
import { Project, Asset } from '../types';
import { KineticBoundingBox } from '../types/kinetic';
import { useHistory } from './useHistory';
import { useTrackActions } from './useTrackActions';
import { useClipActions } from './useClipActions';
import { useKineticActions } from './useKineticActions';
import { useMoveActions } from './useMoveActions';
import { useSubtitleActions } from './useSubtitleActions';
import { generateBlockLayout } from '../utils/kinetic/KineticLayoutManager';
import { webAudioEngine } from '../services/WebAudioEngine';

const generateDefaultName = () => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = String(now.getFullYear()).slice(-2);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `KVG_${d}${m}${y}_${hh}${mm}`;
};

const INITIAL_PROJECT: Project = {
  id: 'proj-1',
  name: generateDefaultName(),
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  tracks: [
    { id: 'track-v1', name: 'Video 1', type: 'video', clips: [], isVisible: true, isMuted: false, isLocked: false, height: 72 },
    { id: 'track-a1', name: 'Audio 1', type: 'audio', clips: [], isVisible: true, isMuted: false, isLocked: false, height: 72 }
  ],
  backgroundColor: '#000000',
  kineticBlocks: [],
  waveformStyle: 'lines',
  waveformScale: 1.0
};

export const useProjectStore = () => {
  const [project, setProject] = useState<Project>(INITIAL_PROJECT);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(10);
  const [isMagnetEnabled, setIsMagnetEnabled] = useState(true);
  const [isCanvasMagnetEnabled, setIsCanvasMagnetEnabled] = useState(true);
  const [showTransformControls, setShowTransformControls] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);
  const [kineticDrawMode, setKineticDrawMode] = useState(false);
  const [kineticCutMode, setKineticCutMode] = useState(false);
  const [showAudioMonitor, setShowAudioMonitor] = useState(true);
  const [lastKineticBox, setLastKineticBox] = useState<KineticBoundingBox | null>(null);
  const [selectedKineticWordId, setSelectedKineticWordId] = useState<string | null>(null);
  const [fileHandle, setFileHandle] = useState<any>(null);

  const { pushToHistory, pushToHistoryDebounced, undo, redo, historyIndexRef, historyRef } = useHistory(setProject, INITIAL_PROJECT);
  
  const trackActions = useTrackActions(setProject, pushToHistory);
  const clipActions = useClipActions(setProject, pushToHistory, assets, selectedClipIds, setSelectedClipIds);
  const kineticActions = useKineticActions(setProject, pushToHistory, pushToHistoryDebounced, lastKineticBox, setLastKineticBox);
  const moveActions = useMoveActions(setProject, setSelectedClipIds, selectedClipIds, isMagnetEnabled, currentTime);
  const subtitleActions = useSubtitleActions(setProject, pushToHistory, assets, currentTime, setSelectedClipIds, selectedClipIds);

  const setBackgroundColor = useCallback((color: string) => {
    setProject(prev => {
      const next = { ...prev, backgroundColor: color };
      pushToHistory(next);
      return next;
    });
  }, [pushToHistory]);

  const setWaveformStyle = useCallback((style: 'solid' | 'lines') => {
    setProject(prev => {
      const next = { ...prev, waveformStyle: style };
      pushToHistory(next);
      return next;
    });
  }, [pushToHistory]);

  const setWaveformScale = useCallback((scale: number) => {
    setProject(prev => {
      const next = { ...prev, waveformScale: scale };
      pushToHistory(next);
      return next;
    });
  }, [pushToHistory]);

  const setProjectResolution = useCallback((width: number, height: number) => {
    setProject(prev => {
      const screenAR = width / height;
      const allClips = prev.tracks.flatMap(t => t.clips);
      const nextBlocks = prev.kineticBlocks.map(block => {
        const isParent = prev.kineticBlocks.some(b => b.parentId === block.id);
        
        if (isParent) {
          // Parent blocks should never have words, they just hold the settings
          return { ...block, words: [] };
        }

        if (!block.words || block.words.length === 0) {
          return block;
        }

        // Generate new layout based on the new aspect ratio
        const newWords = generateBlockLayout(block, allClips, screenAR);
        
        if (newWords.length !== block.words.length) {
          // Fallback: if word counts mismatch, use the new generated words
          return { ...block, words: newWords };
        }

        // Merge the new layout properties with the existing word properties (colors, fonts, etc.)
        const mergedWords = block.words.map((oldWord, i) => {
          const newWord = newWords[i];
          return {
            ...oldWord,
            position: newWord.position,
            fontSize: newWord.fontSize,
            width: newWord.width,
            isCentered: newWord.isCentered,
            layoutStyle: newWord.layoutStyle // Update layout style in case it changed
          };
        });

        return {
          ...block,
          words: mergedWords
        };
      });
      
      const next = { 
        ...prev, 
        resolution: { width, height },
        kineticBlocks: nextBlocks
      };
      pushToHistory(next);
      return next;
    });
  }, [pushToHistory]);

  const addAsset = useCallback((asset: Asset) => {
    setAssets(prev => [...prev, asset]);
  }, []);

  const deleteAsset = useCallback((assetId: string) => {
    setAssets(prev => prev.filter(a => a.id !== assetId));
    setProject(prev => {
      const next = {
        ...prev,
        tracks: prev.tracks.map(t => ({
          ...t,
          clips: t.clips.filter(c => c.assetId !== assetId)
        }))
      };
      pushToHistory(next);
      return next;
    });
  }, [pushToHistory]);

  const updateAsset = useCallback((assetId: string, updates: Partial<Asset>) => {
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...updates } : a));
  }, []);

  const resetProject = useCallback(() => {
    const newProj = { ...INITIAL_PROJECT, id: `proj-${Date.now()}`, name: generateDefaultName() };
    webAudioEngine.clearCache();
    setProject(newProj);
    setAssets([]);
    setCurrentTime(0);
    setSelectedClipIds([]);
    setFileHandle(null);
    pushToHistory(newProj);
  }, [pushToHistory]);

  const loadProjectData = useCallback((newProject: Partial<Project>, newAssets: Asset[]) => {
    webAudioEngine.clearCache();
    const sanitizedProject: Project = {
      ...INITIAL_PROJECT,
      ...newProject,
      tracks: (newProject.tracks || []).map(track => ({
        ...track,
        isVisible: track.isVisible ?? true,
        isMuted: track.isMuted ?? false,
        isLocked: track.isLocked ?? false,
        height: track.height ?? (track.type === 'subtitle' ? 40 : 72),
        clips: (track.clips || []).map(clip => ({
          ...clip,
          effects: clip.effects || [],
          startTime: clip.startTime || 0,
          offset: clip.offset || 0,
          duration: clip.duration || 1,
          layer: clip.layer || 0,
        }))
      })),
      kineticBlocks: newProject.kineticBlocks || [],
      backgroundColor: newProject.backgroundColor || '#000000',
      waveformStyle: newProject.waveformStyle || 'lines',
      waveformScale: newProject.waveformScale || 1.0,
      resolution: newProject.resolution || { width: 1920, height: 1080 },
      fps: newProject.fps || 30
    };
    
    setProject(sanitizedProject);
    setAssets(newAssets || []);
    setCurrentTime(0);
    setSelectedClipIds([]);
    pushToHistory(sanitizedProject);
  }, [pushToHistory]);

  const detachAudio = useCallback(() => { /* Placeholder */ }, []);

  return {
    project, assets, currentTime, isPlaying, isLooping, selectedClipIds, zoom, isMagnetEnabled, isCanvasMagnetEnabled, showTransformControls, kineticDrawMode, kineticCutMode, showAudioMonitor, lastKineticBox, selectedKineticWordId, fileHandle,
    setZoom, setCurrentTime, setIsPlaying, setIsLooping, setIsMagnetEnabled, setIsCanvasMagnetEnabled, setShowTransformControls, setKineticDrawMode, setKineticCutMode, setShowAudioMonitor, setBackgroundColor, setProjectResolution, addAsset, deleteAsset, updateAsset, setSelectedKineticWordId, setWaveformStyle, setWaveformScale, setFileHandle,
    resetProject, loadProjectData,
    ...trackActions,
    ...clipActions,
    ...kineticActions,
    ...moveActions,
    ...subtitleActions,
    detachAudio,
    undo, redo, canUndo: historyIndexRef.current > 0, canRedo: historyIndexRef.current < historyRef.current.length - 1,
    pushToHistory,
    pushToHistoryDebounced,
    splitKineticChunk: kineticActions.splitKineticChunk,
    clearWordOverrideProperty: kineticActions.clearWordOverrideProperty,
    finalizeMove: () => pushToHistory(project),
    setProject,
    selectClips: setSelectedClipIds,
    updateClip: clipActions.updateClipProperties,
    setApplyToAll,
    applyToAll
  };
};
