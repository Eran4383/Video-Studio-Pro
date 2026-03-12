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
}

export const KineticDraggableWord: React.FC<KineticDraggableWordProps> = ({
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
  settings
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startMouse = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      
      const newX = startPos.current.x + deltaX;
      const newY = startPos.current.y + deltaY;
      
      if (!word.stretchX) spanRef.current.style.left = `${newX * 100}%`;
      if (!word.stretchY) spanRef.current.style.top = `${newY * 100}%`;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging.current || !spanRef.current) return;
      isDragging.current = false;
      
      const parent = spanRef.current.parentElement;
      if (!parent) return;
      
      const rect = parent.getBoundingClientRect();
      const deltaX = (e.clientX - startMouse.current.x) / rect.width;
      const deltaY = (e.clientY - startMouse.current.y) / rect.height;
      
      const newX = startPos.current.x + deltaX;
      const newY = startPos.current.y + deltaY;
      
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

  let transformValue = undefined;
  if (word.isCentered) {
    if (!isStretchX && !isStretchY) transformValue = 'translate(-50%, -50%)';
    else if (isStretchX && !isStretchY) transformValue = 'translateY(-50%)';
    else if (!isStretchX && isStretchY) transformValue = 'translateX(-50%)';
  }

  const hardCutoffStyles: React.CSSProperties = (isPast && !isKeepVisible) ? {
    opacity: 0,
    transition: 'none !important',
    animation: 'none !important',
    pointerEvents: 'none'
  } : {};

  return (
    <span
      ref={spanRef}
      onMouseDown={handleMouseDown}
      className="absolute cursor-move hover:outline hover:outline-1 hover:outline-blue-400/50 pointer-events-auto"
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
          textTransform: word.textCase || (settings.textCase !== 'random' ? settings.textCase : undefined) || 'none',
          textAlign: isStretchX ? 'center' : 'left',
          textShadow: '2px 2px 0px rgba(0,0,0,0.5)',
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
