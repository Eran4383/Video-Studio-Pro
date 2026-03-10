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
    if (type === 'slide-up') return 'animate-in fade-in slide-in-from-bottom-12 duration-500 fill-mode-forwards';
    if (type === 'scale') return 'animate-in fade-in zoom-in-50 duration-500 fill-mode-forwards';
    if (type === 'fade') return 'animate-in fade-in duration-500 fill-mode-forwards';
    return 'animate-in fade-in zoom-in duration-500 fill-mode-forwards'; // pop
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

        return (
          <span
            key={word.id}
            className="absolute"
            style={{
              left: `${word.position.x * 100}%`,
              top: `${word.position.y * 100}%`,
              transform: settings.layoutStyle === 'pop-in-place' ? 'translate(-50%, -50%)' : undefined,
              opacity: opacityValue,
              transition: `opacity ${fadeDuration}s ease-in-out`,
              zIndex: isActive ? 10 : 1
            }}
          >
            <span
              className={animClass}
              style={{
                display: 'block',
                color: word.color,
                fontFamily: word.fontFamily || fontFamily || 'Inter, sans-serif',
                fontSize: `${(word.fontSize || 0.1) * 100}cqh`,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                fontWeight: '900',
                textShadow: '2px 2px 0px rgba(0,0,0,0.5)',
                transformOrigin: 'center center',
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
