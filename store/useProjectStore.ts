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

const INITIAL_PROJECT: Project = {
  id: 'proj-1',
  name: 'New Project',
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  tracks: [
    { id: 'track-v1', name: 'Video 1', type: 'video', clips: [], isVisible: true, isMuted: false, isLocked: false, height: 72 },
    { id: 'track-a1', name: 'Audio 1', type: 'audio', clips: [], isVisible: true, isMuted: false, isLocked: false, height: 72 }
  ],
  backgroundColor: '#000000',
  kineticBlocks: [],
  waveformStyle: 'solid'
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
  const [showTransformControls, setShowTransformControls] = useState(true);
  const [applyToAll, setApplyToAll] = useState(false);
  const [kineticDrawMode, setKineticDrawMode] = useState(false);
  const [kineticCutMode, setKineticCutMode] = useState(false);
  const [lastKineticBox, setLastKineticBox] = useState<KineticBoundingBox | null>(null);
  const [selectedKineticWordId, setSelectedKineticWordId] = useState<string | null>(null);

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

  const setProjectResolution = useCallback((width: number, height: number) => {
    setProject(prev => {
      const screenAR = width / height;
      const allClips = prev.tracks.flatMap(t => t.clips);
      const nextBlocks = prev.kineticBlocks.map(block => ({
        ...block,
        words: generateBlockLayout(block, allClips, screenAR)
      }));
      
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

  const detachAudio = useCallback(() => { /* Placeholder */ }, []);

  return {
    project, assets, currentTime, isPlaying, isLooping, selectedClipIds, zoom, isMagnetEnabled, isCanvasMagnetEnabled, showTransformControls, kineticDrawMode, kineticCutMode, lastKineticBox, selectedKineticWordId,
    setZoom, setCurrentTime, setIsPlaying, setIsLooping, setIsMagnetEnabled, setIsCanvasMagnetEnabled, setShowTransformControls, setKineticDrawMode, setKineticCutMode, setBackgroundColor, setProjectResolution, addAsset, setSelectedKineticWordId, setWaveformStyle,
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
