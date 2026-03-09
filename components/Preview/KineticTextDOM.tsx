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

  return (
    <div 
      style={containerStyle} 
      className={`z-40 ${showBox ? 'border-2 border-dashed border-yellow-500 bg-yellow-500/10' : ''}`}
    >
      {words.map((word) => {
        // Only show if time is within word's active range
        if (currentTime < word.startTime || currentTime > word.endTime) return null;

        return (
          <span
            key={word.id}
            className={`absolute ${word.animation === 'pop' ? 'animate-in zoom-in-50 duration-200' : 'animate-in fade-in slide-in-from-bottom-2 duration-200'}`}
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
              transformOrigin: 'center center'
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
