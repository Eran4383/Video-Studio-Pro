import React from 'react';
import { KineticBlock } from '../../types/kinetic';

interface KineticTextDOMProps {
  block: KineticBlock;
  currentTime: number;
}

export const KineticTextDOM: React.FC<KineticTextDOMProps> = ({ block, currentTime }) => {
  const { settings, words } = block;
  
  if (!settings) return null;

  const box = settings.boundingBox || { x: 0, y: 0, width: 1, height: 1 };
  const { fontFamily, showBox } = settings;

  // Calculate container style based on bounding box
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.width * 100}%`,
    height: `${box.height * 100}%`,
    overflow: 'hidden',
    pointerEvents: 'none',
    containerType: 'size', // Allows children to use cqh/cqw units relative to this box
  };

  const getAnimationClass = (type: string) => {
    if (type === 'slide-up') return 'animate-in fade-in slide-in-from-bottom-12 fill-mode-forwards';
    if (type === 'scale') return 'animate-in fade-in zoom-in-50 fill-mode-forwards';
    if (type === 'fade') return 'animate-in fade-in fill-mode-forwards';
    return 'animate-in fade-in zoom-in fill-mode-forwards'; // pop
  };

  return (
    <div 
      style={containerStyle} 
      className={`z-40 ${showBox ? 'border-2 border-dashed border-yellow-500 bg-yellow-500/10' : ''}`}
    >
      {words.map((word) => {
        const isPast = currentTime > word.endTime;
        const isActive = currentTime >= word.startTime && currentTime <= word.endTime;
        const shouldShow = isActive || (isPast && settings.keepPreviousWordsVisible);

        if (!shouldShow) return null;

        const animClass = getAnimationClass(word.animation || 'pop');
        
        // Dynamic opacity and transition for past words
        const pastOpacity = settings.pastWordsOpacity !== undefined ? settings.pastWordsOpacity / 100 : 0.4;
        const fadeDuration = settings.pastWordsFadeDuration || 0.5;
        
        const opacityValue = isPast 
          ? (settings.layoutStyle === 'pop-in-place' ? 0 : pastOpacity) 
          : 1;

        const wordDuration = word.endTime - word.startTime;
        const animDuration = Math.min(0.5, wordDuration);

        // Stretch logic
        const isStretchX = word.stretchX;
        const isStretchY = word.stretchY;

        return (
          <span
            key={word.id}
            className="absolute"
            style={{
              left: isStretchX ? 0 : `${word.position.x * 100}%`,
              top: isStretchY ? 0 : `${word.position.y * 100}%`,
              width: isStretchX ? '100%' : undefined,
              height: isStretchY ? '100%' : undefined,
              display: (isStretchX || isStretchY) ? 'flex' : 'block',
              alignItems: isStretchY ? 'center' : undefined,
              justifyContent: isStretchX ? 'center' : undefined,
              transform: (settings.layoutStyle === 'pop-in-place' && !isStretchX && !isStretchY) ? 'translate(-50%, -50%)' : undefined,
              opacity: opacityValue,
              transition: isPast ? `opacity ${fadeDuration}s ease-in-out` : 'none',
              zIndex: isActive ? 10 : 1
            }}
          >
            <span
              className={animClass}
              style={{
                display: 'block',
                color: word.color,
                fontFamily: word.fontFamily || fontFamily || 'Inter, sans-serif',
                fontSize: isStretchX ? '100cqw' : (isStretchY ? '100cqh' : `${(word.fontSize || 0.1) * 100}cqh`),
                lineHeight: settings.lineHeight || 1,
                whiteSpace: (isStretchX || isStretchY) ? 'normal' : 'nowrap',
                fontWeight: settings.fontWeight || '900',
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
      })}
    </div>
  );
};
