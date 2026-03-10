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

  const ANIMATION_CLASSES: Record<string, string> = {
    'pop': 'animate-in zoom-in fade-in duration-300 fill-mode-forwards',
    'slide-up': 'animate-in slide-in-from-bottom-8 fade-in duration-300 fill-mode-forwards',
    'scale': 'animate-in zoom-in-50 fade-in duration-300 fill-mode-forwards',
    'fade': 'animate-in fade-in duration-300 fill-mode-forwards',
  };

  return (
    <div 
      style={containerStyle} 
      className={`z-40 ${showBox ? 'border-2 border-dashed border-yellow-500 bg-yellow-500/10' : ''}`}
    >
      {words.map((word) => {
        // Only show if time is within word's active range
        if (currentTime < word.startTime || currentTime > word.endTime) return null;

        const animClass = ANIMATION_CLASSES[word.animation || 'pop'] || ANIMATION_CLASSES.pop;

        return (
          <span
            key={word.id}
            className={`absolute ${animClass}`}
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
