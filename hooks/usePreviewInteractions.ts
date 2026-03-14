import React, { useState, useEffect, useRef } from 'react';
import { GFX_Engine } from '../services/GFX_Engine';
import { GFX_InteractionManager } from '../services/GFX_InteractionManager';

const interactionManager = new GFX_InteractionManager();

interface UsePreviewInteractionsProps {
  project: any;
  selectedClipIds: string[];
  selectClip: (id: string) => void;
  updateClip: any;
  applyToAll: boolean;
  finalizeMove: () => void;
  setProject: any;
  gfxCanvasRef: React.RefObject<HTMLCanvasElement>;
  scale: number;
  setScale: (s: number) => void;
  pan: { x: number, y: number };
  setPan: (p: { x: number, y: number }) => void;
  toggleFullscreen: () => void;
}

export const usePreviewInteractions = ({
  project,
  selectedClipIds,
  selectClip,
  updateClip,
  applyToAll,
  finalizeMove,
  setProject,
  gfxCanvasRef,
  scale,
  setScale,
  pan,
  setPan,
  toggleFullscreen
}: UsePreviewInteractionsProps) => {
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [isInteractingGFX, setIsInteractingGFX] = useState(false);
  const [isDraggingSub, setIsDraggingSub] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const subDragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const lastSubPosRef = useRef<{x: number, y: number} | null>(null);

  const selectedClip = project.tracks.flatMap((t: any) => t.clips).find((c: any) => selectedClipIds.includes(c.id));

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.1, scale + delta), 5);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.stopPropagation();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      handleMouseDown(e);
      return;
    }

    if (!gfxCanvasRef.current || !selectedClip) {
      handleMouseDown(e); 
      return;
    }
    
    const canvas = gfxCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    
    const layer = GFX_Engine.getLayerForClip(selectedClip, project.resolution);
    if (layer) {
      const mode = interactionManager.onMouseDown(x, y, layer);
      if (mode !== 'IDLE') {
        setIsInteractingGFX(true);
        e.stopPropagation();
      } else {
        handleMouseDown(e);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDraggingSub) {
      handleSubMouseMove(e);
      return;
    }
    if (isPanning) { handleMouseMove(e); return; }

    if (!isInteractingGFX || !gfxCanvasRef.current || !selectedClip) return;
    const canvas = gfxCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const layer = GFX_Engine.getLayerForClip(selectedClip, project.resolution);
    if (layer) {
      const updated = interactionManager.onMouseMove(x, y, layer);
      if (updated) {
        const normalized = GFX_Engine.normalizeProperties(layer, project.resolution);
        setProject((prev: any) => ({
          ...prev,
          tracks: prev.tracks.map((t: any) => ({
            ...t,
            clips: t.clips.map((c: any) => c.id === selectedClip.id ? {
              ...c,
              effects: [
                ...c.effects.filter(eff => eff.name !== 'GFX_PROPS'),
                { 
                  id: 'gfx-props',
                  type: 'adjustment',
                  name: 'GFX_PROPS',
                  params: normalized 
                }
              ]
            } : c)
          }))
        }));
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingSub) {
      handleSubMouseUp();
      return;
    }
    if (isPanning) handleMouseUp();
    if (isInteractingGFX) {
      finalizeMove();
    }
    setIsInteractingGFX(false);
    interactionManager.onMouseUp();
  };

  const handleSubMouseDown = (e: React.MouseEvent, subId: string, currentPos: {x: number, y: number}) => {
    if (e.button === 1) return;
    e.stopPropagation();
    setIsDraggingSub(true);
    setEditingSubId(subId);
    selectClip(subId);
    
    subDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: currentPos.x,
      startY: currentPos.y,
    };
  };

  const handleSubMouseMove = (e: React.MouseEvent) => {
    if (isDraggingSub && editingSubId && updateClip) {
      const containerRect = gfxCanvasRef.current?.parentElement?.getBoundingClientRect();
      if (!containerRect) return;

      const deltaX = (e.clientX - subDragStartRef.current.x) / containerRect.width;
      const deltaY = (e.clientY - subDragStartRef.current.y) / containerRect.height;

      const newX = Math.max(0, Math.min(1, subDragStartRef.current.startX + deltaX));
      const newY = Math.max(0, Math.min(1, subDragStartRef.current.startY + deltaY));
      lastSubPosRef.current = { x: newX, y: newY };

      updateClip(editingSubId, { position: { x: newX, y: newY } }, false, applyToAll);
    }
  };

  const handleSubMouseUp = () => {
    if (isDraggingSub && editingSubId && updateClip && lastSubPosRef.current) {
      updateClip(editingSubId, { position: lastSubPosRef.current }, true, applyToAll);
      lastSubPosRef.current = null;
    }
    setIsDraggingSub(false);
  };

  const handleSubDoubleClick = (e: React.MouseEvent, subId: string, content: string) => {
    e.stopPropagation();
    setEditingSubId(subId);
    setEditingText(content);
  };

  const handleSubTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingText(e.target.value);
  };

  const handleSubTextSubmit = (e: React.KeyboardEvent | React.FocusEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    if (editingSubId && updateClip) {
      updateClip(editingSubId, { content: editingText }, false, false);
    }
    setEditingSubId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'f') {
        e.stopPropagation();
        toggleFullscreen();
        return;
      }
      if (!selectedClip || !updateClip) return;
      const step = e.shiftKey ? 0.05 : 0.005;
      let dx = 0; let dy = 0;
      if (e.key === 'ArrowUp') dy = -step;
      if (e.key === 'ArrowDown') dy = step;
      if (e.key === 'ArrowLeft') dx = -step;
      if (e.key === 'ArrowRight') dx = step;
      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        const currentX = selectedClip.position?.x ?? 0.5;
        const currentY = selectedClip.position?.y ?? (selectedClip.content ? 0.9 : 0.5);
        updateClip(selectedClip.id, { position: { x: currentX + dx, y: currentY + dy }, scale }, true, applyToAll);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClip, updateClip, applyToAll, toggleFullscreen, scale]);

  return {
    isPanning,
    isInteractingGFX,
    isDraggingSub,
    editingSubId,
    editingText,
    handleWheel,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleSubMouseDown,
    handleSubDoubleClick,
    handleSubTextChange,
    handleSubTextSubmit
  };
};
