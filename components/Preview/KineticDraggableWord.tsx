import React, { useRef, useEffect } from 'react';
import { KineticWord, KineticSettings } from '../../types/kinetic';

interface KineticDraggableWordProps {
  word: KineticWord;
  blockId: string;
  store: any;
  isActive: boolean;
  isPast: boolean;
  isKeepVisible: boolean;
  opacityValue: number;
  fadeDuration: number;
  animClass: string;
  animDuration: number;
  settings: KineticSettings;
  isSelected: boolean;
  onSelect: (id: string) => void;
  showTransformControls?: boolean;
  key?: React.Key;
}

export const KineticDraggableWord = ({
  word,
  blockId,
  store,
  isActive,
  isPast,
  isKeepVisible,
  opacityValue,
  fadeDuration,
  animClass,
  animDuration,
  settings,
  isSelected,
  onSelect,
  showTransformControls = true
}: KineticDraggableWordProps) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startMouse = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) return; // Allow middle click to propagate for panning
    e.stopPropagation();
    if (e.button !== 0) return;
    onSelect(word.id);
    isDragging.current = true;
    startMouse.current = { x: e.clientX, y: e.clientY };
    startPos.current = { x: word.position.x, y: word.position.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !spanRef.current) return;
      
      const parent = spanRef.current.parentElement;
      if (!parent) return;
      
      const rect = parent.getBoundingClientRect();
      const deltaX = (e.clientX - startMouse.current.x) / rect.width;
      const deltaY = (e.clientY - startMouse.current.y) / rect.height;
      
      let newX = startPos.current.x + deltaX;
      let newY = startPos.current.y + deltaY;

      // Magnetic Snapping Logic
      const isSnappingActive = store.isCanvasMagnetEnabled && !e.ctrlKey;
      const threshold = 0.03;
      const guideX = document.getElementById('kinetic-guide-x');
      const guideY = document.getElementById('kinetic-guide-y');

      const anchorX = word.anchor?.x ?? (word.isCentered ? 0.5 : 0);
      const anchorY = word.anchor?.y ?? (word.isCentered ? 0.5 : 0);
      
      const wordRect = spanRef.current.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      
      const wPct = wordRect.width / parentRect.width;
      const hPct = wordRect.height / parentRect.height;
      
      const leftEdge = newX - (anchorX * wPct);
      const rightEdge = newX + ((1 - anchorX) * wPct);
      const topEdge = newY - (anchorY * hPct);
      const bottomEdge = newY + ((1 - anchorY) * hPct);

      // Snap X
      let snappedX = false;
      if (isSnappingActive) {
        if (Math.abs(newX - 0.5) < threshold) { newX = 0.5; snappedX = true; }
        else if (Math.abs(newX - 0.05) < threshold) { newX = 0.05; }
        else if (Math.abs(newX - 0.95) < threshold) { newX = 0.95; }
        else if (Math.abs(leftEdge - 0) < threshold) { newX = anchorX * wPct; }
        else if (Math.abs(rightEdge - 1) < threshold) { newX = 1 - ((1 - anchorX) * wPct); }
      }

      // Snap Y
      let snappedY = false;
      if (isSnappingActive) {
        if (Math.abs(newY - 0.5) < threshold) { newY = 0.5; snappedY = true; }
        else if (Math.abs(newY - 0.05) < threshold) { newY = 0.05; }
        else if (Math.abs(newY - 0.95) < threshold) { newY = 0.95; }
        else if (Math.abs(topEdge - 0) < threshold) { newY = anchorY * hPct; }
        else if (Math.abs(bottomEdge - 1) < threshold) { newY = 1 - ((1 - anchorY) * hPct); }
      }

      // Update Guides Visibility
      if (guideX) guideX.style.opacity = (isSnappingActive && snappedX) ? '1' : '0';
      if (guideY) guideY.style.opacity = (isSnappingActive && snappedY) ? '1' : '0';
      
      if (!word.stretchX) spanRef.current.style.left = `${newX * 100}%`;
      if (!word.stretchY) spanRef.current.style.top = `${newY * 100}%`;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging.current || !spanRef.current) return;
      isDragging.current = false;

      // Hide Guides
      const guideX = document.getElementById('kinetic-guide-x');
      const guideY = document.getElementById('kinetic-guide-y');
      if (guideX) guideX.style.opacity = '0';
      if (guideY) guideY.style.opacity = '0';
      
      const parent = spanRef.current.parentElement;
      if (!parent) return;
      
      const rect = parent.getBoundingClientRect();
      const deltaX = (e.clientX - startMouse.current.x) / rect.width;
      const deltaY = (e.clientY - startMouse.current.y) / rect.height;
      
      let newX = startPos.current.x + deltaX;
      let newY = startPos.current.y + deltaY;

      // Apply snapping to final state too
      const isSnappingActive = store.isCanvasMagnetEnabled && !e.ctrlKey;
      const threshold = 0.03;
      if (isSnappingActive) {
        const anchorX = word.anchor?.x ?? (word.isCentered ? 0.5 : 0);
        const anchorY = word.anchor?.y ?? (word.isCentered ? 0.5 : 0);
        const wordRect = spanRef.current.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        const wPct = wordRect.width / parentRect.width;
        const hPct = wordRect.height / parentRect.height;
        const leftEdge = newX - (anchorX * wPct);
        const rightEdge = newX + ((1 - anchorX) * wPct);
        const topEdge = newY - (anchorY * hPct);
        const bottomEdge = newY + ((1 - anchorY) * hPct);

        if (Math.abs(newX - 0.5) < threshold) newX = 0.5;
        else if (Math.abs(newX - 0.05) < threshold) newX = 0.05;
        else if (Math.abs(newX - 0.95) < threshold) newX = 0.95;
        else if (Math.abs(leftEdge - 0) < threshold) newX = anchorX * wPct;
        else if (Math.abs(rightEdge - 1) < threshold) newX = 1 - ((1 - anchorX) * wPct);

        if (Math.abs(newY - 0.5) < threshold) newY = 0.5;
        else if (Math.abs(newY - 0.05) < threshold) newY = 0.05;
        else if (Math.abs(newY - 0.95) < threshold) newY = 0.95;
        else if (Math.abs(topEdge - 0) < threshold) newY = anchorY * hPct;
        else if (Math.abs(bottomEdge - 1) < threshold) newY = 1 - ((1 - anchorY) * hPct);
      }
      
      store.updateWordOverride(blockId, word.id, { position: { x: newX, y: newY } });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [blockId, word.id, store, word.stretchX, word.stretchY]);

  const isStretchX = word.stretchX;
  const isStretchY = word.stretchY;

  const anchorX = word.anchor?.x ?? (word.isCentered ? 0.5 : 0);
  const anchorY = word.anchor?.y ?? (word.isCentered ? 0.5 : 0);
  const scale = word.scale ?? 1;

  let transformValue = `translate(-${anchorX * 100}%, -${anchorY * 100}%) scale(${scale})`;
  if (word.rotation) transformValue += ` rotate(${word.rotation}deg)`;
  
  if (isStretchX && isStretchY) transformValue = `scale(${scale})`;
  else if (isStretchX) transformValue = `translateY(-${anchorY * 100}%) scale(${scale})`;
  else if (isStretchY) transformValue = `translateX(-${anchorX * 100}%) scale(${scale})`;

  const hardCutoffStyles: React.CSSProperties = (isPast && !isKeepVisible) ? {
    opacity: 0,
    transition: 'none !important',
    animation: 'none !important',
    pointerEvents: 'none'
  } : {};

  // Advanced styling
  const textShadows = [];
  if (word.shadowColor || word.shadowBlur || word.shadowOffsetX || word.shadowOffsetY) {
    textShadows.push(`${word.shadowOffsetX || 0}px ${word.shadowOffsetY || 0}px ${word.shadowBlur || 0}px ${word.shadowColor || 'rgba(0,0,0,0.5)'}`);
  } else {
    textShadows.push('2px 2px 0px rgba(0,0,0,0.5)'); // Default
  }

  const WebkitTextStroke = word.strokeWidth ? `${word.strokeWidth}px ${word.strokeColor || '#000'}` : undefined;
  const backgroundColor = word.backgroundColor;
  const padding = word.backgroundPadding ? `${word.backgroundPadding}px` : undefined;

  return (
    <span
      ref={spanRef}
      onMouseDown={handleMouseDown}
      className={`absolute cursor-move hover:outline hover:outline-1 hover:outline-blue-400/50 pointer-events-auto ${(isSelected && showTransformControls) ? 'outline outline-2 outline-blue-500 z-50' : ''}`}
      style={{
        left: isStretchX ? 0 : `${word.position.x * 100}%`,
        top: isStretchY ? 0 : `${word.position.y * 100}%`,
        width: isStretchX ? '100%' : undefined,
        height: isStretchY ? '100%' : undefined,
        display: (isStretchX || isStretchY) ? 'flex' : 'block',
        alignItems: isStretchY ? 'center' : undefined,
        justifyContent: isStretchX ? 'center' : undefined,
        transform: transformValue,
        opacity: opacityValue,
        transition: isPast ? `opacity ${fadeDuration}s ease-in-out` : 'none',
        zIndex: isActive ? 10 : 1,
        backgroundColor,
        padding,
        borderRadius: backgroundColor ? '4px' : undefined,
        ...hardCutoffStyles
      }}
    >
      <span
        className={animClass}
        style={{
          display: 'block',
          color: word.color,
          fontFamily: word.fontFamily || settings.primaryFont || 'Inter, sans-serif',
          fontSize: isStretchX ? '100cqw' : (isStretchY ? '100cqh' : `${(word.fontSize || 0.1) * 100}cqh`),
          lineHeight: settings.lineHeight || 1,
          whiteSpace: (isStretchX || isStretchY) ? 'normal' : 'nowrap',
          fontWeight: word.fontWeight || settings.fontWeight || '900',
          textTransform: word.textCase === 'original' ? 'none' : (word.textCase || (settings.textCase !== 'random' ? settings.textCase : undefined) || 'none'),
          textAlign: isStretchX ? 'center' : 'left',
          textShadow: textShadows.join(', '),
          WebkitTextStroke,
          transformOrigin: 'center center',
          animationDuration: `${animDuration}s`,
          width: isStretchX ? '100%' : undefined,
          height: isStretchY ? '100%' : undefined,
        }}
      >
        {word.text}
      </span>
    </span>
  );
};
