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
  private static tempCanvas: HTMLCanvasElement | null = null;

  private static getTempCanvas(width: number, height: number): HTMLCanvasElement {
    if (!this.tempCanvas) {
      this.tempCanvas = document.createElement('canvas');
    }
    if (this.tempCanvas.width !== width) this.tempCanvas.width = width;
    if (this.tempCanvas.height !== height) this.tempCanvas.height = height;
    return this.tempCanvas;
  }

  static render(
    ctx: CanvasRenderingContext2D, 
    project: Project, 
    currentTime: number, 
    liveOverrides: Record<string, any> = {}, 
    mediaElements: Record<string, HTMLVideoElement | HTMLImageElement> = {}
  ) {
    // 1. Clear canvas and fill background
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (project.backgroundColor) {
      ctx.fillStyle = project.backgroundColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    // 2. Iterate tracks from bottom to top
    // In this project, tracks are ordered from bottom to top in the tracks array (higher index = higher layer)
    project.tracks.forEach(track => {
      if (!track.isVisible) return;

      // Find active clips on this track
      const activeClips = track.clips.filter(clip => 
        currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration
      );

      activeClips.forEach(clip => {
        if (clip.type === MediaType.EFFECT) {
          this.renderAdjustmentLayer(ctx, clip, liveOverrides);
        } else if (track.type === 'video' || track.type === 'image') {
          this.renderMediaClip(ctx, clip, track, currentTime, liveOverrides, mediaElements);
        } else if (clip.content && track.type !== 'subtitle') {
          this.renderTextClip(ctx, clip, project.resolution, liveOverrides);
        }
      });
    });
  }

  private static renderMediaClip(
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    track: Track,
    currentTime: number,
    liveOverrides: Record<string, any>,
    mediaElements: Record<string, HTMLVideoElement | HTMLImageElement> = {}
  ) {
    const override = liveOverrides[clip.id] || {};
    const posX = override.posX !== undefined ? override.posX / 100 : (clip.position?.x ?? 0.5);
    const posY = override.posY !== undefined ? override.posY / 100 : (clip.position?.y ?? 0.5);
    const scale = override.scale !== undefined ? override.scale / 100 : (clip.scale || 1);
    const rotation = override.rotation !== undefined ? override.rotation : (clip.rotation || 0);
    const opacity = override.opacity !== undefined ? override.opacity / 100 : (clip.opacity ?? 1);

    const element = mediaElements[clip.id];
    if (element) {
      const isReady = element instanceof HTMLImageElement ? element.complete : element.readyState >= 2;
      if (!isReady) return;
      
      const assetWidth = (element as any).naturalWidth || (element as any).videoWidth || 1920;
      const assetHeight = (element as any).naturalHeight || (element as any).videoHeight || 1080;
      const assetAspect = assetWidth / assetHeight;
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
            if (progress < transitionProgress) {
              ctx.globalAlpha *= (progress / transitionProgress);
            } else if (progress > (1 - transitionProgress)) {
              ctx.globalAlpha *= ((1 - progress) / transitionProgress);
            }
          } else if (effect.name === 'wipe-right') {
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

      const getEffectParam = (effectName: string, paramName: string, defaultValue: number) => {
        const overrideKey = `effect_${effectName}_${paramName}`;
        if (override[overrideKey] !== undefined) return override[overrideKey];
        const effect = clip.effects?.find(e => e.name === effectName);
        if (effect && effect.params && effect.params[paramName] !== undefined) return effect.params[paramName];
        return defaultValue;
      };

      // NEW EFFECTS
      let flickerBrightness = 1;
      const flickerEffect = clip.effects?.find(e => e.name === 'flicker') || override.effect_flicker_speed !== undefined || override.effect_flicker_intensity !== undefined;
      if (flickerEffect) {
        const speed = getEffectParam('flicker', 'speed', 50) / 100;
        const intensity = getEffectParam('flicker', 'intensity', 50) / 100;
        const flickerVal = Math.sin(currentTime * (10 + speed * 50));
        flickerBrightness = flickerVal > 0 ? 1 + (intensity * 0.5) : 1 - (intensity * 0.5);
      }

      let glitchOffsetX = 0;
      let glitchOffsetY = 0;
      const glitchEffect = clip.effects?.find(e => e.name === 'glitch') || override.effect_glitch_intensity !== undefined;
      if (glitchEffect) {
        const intensity = getEffectParam('glitch', 'intensity', 50) / 100;
        const isGlitching = Math.sin(currentTime * 30) > (1 - intensity * 0.8);
        if (isGlitching) {
          glitchOffsetX = (Math.random() - 0.5) * intensity * drawW * 0.1;
          glitchOffsetY = (Math.random() - 0.5) * intensity * drawH * 0.05;
          filterString += `hue-rotate(${Math.random() * 90 - 45}deg) saturate(${100 + intensity * 100}%) `;
        }
      }

      const vhsEffect = clip.effects?.find(e => e.name === 'vhs') || override.effect_vhs_colorBleed !== undefined || override.effect_vhs_noise !== undefined;
      let vhsNoise = 0;
      if (vhsEffect) {
         const colorBleed = getEffectParam('vhs', 'colorBleed', 50) / 100;
         vhsNoise = getEffectParam('vhs', 'noise', 30) / 100;
         filterString += `sepia(${30}%) hue-rotate(${colorBleed * 20}deg) contrast(120%) saturate(80%) `;
      }

      let shakeX = 0;
      let shakeY = 0;
      const shakeEffect = clip.effects?.find(e => e.name === 'shake') || override.effect_shake_intensity !== undefined || override.effect_shake_speed !== undefined;
      if (shakeEffect) {
        const intensity = getEffectParam('shake', 'intensity', 50) / 100;
        const speed = getEffectParam('shake', 'speed', 50) / 100;
        shakeX = Math.sin(currentTime * (10 + speed * 40)) * intensity * drawW * 0.05;
        shakeY = Math.cos(currentTime * (12 + speed * 35)) * intensity * drawH * 0.05;
      }

      let spinRot = 0;
      const spinEffect = clip.effects?.find(e => e.name === 'spin') || override.effect_spin_speed !== undefined || override.effect_spin_direction !== undefined;
      if (spinEffect) {
        const speed = getEffectParam('spin', 'speed', 50) / 100;
        const dir = getEffectParam('spin', 'direction', 1);
        spinRot = (currentTime * speed * 360) * dir;
      }

      const cropEffect = clip.effects?.find(e => e.name === 'crop') || override.effect_crop_top !== undefined || override.effect_crop_bottom !== undefined || override.effect_crop_left !== undefined || override.effect_crop_right !== undefined;
      let cropT = 0, cropB = 0, cropL = 0, cropR = 0;
      if (cropEffect) {
        cropT = getEffectParam('crop', 'top', 0) / 100;
        cropB = getEffectParam('crop', 'bottom', 0) / 100;
        cropL = getEffectParam('crop', 'left', 0) / 100;
        cropR = getEffectParam('crop', 'right', 0) / 100;
      }

      const finalBrightness = brightness * flickerBrightness;
      if (finalBrightness !== 1) filterString += `brightness(${finalBrightness * 100}%) `;
      if (contrast !== 1) filterString += `contrast(${contrast * 100}%) `;
      if (saturation !== 1) filterString += `saturate(${saturation * 100}%) `;
      if (hue !== 0) filterString += `hue-rotate(${hue}deg) `;
      if (blur !== 0) filterString += `blur(${blur}px) `;
      if (sepia !== 0) filterString += `sepia(${sepia * 100}%) `;
      if (grayscale !== 0) filterString += `grayscale(${grayscale * 100}%) `;
      if (invert !== 0) filterString += `invert(${invert * 100}%) `;

      if (clip.effects && clip.effects.length > 0) {
        filterString += clip.effects.map(effect => {
          switch (effect.name) {
            case 'blur': return `blur(${getEffectParam('blur', 'amount', 0)}px)`;
            case 'grayscale': return `grayscale(${getEffectParam('grayscale', 'amount', 0)}%)`;
            case 'sepia': return `sepia(${getEffectParam('sepia', 'amount', 0)}%)`;
            case 'invert': return `invert(${getEffectParam('invert', 'amount', 0)}%)`;
            default: return '';
          }
        }).filter(Boolean).join(' ');
      }
      
      if (filterString.trim()) ctx.filter = filterString.trim();

      ctx.translate(posX * ctx.canvas.width + glitchOffsetX + shakeX, posY * ctx.canvas.height + glitchOffsetY + shakeY);
      ctx.rotate((rotation + spinRot) * Math.PI / 180);
      
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

      if (cropT > 0 || cropB > 0 || cropL > 0 || cropR > 0) {
        ctx.beginPath();
        ctx.rect(-drawW / 2 + drawW * cropL, -drawH / 2 + drawH * cropT, drawW * (1 - cropL - cropR), drawH * (1 - cropT - cropB));
        ctx.clip();
      }

      ctx.drawImage(element, -drawW / 2, -drawH / 2, drawW, drawH);

      if (vhsNoise > 0) {
        ctx.fillStyle = `rgba(0,0,0,${vhsNoise * 0.3})`;
        for (let i = 0; i < drawH; i += 4) {
          ctx.fillRect(-drawW / 2, -drawH / 2 + i, drawW, 1);
        }
        ctx.fillStyle = `rgba(255,255,255,${vhsNoise * 0.2})`;
        for (let i = 0; i < 50; i++) {
           ctx.fillRect(-drawW / 2 + Math.random() * drawW, -drawH / 2 + Math.random() * drawH, 2, 2);
        }
      }

      ctx.restore();
    }
  }

  private static renderAdjustmentLayer(
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    liveOverrides: Record<string, any>
  ) {
    const override = liveOverrides[clip.id] || {};
    const getEffectParam = (effectName: string, paramName: string, defaultValue: number) => {
      const overrideKey = `effect_${effectName}_${paramName}`;
      if (override[overrideKey] !== undefined) return override[overrideKey];
      const effect = clip.effects?.find(e => e.name === effectName);
      if (effect && effect.params && effect.params[paramName] !== undefined) return effect.params[paramName];
      return defaultValue;
    };

    if (clip.effects && clip.effects.length > 0) {
      const filterString = clip.effects.map(effect => {
        switch (effect.name) {
          case 'blur': return `blur(${getEffectParam('blur', 'amount', 10)}px)`; // Default 10px
          case 'grayscale': return `grayscale(${getEffectParam('grayscale', 'amount', 100)}%)`; // Default 100%
          case 'sepia': return `sepia(${getEffectParam('sepia', 'amount', 100)}%)`; // Default 100%
          case 'invert': return `invert(${getEffectParam('invert', 'amount', 100)}%)`; // Default 100%
          case 'brightness': return `brightness(${getEffectParam('brightness', 'amount', 150)}%)`; // Default 150%
          case 'contrast': return `contrast(${getEffectParam('contrast', 'amount', 150)}%)`; // Default 150%
          case 'saturate': return `saturate(${getEffectParam('saturate', 'amount', 200)}%)`; // Default 200%
          case 'hue-rotate': return `hue-rotate(${getEffectParam('hue-rotate', 'amount', 90)}deg)`; // Default 90deg
          default: return '';
        }
      }).filter(Boolean).join(' ');

      if (filterString) {
        const tempCanvas = this.getTempCanvas(ctx.canvas.width, ctx.canvas.height);
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.drawImage(ctx.canvas, 0, 0);
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          ctx.save();
          ctx.filter = filterString;
          ctx.globalAlpha = override.opacity !== undefined ? override.opacity / 100 : (clip.opacity ?? 1);
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.restore();
        }
      }
    }
  }

  private static renderTextClip(
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    resolution: { width: number; height: number },
    liveOverrides: Record<string, any>
  ) {
    const override = liveOverrides[clip.id] || {};
    const posX = override.posX !== undefined ? override.posX / 100 : (clip.position?.x ?? 0.5);
    const posY = override.posY !== undefined ? override.posY / 100 : (clip.position?.y ?? 0.9);
    const scale = override.scale !== undefined ? override.scale / 100 : (clip.scale || 1);
    const rotation = override.rotation !== undefined ? override.rotation : (clip.rotation || 0);
    const opacity = override.opacity !== undefined ? override.opacity / 100 : (clip.opacity ?? 1);

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
