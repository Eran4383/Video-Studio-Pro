import React, { useMemo } from 'react';
import { KineticBlock } from '../../types/kinetic';
import { Clip } from '../../types';
import { KineticDraggableWord } from './KineticDraggableWord';

interface KineticTextDOMProps {
  block: KineticBlock;
  currentTime: number;
  store: any;
  showTransformControls?: boolean;
  key?: React.Key;
}

export const KineticTextDOM = ({ block, currentTime, store, showTransformControls }: KineticTextDOMProps) => {
  const { project } = store;
  const { settings, words } = block;
  
  if (!settings) return null;

  const liveOverrides = (window as any).liveOverrides?.[block.id] || {};

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
  const { showBox } = settings;

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

  const cropT = block.effects?.find((e: any) => e.name === 'crop')?.params?.top ?? 0;
  const cropB = block.effects?.find((e: any) => e.name === 'crop')?.params?.bottom ?? 0;
  const cropL = block.effects?.find((e: any) => e.name === 'crop')?.params?.left ?? 0;
  const cropR = block.effects?.find((e: any) => e.name === 'crop')?.params?.right ?? 0;

  const getEffectParam = (effectName: string, paramName: string, defaultValue: any) => {
    const overrideKey = `effect_${effectName}_${paramName}`;
    if (liveOverrides[overrideKey] !== undefined) return liveOverrides[overrideKey];
    const effect = block.effects?.find((e: any) => e.name === effectName);
    return effect?.params?.[paramName] ?? defaultValue;
  };

  let effectOpacity = 1;
  let filterString = '';
  let transformValue = '';
  let glitchOffsetX = 0;
  let glitchOffsetY = 0;

  const flickerEffect = block.effects?.find((e: any) => e.name === 'flicker') || liveOverrides.effect_flicker_speed !== undefined || liveOverrides.effect_flicker_intensity !== undefined;
  if (flickerEffect) {
    const speed = getEffectParam('flicker', 'speed', 50) / 100;
    const intensity = getEffectParam('flicker', 'intensity', 50) / 100;
    const flickerVal = Math.sin(currentTime * (10 + speed * 50));
    effectOpacity = flickerVal > 0 ? 1 : 1 - intensity;
  }

  const glitchEffect = block.effects?.find((e: any) => e.name === 'glitch') || liveOverrides.effect_glitch_intensity !== undefined;
  if (glitchEffect) {
    const intensity = getEffectParam('glitch', 'intensity', 50) / 100;
    const isGlitching = Math.sin(currentTime * 30) > (1 - intensity * 0.8);
    if (isGlitching) {
      glitchOffsetX = (Math.random() - 0.5) * intensity * 20;
      glitchOffsetY = (Math.random() - 0.5) * intensity * 10;
      filterString += ` hue-rotate(${Math.random() * 90 - 45}deg) saturate(${100 + intensity * 100}%)`;
    }
  }

  const vhsEffect = block.effects?.find((e: any) => e.name === 'vhs') || liveOverrides.effect_vhs_colorBleed !== undefined || liveOverrides.effect_vhs_noise !== undefined;
  if (vhsEffect) {
     const colorBleed = getEffectParam('vhs', 'colorBleed', 50) / 100;
     filterString += ` sepia(30%) hue-rotate(${colorBleed * 20}deg) contrast(120%) saturate(80%)`;
  }

  const shakeEffect = block.effects?.find((e: any) => e.name === 'shake') || liveOverrides.effect_shake_intensity !== undefined || liveOverrides.effect_shake_speed !== undefined;
  if (shakeEffect) {
    const intensity = getEffectParam('shake', 'intensity', 50) / 100;
    const speed = getEffectParam('shake', 'speed', 50) / 100;
    glitchOffsetX += Math.sin(currentTime * (10 + speed * 40)) * intensity * 10;
    glitchOffsetY += Math.cos(currentTime * (12 + speed * 35)) * intensity * 10;
  }

  const spinEffect = block.effects?.find((e: any) => e.name === 'spin') || liveOverrides.effect_spin_speed !== undefined || liveOverrides.effect_spin_direction !== undefined;
  if (spinEffect) {
    const speed = getEffectParam('spin', 'speed', 50) / 100;
    const dir = getEffectParam('spin', 'direction', 1);
    const spinRot = (currentTime * speed * 360) * dir;
    transformValue += ` rotate(${spinRot}deg)`;
  }

  if (glitchOffsetX !== 0 || glitchOffsetY !== 0) {
    transformValue += ` translate(${glitchOffsetX}px, ${glitchOffsetY}px)`;
  }

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
    clipPath: (cropT > 0 || cropB > 0 || cropL > 0 || cropR > 0) ? `inset(${cropT}% ${cropR}% ${cropB}% ${cropL}%)` : 'none',
    opacity: effectOpacity,
    filter: filterString || undefined,
    transform: transformValue || undefined
  };

  const getAnimationClass = (type: string) => {
    if (type === 'slide-up') return 'animate-in fade-in slide-in-from-bottom-12 fill-mode-forwards';
    if (type === 'scale') return 'animate-in fade-in zoom-in-50 fill-mode-forwards';
    if (type === 'fade') return 'animate-in fade-in fill-mode-forwards';
    return 'animate-in fade-in zoom-in fill-mode-forwards'; // pop
  };

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOverride = (e: Event) => {
      const { clipId, property, value } = (e as CustomEvent).detail;
      if (clipId !== block.id) return;
      if (!containerRef.current) return;

      if (property === 'bbox_x') containerRef.current.style.left = `${value}%`;
      if (property === 'bbox_y') containerRef.current.style.top = `${value}%`;
      if (property === 'bbox_width') containerRef.current.style.width = `${value}%`;
      if (property === 'bbox_height') containerRef.current.style.height = `${value}%`;

      // Handle Crop Overrides for the block container
      if (property.startsWith('effect_crop_')) {
        const overrides = (window as any).liveOverrides?.[block.id] || {};
        const cropT = property === 'effect_crop_top' ? value : (overrides.effect_crop_top !== undefined ? overrides.effect_crop_top : (block.effects?.find((e: any) => e.name === 'crop')?.params?.top ?? 0));
        const cropB = property === 'effect_crop_bottom' ? value : (overrides.effect_crop_bottom !== undefined ? overrides.effect_crop_bottom : (block.effects?.find((e: any) => e.name === 'crop')?.params?.bottom ?? 0));
        const cropL = property === 'effect_crop_left' ? value : (overrides.effect_crop_left !== undefined ? overrides.effect_crop_left : (block.effects?.find((e: any) => e.name === 'crop')?.params?.left ?? 0));
        const cropR = property === 'effect_crop_right' ? value : (overrides.effect_crop_right !== undefined ? overrides.effect_crop_right : (block.effects?.find((e: any) => e.name === 'crop')?.params?.right ?? 0));
        
        if (cropT > 0 || cropB > 0 || cropL > 0 || cropR > 0) {
          containerRef.current.style.clipPath = `inset(${cropT}% ${cropR}% ${cropB}% ${cropL}%)`;
        } else {
          containerRef.current.style.clipPath = 'none';
        }
      }
    };
    const handleClear = (e: Event) => {
      const { clipId } = (e as CustomEvent).detail || {};
      if (clipId === block.id || !clipId) {
        if (containerRef.current) {
          containerRef.current.style.left = '';
          containerRef.current.style.top = '';
          containerRef.current.style.width = '';
          containerRef.current.style.height = '';
          containerRef.current.style.clipPath = '';
          containerRef.current.style.opacity = '';
          containerRef.current.style.filter = '';
          containerRef.current.style.transform = '';
        }
      }
    };
    window.addEventListener('gfx-override', handleOverride);
    window.addEventListener('gfx-override-clear', handleClear);
    return () => {
      window.removeEventListener('gfx-override', handleOverride);
      window.removeEventListener('gfx-override-clear', handleClear);
    };
  }, [block.id]);

  return (
    <div 
      ref={containerRef}
      style={containerStyle} 
      className={`z-40 ${showBox ? 'border-2 border-dashed border-yellow-500 bg-yellow-500/10' : ''}`}
    >
      {/* Magnetic Snapping Guides */}
      <div 
        id="kinetic-guide-x" 
        className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] z-[100] pointer-events-none opacity-0 transition-opacity duration-150"
      />
      <div 
        id="kinetic-guide-y" 
        className="absolute top-1/2 left-0 right-0 h-[1px] bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] z-[100] pointer-events-none opacity-0 transition-opacity duration-150"
      />

      {words.map((baseWord) => {
        // Safe Deep Merge with overrides
        const override = block.wordOverrides?.[baseWord.id] || {};
        const word = { 
          ...baseWord, 
          ...override,
          position: {
            x: override.position?.x ?? baseWord.position.x,
            y: override.position?.y ?? baseWord.position.y
          }
        };
        
        // Live Time Sync: Use the current clip state from the map
        const clip = clipMap[word.sourceClipId];
        const meta = wordMetadata[word.id];
        
        // Fallback to word's own timing if clip not found (e.g. single layout preview)
        let isActive = false;
        let isPast = false;
        let liveSceneEndTime = word.sceneEndTime;

        if (clip && meta) {
          // Calculate word's position within the clip to find its live timing
          const wordDuration = clip.duration / Math.max(1, meta.total);
          
          const liveStartTime = clip.startTime + (meta.index * wordDuration);
          const liveEndTime = liveStartTime + wordDuration;
          
          isActive = currentTime >= liveStartTime && currentTime < liveEndTime;
          isPast = currentTime > liveEndTime;
          
          // Calculate live scene end time based on the offset from the word's original end time
          const sceneOffset = word.sceneEndTime - word.endTime;
          liveSceneEndTime = liveEndTime + sceneOffset;
        } else {
          isActive = currentTime >= word.startTime && currentTime < word.endTime;
          isPast = currentTime > word.endTime;
        }

        const isKeepVisible = (() => {
          const resolve = (val: any, seed: string) => {
            if (val === 'random') {
              // Simple deterministic random based on seed
              let hash = 0;
              for (let i = 0; i < seed.length; i++) {
                hash = ((hash << 5) - hash) + seed.charCodeAt(i);
                hash |= 0;
              }
              return (Math.abs(hash) % 100) < 50;
            }
            return !!val;
          };

          if (word.layoutStyle === 'dynamic-collage') return resolve(settings.keepPastInCollage, block.id + 'collage');
          if (word.layoutStyle === 'karaoke') return resolve(settings.keepPastInKaraoke, block.id + 'karaoke');
          if (word.layoutStyle === 'pop-in-place') return resolve(settings.keepPastInPop, block.id + 'pop');
          if (word.layoutStyle === 'tetris') return resolve(settings.keepPastInTetris, block.id + 'tetris');
          return false;
        })();

        const isSceneDone = currentTime > liveSceneEndTime;
        if (isSceneDone) return null;

        const shouldShow = isActive || (isPast && isKeepVisible);

        if (!shouldShow) return null;

        const animClass = getAnimationClass(word.animation || 'pop');
        
        // Dynamic opacity and transition for past words
        const pastOpacity = settings.pastWordsOpacity !== undefined ? settings.pastWordsOpacity / 100 : 0.4;
        const fadeDuration = settings.pastWordsFadeDuration || 0.5;
        
        const opacityValue = isPast 
          ? (word.layoutStyle === 'pop-in-place' || !isKeepVisible ? 0 : pastOpacity) 
          : 1;

        const wordDuration = word.endTime - word.startTime;
        const animDuration = Math.min(0.5, wordDuration);

        return (
          <div key={word.id} className="chunk-wrapper" data-chunk-id={word.chunkId}>
            <KineticDraggableWord
              key={word.id}
              word={word}
              clip={clip}
              currentTime={currentTime}
              blockId={block.id}
              store={store}
              isActive={isActive}
              isPast={isPast}
              isKeepVisible={isKeepVisible}
              opacityValue={opacityValue}
              fadeDuration={fadeDuration}
              animClass={animClass}
              animDuration={animDuration}
              settings={settings}
              isSelected={store.selectedKineticWordId === word.id}
              onSelect={store.setSelectedKineticWordId}
              showTransformControls={showTransformControls}
            />
          </div>
        );
      })}
    </div>
  );
};
