import React from 'react';
import { Clip } from '../../types';

interface KineticTextDOMProps {
  clip: Clip;
  currentTime: number;
}

export const KineticTextDOM: React.FC<KineticTextDOMProps> = ({ clip, currentTime }) => {
  const { kineticData } = clip;
  
  if (!kineticData || !kineticData.settings.boundingBox) return null;

  const { boundingBox, fontFamily, showBox } = kineticData.settings;
  const { words } = kineticData;

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

  const relativeTime = currentTime - clip.startTime;

  return (
    <div 
      style={containerStyle} 
      className={`z-40 ${showBox ? 'border-2 border-dashed border-yellow-500 bg-yellow-500/10' : ''}`}
    >
      {words.map((word) => {
        // Only show if time has passed start time (relative)
        if (relativeTime < word.startTime) return null;

        // Calculate position relative to the bounding box
        // word.position is global (0-1), bbox is global (0-1)
        const relativeX = (word.position.x - boundingBox.x) / boundingBox.width;
        const relativeY = (word.position.y - boundingBox.y) / boundingBox.height;
        
        // Calculate font size relative to the bounding box height
        // word.fontSize is global (0-1)
        const relativeFontSize = word.fontSize / boundingBox.height;

        return (
          <span
            key={word.id}
            className={`absolute ${word.entranceAnimation === 'pop' ? 'animate-in zoom-in-50 duration-200' : 'animate-in fade-in slide-in-from-bottom-2 duration-200'}`}
            style={{
              left: `${relativeX * 100}%`,
              top: `${relativeY * 100}%`,
              color: word.color,
              fontFamily: fontFamily || 'Inter, sans-serif',
              fontSize: `${relativeFontSize * 100}cqh`,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              fontWeight: '900',
              textShadow: '2px 2px 0px rgba(0,0,0,0.5)'
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
