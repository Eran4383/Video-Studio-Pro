import React, { useRef, useEffect, useState } from 'react';
import { Clip } from '../../types';

interface TransformOverlayProps {
  clip: Clip;
  containerRef: React.RefObject<HTMLDivElement>;
  onUpdate: (position: { x: number, y: number }, scale: number, rotation: number) => void;
  onFinalize: () => void;
}

export const TransformOverlay: React.FC<TransformOverlayProps> = ({ clip, containerRef, onUpdate, onFinalize }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'MOVE' | 'RESIZE' | 'ROTATE' | null>(null);
  const startRef = useRef({ x: 0, y: 0, clipX: 0, clipY: 0, clipScale: 1, clipRotation: 0 });

  const handleMouseDown = (e: React.MouseEvent, mode: 'MOVE' | 'RESIZE' | 'ROTATE') => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    setDragMode(mode);
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      clipX: clip.position?.x ?? 0.5,
      clipY: clip.position?.y ?? 0.9,
      clipScale: clip.scale ?? 1,
      clipRotation: clip.rotation ?? 0
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const deltaX = (e.clientX - startRef.current.x);
      const deltaY = (e.clientY - startRef.current.y);

      if (dragMode === 'MOVE') {
        const newX = Math.max(0, Math.min(1, startRef.current.clipX + (deltaX / containerRect.width)));
        const newY = Math.max(0, Math.min(1, startRef.current.clipY + (deltaY / containerRect.height)));
        onUpdate({ x: newX, y: newY }, startRef.current.clipScale, startRef.current.clipRotation);
      } else if (dragMode === 'RESIZE') {
        // Simple scaling based on diagonal drag
        const scaleDelta = deltaX / 200; // Sensitivity
        const newScale = Math.max(0.1, startRef.current.clipScale + scaleDelta);
        onUpdate({ x: startRef.current.clipX, y: startRef.current.clipY }, newScale, startRef.current.clipRotation);
      } else if (dragMode === 'ROTATE') {
        // Calculate rotation based on angle from center
        const centerX = containerRect.left + (startRef.current.clipX * containerRect.width);
        const centerY = containerRect.top + (startRef.current.clipY * containerRect.height);
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        // Snap to 45 degrees if shift held? (Not implemented yet)
        const newRotation = (angle + 90) % 360; // +90 because handle is at top
        onUpdate({ x: startRef.current.clipX, y: startRef.current.clipY }, startRef.current.clipScale, newRotation);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragMode(null);
        onFinalize();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragMode, containerRef, onUpdate, onFinalize]);

  // Calculate position in pixels for the overlay
  const left = (clip.position?.x ?? 0.5) * 100;
  const top = (clip.position?.y ?? 0.9) * 100;
  const scale = clip.scale ?? 1;
  const rotation = clip.rotation ?? 0;

  return (
    <div
      className="absolute border-2 border-indigo-500 pointer-events-none z-[60]"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${scale * 300}px`, // Approximate width based on font size/content
        height: `${scale * 60}px`, // Approximate height
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
    >
      {/* Resize Handle (Bottom Right) */}
      <div
        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-indigo-500 rounded-full cursor-se-resize pointer-events-auto shadow-sm"
        onMouseDown={(e) => handleMouseDown(e, 'RESIZE')}
      />
      
      {/* Rotation Handle (Top Center) */}
      <div
        className="absolute -top-6 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-indigo-500 rounded-full cursor-grab pointer-events-auto shadow-sm flex items-center justify-center"
        onMouseDown={(e) => handleMouseDown(e, 'ROTATE')}
      >
        <div className="w-px h-4 bg-indigo-500 absolute top-3" />
      </div>
      
      {/* Move Handle (Center - Invisible overlay for dragging) */}
      {/* Actually, the user wants to drag the object itself, but this overlay provides the visual feedback */}
    </div>
  );
};
