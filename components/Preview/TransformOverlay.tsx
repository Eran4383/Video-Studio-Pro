import React, { useRef, useEffect, useState, useMemo } from 'react';
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
  const startRef = useRef({ x: 0, y: 0, clipX: 0, clipY: 0, clipScale: 1, clipRotation: 0, startDist: 0 });
  const [dimensions, setDimensions] = useState({ width: 100, height: 50 });

  // Measure text dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const containerHeight = containerRef.current.clientHeight;
      const fontSize = containerHeight * 0.05; // Base font size (5% of height)
      ctx.font = `bold ${fontSize}px ${clip.font || 'Inter, sans-serif'}`;
      const metrics = ctx.measureText(clip.content || 'Text');
      setDimensions({
        width: metrics.width + 20, //  Add padding
        height: fontSize * 1.2 // Line height approximation
      });
    }
  }, [clip.content, clip.font, containerRef.current?.clientHeight]);

  const handleMouseDown = (e: React.MouseEvent, mode: 'MOVE' | 'RESIZE' | 'ROTATE') => {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + (clip.position?.x ?? 0.5) * rect.width;
    const centerY = rect.top + (clip.position?.y ?? 0.9) * rect.height;
    const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);

    setIsDragging(true);
    setDragMode(mode);
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      clipX: clip.position?.x ?? 0.5,
      clipY: clip.position?.y ?? 0.9,
      clipScale: clip.scale ?? 1,
      clipRotation: clip.rotation ?? 0,
      startDist: dist
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
        // Calculate new scale based on distance from center
        const centerX = containerRect.left + (startRef.current.clipX * containerRect.width);
        const centerY = containerRect.top + (startRef.current.clipY * containerRect.height);
        const currentDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        
        const scaleFactor = currentDist / startRef.current.startDist;
        const newScale = Math.max(0.1, startRef.current.clipScale * scaleFactor);
        
        onUpdate({ x: startRef.current.clipX, y: startRef.current.clipY }, newScale, startRef.current.clipRotation);
      } else if (dragMode === 'ROTATE') {
        const centerX = containerRect.left + (startRef.current.clipX * containerRect.width);
        const centerY = containerRect.top + (startRef.current.clipY * containerRect.height);
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        const newRotation = (angle + 90) % 360;
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

  const { left, top, width, height, transform } = useMemo(() => ({
    left: `${(clip.position?.x ?? 0.5) * 100}%`,
    top: `${(clip.position?.y ?? 0.9) * 100}%`,
    width: `${dimensions.width * (clip.scale ?? 1)}px`,
    height: `${dimensions.height * (clip.scale ?? 1)}px`,
    transform: `translate(-50%, -50%) rotate(${clip.rotation ?? 0}deg)`
  }), [clip.position, clip.scale, clip.rotation, dimensions]);

  const Handle = ({ className, cursor }: { className: string, cursor: string }) => (
    <div
      className={`absolute w-3 h-3 bg-white border border-indigo-500 rounded-full pointer-events-auto shadow-sm ${className}`}
      style={{ cursor }}
      onMouseDown={(e) => handleMouseDown(e, 'RESIZE')}
    />
  );

  return (
    <div className="absolute border border-indigo-500 pointer-events-none z-[60]" style={{ left, top, width, height, transform }}>
      <Handle className="-top-1.5 -left-1.5" cursor="nw-resize" />
      <Handle className="-top-1.5 -right-1.5" cursor="ne-resize" />
      <Handle className="-bottom-1.5 -left-1.5" cursor="sw-resize" />
      <Handle className="-bottom-1.5 -right-1.5" cursor="se-resize" />
      
      {/* Rotation Handle */}
      <div
        className="absolute -top-8 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border border-indigo-500 rounded-full cursor-grab pointer-events-auto flex items-center justify-center shadow-sm"
        onMouseDown={(e) => handleMouseDown(e, 'ROTATE')}
      >
        <div className="w-px h-2 bg-indigo-500" />
      </div>
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-px h-8 bg-indigo-500/50 -z-10" />
    </div>
  );
};
