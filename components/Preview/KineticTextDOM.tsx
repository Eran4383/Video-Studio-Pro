import React from 'react';
import { KineticBlock } from '../../types/kinetic';

interface KineticTextDOMProps {
  block: KineticBlock;
  currentTime: number;
}

export const KineticTextDOM: React.FC<KineticTextDOMProps> = ({ block, currentTime }) => {
  const { settings, words } = block;
  
  if (!settings || !settings.boundingBox) return null;

  const { boundingBox, fontFamily, showBox } = settings;

  // Calculate container style based on bounding box
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${boundingBox.x * 100}%`,
    top: `${boundingBox.y * 100}%`,
    width: `${boundingBox.width * 100}%`,
    height: `${boundingBox.height * 100}%`,
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
        const opacityClass = isPast ? (settings.layoutStyle === 'pop-in-place' ? 'opacity-0' : 'opacity-40') : '';

        return (
          <span
            key={word.id}
            className={`absolute ${animClass} ${opacityClass}`}
            style={{
              left: `${word.position.x * 100}%`,
              top: `${word.position.y * 100}%`,
              color: word.color,
              fontFamily: word.fontFamily || fontFamily || 'Inter, sans-serif',
              fontSize: `${(word.fontSize || 0.1) * 100}cqh`, // Container Query Height
              lineHeight: 1,
              whiteSpace: 'nowrap',
              fontWeight: '900',
              textShadow: '2px 2px 0px rgba(0,0,0,0.5)',
              transformOrigin: 'center center',
              transform: settings.layoutStyle === 'pop-in-place' ? 'translate(-50%, -50%)' : undefined
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
