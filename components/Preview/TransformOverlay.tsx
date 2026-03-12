import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Clip } from '../../types';

interface TransformOverlayProps {
  clip: Clip;
  containerRef: React.RefObject<HTMLDivElement>;
  onUpdate: (position: { x: number, y: number }, scale: number, rotation: number, scaleX?: number, scaleY?: number, event?: MouseEvent) => void;
  onFinalize: () => void;
  isVideo?: boolean;
  mediaDimensions?: { width: number, height: number };
}

export const TransformOverlay: React.FC<TransformOverlayProps> = ({ clip, containerRef, onUpdate, onFinalize, isVideo, mediaDimensions }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<string | null>(null);
  const [liveOverrides, setLiveOverrides] = useState<Record<string, any>>({});
  
  const startRef = useRef({ 
    x: 0, y: 0, 
    clipX: 0, clipY: 0, 
    clipScale: 1, clipRotation: 0, 
    clipScaleX: 1, clipScaleY: 1,
    startWidth: 0, startHeight: 0 
  });
  const [dimensions, setDimensions] = useState({ width: 100, height: 50 });

  // Listen for Live Overrides (from Sliders)
  useEffect(() => {
    const handleOverride = (e: Event) => {
      const { clipId, property, value } = (e as CustomEvent).detail;
      if (clipId !== clip.id) return;

      setLiveOverrides(prev => {
        const next = { ...prev };
        if (property === 'posX') next.x = value / 100;
        if (property === 'posY') next.y = value / 100;
        if (property === 'scale') {
           next.scale = value / 100;
           next.scaleX = value / 100;
           next.scaleY = value / 100;
        }
        if (property === 'rotation') next.rotation = value;
        return next;
      });
    };

    const handleClear = () => {
      setLiveOverrides({});
    };

    window.addEventListener('gfx-override', handleOverride);
    window.addEventListener('gfx-override-clear', handleClear);
    return () => {
      window.removeEventListener('gfx-override', handleOverride);
      window.removeEventListener('gfx-override-clear', handleClear);
    };
  }, [clip.id]);

  // Update dimensions based on content type
  useEffect(() => {
    if (!containerRef.current) return;

    if (clip.content) {
        // For text (subtitle), measure it
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const containerHeight = containerRef.current.clientHeight;
          const fontSize = containerHeight * 0.05; // Base font size (5% of height)
          ctx.font = `bold ${fontSize}px ${clip.font || 'Inter, sans-serif'}`;
          const metrics = ctx.measureText(clip.content || 'Text');
          setDimensions({
            width: metrics.width + 20, // Add padding
            height: fontSize * 1.2 // Line height approximation
          });
        }
    } else {
        // For video/image, use the provided media dimensions or fallback to container size
        if (mediaDimensions) {
            setDimensions(mediaDimensions);
        } else {
            setDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight
            });
        }
    }
  }, [clip.content, clip.font, containerRef.current?.clientHeight, isVideo, mediaDimensions?.width, mediaDimensions?.height]);

  const handleMouseDown = (e: React.MouseEvent, mode: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current) return;
    
    setIsDragging(true);
    setDragMode(mode);

    // Use active values (override or clip)
    const activeX = liveOverrides.posX !== undefined ? liveOverrides.posX / 100 : (clip.position?.x ?? 0.5);
    const activeY = liveOverrides.posY !== undefined ? liveOverrides.posY / 100 : (clip.position?.y ?? (clip.content ? 0.9 : 0.5));
    const activeScale = liveOverrides.scale !== undefined ? liveOverrides.scale / 100 : (clip.scale ?? 1);
    const activeRotation = liveOverrides.rotation !== undefined ? liveOverrides.rotation : (clip.rotation ?? 0);
    const activeScaleX = liveOverrides.scaleX !== undefined ? liveOverrides.scaleX / 100 : (clip.scaleX ?? clip.scale ?? 1);
    const activeScaleY = liveOverrides.scaleY !== undefined ? liveOverrides.scaleY / 100 : (clip.scaleY ?? clip.scale ?? 1);

    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      clipX: activeX,
      clipY: activeY,
      clipScale: activeScale,
      clipRotation: activeRotation,
      clipScaleX: activeScaleX,
      clipScaleY: activeScaleY,
      startWidth: dimensions.width * activeScaleX,
      startHeight: dimensions.height * activeScaleY
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current || !dragMode) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const deltaX = (e.clientX - startRef.current.x);
      const deltaY = (e.clientY - startRef.current.y);
      const shiftKey = e.shiftKey;

      if (dragMode === 'MOVE') {
        const newX = Math.max(0, Math.min(1, startRef.current.clipX + (deltaX / containerRect.width)));
        const newY = Math.max(0, Math.min(1, startRef.current.clipY + (deltaY / containerRect.height)));
        onUpdate({ x: newX, y: newY }, startRef.current.clipScale, startRef.current.clipRotation, startRef.current.clipScaleX, startRef.current.clipScaleY, e);
      } else if (dragMode === 'ROTATE') {
        const centerX = containerRect.left + (startRef.current.clipX * containerRect.width);
        const centerY = containerRect.top + (startRef.current.clipY * containerRect.height);
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        const newRotation = (angle + 90) % 360;
        onUpdate({ x: startRef.current.clipX, y: startRef.current.clipY }, startRef.current.clipScale, newRotation, startRef.current.clipScaleX, startRef.current.clipScaleY, e);
      } else {
        // Resizing logic
        // Rotate delta back to local space
        const rad = -(startRef.current.clipRotation * Math.PI) / 180;
        const localDeltaX = deltaX * Math.cos(rad) - deltaY * Math.sin(rad);
        const localDeltaY = deltaX * Math.sin(rad) + deltaY * Math.cos(rad);

        let newScaleX = startRef.current.clipScaleX;
        let newScaleY = startRef.current.clipScaleY;

        // Base dimensions (unscaled)
        const baseW = dimensions.width;
        const baseH = dimensions.height;

        if (dragMode.includes('L')) newScaleX = Math.max(0.1, startRef.current.clipScaleX - (localDeltaX * 2 / baseW));
        if (dragMode.includes('R')) newScaleX = Math.max(0.1, startRef.current.clipScaleX + (localDeltaX * 2 / baseW));
        if (dragMode.includes('T')) newScaleY = Math.max(0.1, startRef.current.clipScaleY - (localDeltaY * 2 / baseH));
        if (dragMode.includes('B')) newScaleY = Math.max(0.1, startRef.current.clipScaleY + (localDeltaY * 2 / baseH));

        if (shiftKey) {
           // Lock aspect ratio
           const ratio = startRef.current.clipScaleX / startRef.current.clipScaleY;
           if (dragMode.includes('T') || dragMode.includes('B')) {
               newScaleX = newScaleY * ratio;
           } else {
               newScaleY = newScaleX / ratio;
           }
        }

        onUpdate(
            { x: startRef.current.clipX, y: startRef.current.clipY }, 
            Math.max(newScaleX, newScaleY), // Update master scale to max of both
            startRef.current.clipRotation,
            newScaleX,
            newScaleY,
            e
        );
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
  }, [isDragging, dragMode, containerRef, onUpdate, onFinalize, dimensions]);

  const { left, top, width, height, transform } = useMemo(() => {
    // Use active values (override or clip)
    const x = liveOverrides.posX !== undefined ? liveOverrides.posX / 100 : (clip.position?.x ?? 0.5);
    const y = liveOverrides.posY !== undefined ? liveOverrides.posY / 100 : (clip.position?.y ?? (clip.content ? 0.9 : 0.5));
    const sX = liveOverrides.scaleX !== undefined ? liveOverrides.scaleX / 100 : (clip.scaleX ?? clip.scale ?? 1);
    const sY = liveOverrides.scaleY !== undefined ? liveOverrides.scaleY / 100 : (clip.scaleY ?? clip.scale ?? 1);
    const rot = liveOverrides.rotation !== undefined ? liveOverrides.rotation : (clip.rotation ?? 0);

    return {
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${dimensions.width * sX}px`,
        height: `${dimensions.height * sY}px`,
        transform: `translate(-50%, -50%) rotate(${rot}deg)`
    };
  }, [clip.position, clip.scale, clip.scaleX, clip.scaleY, clip.rotation, dimensions, liveOverrides]);

  const Handle = ({ className, cursor, mode }: { className: string, cursor: string, mode: string }) => (
    <div
      className={`absolute w-3 h-3 bg-white border border-indigo-500 rounded-full pointer-events-auto shadow-sm ${className}`}
      style={{ cursor }}
      onMouseDown={(e) => handleMouseDown(e, mode)}
    />
  );

  return (
    <div className="absolute border border-indigo-500 pointer-events-none z-[60]" style={{ left, top, width, height, transform }}>
      {/* Drag to Move Handle (Transparent Fill) */}
      <div 
        className="absolute inset-0 cursor-move pointer-events-auto" 
        onMouseDown={(e) => handleMouseDown(e, 'MOVE')} 
      />

      {/* Corners */}
      <Handle className="-top-1.5 -left-1.5" cursor="nw-resize" mode="RESIZE_TL" />
      <Handle className="-top-1.5 -right-1.5" cursor="ne-resize" mode="RESIZE_TR" />
      <Handle className="-bottom-1.5 -left-1.5" cursor="sw-resize" mode="RESIZE_BL" />
      <Handle className="-bottom-1.5 -right-1.5" cursor="se-resize" mode="RESIZE_BR" />
      
      {/* Sides */}
      <Handle className="-top-1.5 left-1/2 -translate-x-1/2" cursor="n-resize" mode="RESIZE_T" />
      <Handle className="-bottom-1.5 left-1/2 -translate-x-1/2" cursor="s-resize" mode="RESIZE_B" />
      <Handle className="top-1/2 -left-1.5 -translate-y-1/2" cursor="w-resize" mode="RESIZE_L" />
      <Handle className="top-1/2 -right-1.5 -translate-y-1/2" cursor="e-resize" mode="RESIZE_R" />

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
