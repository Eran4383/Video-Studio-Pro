import { Project, Clip, Track, MediaType } from '../types';

export interface GFXLayer {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  opacity: number;
}

export class GFX_Engine {
  static render(
    ctx: CanvasRenderingContext2D, 
    project: Project, 
    currentTime: number, 
    liveOverrides: Record<string, any> = {}, 
    activeMedia?: { element: HTMLVideoElement | HTMLImageElement, clipId: string, asset: any }
  ) {
    // 1. Collect all active clips and sort by track order
    const activeClips: { clip: Clip, track: Track }[] = [];
    project.tracks.forEach(track => {
      if (!track.isVisible) return;
      track.clips.forEach(clip => {
        if (currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration) {
          activeClips.push({ clip, track });
        }
      });
    });

    // 2. Render Media Clips (Video, Image)
    activeClips
      .filter(({ clip, track }) => track.type === 'video' || track.type === 'image')
      .forEach(({ clip }) => {
        const override = liveOverrides[clip.id] || {};
        const posX = override.posX !== undefined ? override.posX / 100 : (clip.position?.x ?? 0.5);
        const posY = override.posY !== undefined ? override.posY / 100 : (clip.position?.y ?? 0.5);
        const scale = override.scale !== undefined ? override.scale / 100 : (clip.scale || 1);
        const rotation = override.rotation !== undefined ? override.rotation : (clip.rotation || 0);
        const opacity = override.opacity !== undefined ? override.opacity / 100 : (clip.opacity ?? 1);

        if (activeMedia && clip.id === activeMedia.clipId) {
          const asset = activeMedia.asset;
          const element = activeMedia.element;
          const isReady = element instanceof HTMLImageElement ? element.complete : element.readyState >= 2;
          if (!isReady) return;
          
          const assetAspect = (asset.width || 1920) / (asset.height || 1080);
          const canvasAspect = ctx.canvas.width / ctx.canvas.height;
          let drawW = ctx.canvas.width;
          let drawH = ctx.canvas.height;
          
          if (assetAspect > canvasAspect) {
            drawH = drawW / assetAspect;
          } else {
            drawW = drawH * assetAspect;
          }

          ctx.save();
          ctx.globalAlpha = opacity;

          // Apply Transition Effects (In/Out)
          if (clip.effects) {
            const progress = (currentTime - clip.startTime) / clip.duration;
            const duration = clip.duration;
            clip.effects.forEach(effect => {
              const params = effect.params || {};
              const transitionDuration = params.duration || 1; // Default 1s
              const transitionProgress = transitionDuration / duration;

              if (effect.name === 'crossfade') {
                // Fade in at start, fade out at end
                if (progress < transitionProgress) {
                  ctx.globalAlpha *= (progress / transitionProgress);
                } else if (progress > (1 - transitionProgress)) {
                  ctx.globalAlpha *= ((1 - progress) / transitionProgress);
                }
              } else if (effect.name === 'wipe-right') {
                // Wipe right at start
                if (progress < transitionProgress) {
                  const wipeProgress = progress / transitionProgress;
                  ctx.beginPath();
                  ctx.rect(-drawW / 2, -drawH / 2, drawW * wipeProgress, drawH);
                  ctx.clip();
                }
              }
            });
          }

          // Apply Built-in Color Grading & Adjustments
          let filterString = '';
          const brightness = override.brightness !== undefined ? override.brightness / 100 : (clip.brightness ?? 1);
          const contrast = override.contrast !== undefined ? override.contrast / 100 : (clip.contrast ?? 1);
          const saturation = override.saturation !== undefined ? override.saturation / 100 : (clip.saturation ?? 1);
          const hue = override.hue !== undefined ? override.hue : (clip.hue ?? 0);
          const blur = override.blur !== undefined ? override.blur : (clip.blur ?? 0);
          const sepia = override.sepia !== undefined ? override.sepia / 100 : (clip.sepia ?? 0);
          const grayscale = override.grayscale !== undefined ? override.grayscale / 100 : (clip.grayscale ?? 0);
          const invert = override.invert !== undefined ? override.invert / 100 : (clip.invert ?? 0);

          if (brightness !== 1) filterString += `brightness(${brightness * 100}%) `;
          if (contrast !== 1) filterString += `contrast(${contrast * 100}%) `;
          if (saturation !== 1) filterString += `saturate(${saturation * 100}%) `;
          if (hue !== 0) filterString += `hue-rotate(${hue}deg) `;
          if (blur !== 0) filterString += `blur(${blur}px) `;
          if (sepia !== 0) filterString += `sepia(${sepia * 100}%) `;
          if (grayscale !== 0) filterString += `grayscale(${grayscale * 100}%) `;
          if (invert !== 0) filterString += `invert(${invert * 100}%) `;

          // Apply Visual Effects (Filters)
          if (clip.effects && clip.effects.length > 0) {
            filterString += clip.effects.map(effect => {
              const params = effect.params || {};
              switch (effect.name) {
                case 'blur': return `blur(${params.amount || 0}px)`;
                case 'grayscale': return `grayscale(${params.amount || 0}%)`;
                case 'sepia': return `sepia(${params.amount || 0}%)`;
                case 'invert': return `invert(${params.amount || 0}%)`;
                default: return '';
              }
            }).filter(Boolean).join(' ');
          }
          
          if (filterString.trim()) ctx.filter = filterString.trim();

          ctx.translate(posX * ctx.canvas.width, posY * ctx.canvas.height);
          ctx.rotate(rotation * Math.PI / 180);
          
          // Apply Motion Effects
          let motionScale = scale;
          if (clip.effects) {
            const progress = (currentTime - clip.startTime) / clip.duration;
            clip.effects.forEach(effect => {
              const params = effect.params || {};
              if (effect.name === 'zoom-in') {
                motionScale *= (1 + (params.intensity || 0.2) * progress);
              } else if (effect.name === 'zoom-out') {
                motionScale *= (1 + (params.intensity || 0.2) * (1 - progress));
              }
            });
          }
          ctx.scale(motionScale, motionScale);

          ctx.drawImage(element, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();
        }
      });

    // 3. Apply Adjustment Layers (Effect Clips)
    activeClips
      .filter(({ clip }) => clip.type === MediaType.EFFECT)
      .forEach(({ clip }) => {
        if (clip.effects && clip.effects.length > 0) {
          const filterString = clip.effects.map(effect => {
            const params = effect.params || {};
            switch (effect.name) {
              case 'blur': return `blur(${params.amount || 0}px)`;
              case 'grayscale': return `grayscale(${params.amount || 0}%)`;
              case 'sepia': return `sepia(${params.amount || 0}%)`;
              case 'invert': return `invert(${params.amount || 0}%)`;
              default: return '';
            }
          }).filter(Boolean).join(' ');

          if (filterString) {
            // Apply filter to the entire canvas rendered so far
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = ctx.canvas.width;
            tempCanvas.height = ctx.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
              tempCtx.drawImage(ctx.canvas, 0, 0);
              ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
              ctx.save();
              ctx.filter = filterString;
              ctx.globalAlpha = clip.opacity ?? 1;
              ctx.drawImage(tempCanvas, 0, 0);
              ctx.restore();
            }
          }
        }
      });

    // 4. Render Text Clips
    activeClips
      .filter(({ clip, track }) => clip.content && track.type !== 'subtitle')
      .forEach(({ clip }) => {
        const override = liveOverrides[clip.id] || {};
        const posX = override.posX !== undefined ? override.posX / 100 : (clip.position?.x ?? 0.5);
        const posY = override.posY !== undefined ? override.posY / 100 : (clip.position?.y ?? 0.9);
        const scale = override.scale !== undefined ? override.scale / 100 : (clip.scale || 1);
        const rotation = override.rotation !== undefined ? override.rotation : (clip.rotation || 0);
        const opacity = override.opacity !== undefined ? override.opacity / 100 : (clip.opacity ?? 1);

        const resolution = project.resolution;
        ctx.save();
        ctx.translate(posX * resolution.width, posY * resolution.height);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.scale(scale, scale);
        ctx.globalAlpha = opacity;

        if (clip.shadow) {
          ctx.shadowColor = "rgba(0,0,0,0.8)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
        }

        const fontSize = resolution.height * 0.05;
        const fontWeight = clip.fontWeight || 'bold';
        const fontFamily = clip.font || 'Arial, sans-serif';
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = clip.color || "white";
        ctx.textAlign = (clip.textAlign as CanvasTextAlign) || "center";
        ctx.textBaseline = "middle";
        
        ctx.strokeStyle = "black";
        ctx.lineWidth = fontSize * 0.05;
        ctx.lineJoin = "round";
        ctx.strokeText(clip.content!, 0, 0);
        ctx.fillText(clip.content!, 0, 0);
        ctx.restore();
      });
  }

  static getLayerForClip(clip: Clip, resolution: { width: number; height: number }): GFXLayer | null {
    // Default properties if effect doesn't exist
    const props = clip.effects.find(e => e.name === 'GFX_PROPS')?.params || { x: 0.5, y: 0.5, scale: 1, rotation: 0 };
    
    // Convert normalized coordinates (0-1) to screen pixels
    return {
      id: clip.id,
      x: props.x * resolution.width,
      y: props.y * resolution.height,
      width: 200, // Standard base size for Gizmo
      height: 100,
      rotation: props.rotation || 0,
      scale: props.scale || 1,
      opacity: 1
    };
  }

  static normalizeProperties(layer: GFXLayer, resolution: { width: number; height: number }) {
    // Convert screen pixels back to normalized coordinates for storage
    return {
      x: layer.x / resolution.width,
      y: layer.y / resolution.height,
      scale: layer.scale,
      rotation: layer.rotation
    };
  }
}
