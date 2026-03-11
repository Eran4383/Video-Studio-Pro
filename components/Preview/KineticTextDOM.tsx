import React, { useMemo } from 'react';
import { KineticBlock } from '../../types/kinetic';
import { useProjectStore } from '../../store/useProjectStore';
import { Clip } from '../../types';

interface KineticTextDOMProps {
  block: KineticBlock;
  currentTime: number;
}

export const KineticTextDOM: React.FC<KineticTextDOMProps> = ({ block, currentTime }) => {
  const { project } = useProjectStore();
  const { settings, words } = block;
  
  if (!settings) return null;

  // Optimized Clip Map for O(1) lookup
  const clipMap = useMemo(() => {
    const map: Record<string, Clip> = {};
    project.tracks.forEach(track => {
      track.clips.forEach(clip => {
        map[clip.id] = clip;
      });
    });
    return map;
  }, [project.tracks]);

  const box = settings.boundingBox || { x: 0, y: 0, width: 1, height: 1 };
  const { fontFamily, showBox } = settings;

  // Pre-calculate word indices and counts per clip for O(1) timing calculation
  const wordMetadata = useMemo(() => {
    const metadata: Record<string, { index: number, total: number }> = {};
    const clipWordCounts: Record<string, number> = {};
    const clipWordIndices: Record<string, number> = {};

    words.forEach(w => {
      if (w.sourceClipId) {
        clipWordCounts[w.sourceClipId] = (clipWordCounts[w.sourceClipId] || 0) + 1;
      }
    });

    words.forEach(w => {
      if (w.sourceClipId) {
        const idx = clipWordIndices[w.sourceClipId] || 0;
        metadata[w.id] = { index: idx, total: clipWordCounts[w.sourceClipId] };
        clipWordIndices[w.sourceClipId] = idx + 1;
      }
    });
    return metadata;
  }, [words]);

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
        // Live Time Sync: Use the current clip state from the map
        const clip = clipMap[word.sourceClipId];
        const meta = wordMetadata[word.id];
        
        // Fallback to word's own timing if clip not found (e.g. single layout preview)
        let isActive = false;
        let isPast = false;

        if (clip && meta) {
          // Calculate word's position within the clip to find its live timing
          const wordDuration = clip.duration / Math.max(1, meta.total);
          
          const liveStartTime = clip.startTime + (meta.index * wordDuration);
          const liveEndTime = liveStartTime + wordDuration;
          
          isActive = currentTime >= liveStartTime && currentTime <= liveEndTime;
          isPast = currentTime > liveEndTime;
        } else {
          isActive = currentTime >= word.startTime && currentTime <= word.endTime;
          isPast = currentTime > word.endTime;
        }

        const isKeepVisible = 
          (word.layoutStyle === 'dynamic-collage' && settings.keepPastInCollage) ||
          (word.layoutStyle === 'karaoke' && settings.keepPastInKaraoke) ||
          (word.layoutStyle === 'pop-in-place' && settings.keepPastInPop) ||
          settings.keepPreviousWordsVisible; // fallback for old projects

        const shouldShow = isActive || (isPast && isKeepVisible);

        if (!shouldShow) return null;

        const animClass = getAnimationClass(word.animation || 'pop');
        
        // Dynamic opacity and transition for past words
        const pastOpacity = settings.pastWordsOpacity !== undefined ? settings.pastWordsOpacity / 100 : 0.4;
        const fadeDuration = settings.pastWordsFadeDuration || 0.5;
        
        const opacityValue = isPast 
          ? (word.layoutStyle === 'pop-in-place' || !isKeepVisible ? 0 : pastOpacity) 
          : 1;

        // CSS Ghosting Fix: Hard cutoff if not keeping previous words
        const hardCutoffStyles: React.CSSProperties = (isPast && !isKeepVisible) ? {
          opacity: 0,
          transition: 'none !important',
          animation: 'none !important',
          pointerEvents: 'none'
        } : {};

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
              transform: (word.isCentered && !isStretchX && !isStretchY) ? 'translate(-50%, -50%)' : undefined,
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
                fontFamily: word.fontFamily || fontFamily || 'Inter, sans-serif',
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
      })}
    </div>
  );
};
