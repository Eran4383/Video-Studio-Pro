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
  private static effectCanvas: HTMLCanvasElement | null = null;
  private static effectCtx: CanvasRenderingContext2D | null = null;

  private static getEffectCanvas(width: number, height: number) {
    if (!this.effectCanvas) {
      this.effectCanvas = document.createElement('canvas');
    }
    if (this.effectCanvas.width !== width || this.effectCanvas.height !== height) {
      this.effectCanvas.width = width;
      this.effectCanvas.height = height;
      this.effectCtx = this.effectCanvas.getContext('2d');
    }
    return { canvas: this.effectCanvas, ctx: this.effectCtx! };
  }

  static render(
    ctx: CanvasRenderingContext2D, 
    project: Project, 
    currentTime: number, 
    liveOverrides: Record<string, any> = {}, 
    activeMedia?: { element: HTMLVideoElement | HTMLImageElement, clipId: string, asset: any }
  ) {
    const { width, height } = ctx.canvas;
    const { canvas: eCanvas, ctx: eCtx } = this.getEffectCanvas(width, height);
    
    // Clear main canvas
    ctx.clearRect(0, 0, width, height);
    if (project.backgroundColor) {
      ctx.fillStyle = project.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Clear effect canvas
    eCtx.clearRect(0, 0, width, height);

    // 1. Render tracks from bottom to top
    const tracks = [...project.tracks].reverse();

    tracks.forEach(track => {
      if (!track.isVisible) return;

      const activeClips = track.clips.filter(clip => 
        currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration
      );

      // If track doesn't receive effects, flush the current effect buffer to main canvas
      if (track.receiveAdjustmentEffects === false) {
        ctx.drawImage(eCanvas, 0, 0);
        eCtx.clearRect(0, 0, width, height);
      }

      // Target context for this track
      const targetCtx = track.receiveAdjustmentEffects === false ? ctx : eCtx;

      activeClips.forEach(clip => {
        const override = liveOverrides[clip.id] || {};
        
        if (clip.type === MediaType.VIDEO || clip.type === MediaType.IMAGE) {
          this.renderMediaClip(targetCtx, clip, track, currentTime, override, activeMedia);
        } else if (clip.type === MediaType.EFFECT) {
          // Adjustment layers ALWAYS apply to the effect buffer
          this.applyAdjustmentLayer(eCtx, clip, currentTime, override);
        } else if (clip.type === MediaType.TEXT && clip.content && track.type !== 'subtitle') {
          this.renderTextClip(targetCtx, clip, track, project.resolution, override);
        }
      });
    });

    // Final flush
    ctx.drawImage(eCanvas, 0, 0);
  }

  private static renderMediaClip(
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    track: Track,
    currentTime: number,
    override: any,
    activeMedia?: { element: HTMLVideoElement | HTMLImageElement, clipId: string, asset: any }
  ) {
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
          const transitionDuration = params.duration || 1; 
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

      // Filters & Effects
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

      let flickerBrightness = 1;
      const flickerEffect = clip.effects?.find(e => e.name === 'flicker') || override.effect_flicker_speed !== undefined;
      if (flickerEffect) {
        const speed = getEffectParam('flicker', 'speed', 50) / 100;
        const intensity = getEffectParam('flicker', 'intensity', 50) / 100;
        const flickerVal = Math.sin(currentTime * (10 + speed * 50));
        flickerBrightness = flickerVal > 0 ? 1 + (intensity * 0.5) : 1 - (intensity * 0.5);
      }

      let glitchOffsetX = 0, glitchOffsetY = 0;
      const glitchEffect = clip.effects?.find(e => e.name === 'glitch');
      if (glitchEffect) {
        const intensity = getEffectParam('glitch', 'intensity', 50) / 100;
        const isGlitching = Math.sin(currentTime * 30) > (1 - intensity * 0.8);
        if (isGlitching) {
          glitchOffsetX = (Math.random() - 0.5) * intensity * drawW * 0.1;
          glitchOffsetY = (Math.random() - 0.5) * intensity * drawH * 0.05;
          filterString += `hue-rotate(${Math.random() * 90 - 45}deg) saturate(${100 + intensity * 100}%) `;
        }
      }

      let shakeX = 0, shakeY = 0;
      const shakeEffect = clip.effects?.find(e => e.name === 'shake');
      if (shakeEffect) {
        const intensity = getEffectParam('shake', 'intensity', 50) / 100;
        const speed = getEffectParam('shake', 'speed', 50) / 100;
        shakeX = Math.sin(currentTime * (10 + speed * 40)) * intensity * drawW * 0.05;
        shakeY = Math.cos(currentTime * (12 + speed * 35)) * intensity * drawH * 0.05;
      }

      let spinRot = 0;
      const spinEffect = clip.effects?.find(e => e.name === 'spin');
      if (spinEffect) {
        const speed = getEffectParam('spin', 'speed', 50) / 100;
        const dir = getEffectParam('spin', 'direction', 1);
        spinRot = (currentTime * speed * 360) * dir;
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

      if (clip.effects) {
        clip.effects.forEach(effect => {
          switch (effect.name) {
            case 'blur': filterString += `blur(${getEffectParam('blur', 'amount', 0)}px) `; break;
            case 'grayscale': filterString += `grayscale(${getEffectParam('grayscale', 'amount', 0)}%) `; break;
            case 'sepia': filterString += `sepia(${getEffectParam('sepia', 'amount', 0)}%) `; break;
            case 'invert': filterString += `invert(${getEffectParam('invert', 'amount', 0)}%) `; break;
          }
        });
      }
      
      if (filterString.trim()) ctx.filter = filterString.trim();

      ctx.translate(posX * ctx.canvas.width + glitchOffsetX + shakeX, posY * ctx.canvas.height + glitchOffsetY + shakeY);
      ctx.rotate((rotation + spinRot) * Math.PI / 180);
      
      let motionScale = scale;
      if (clip.effects) {
        const progress = (currentTime - clip.startTime) / clip.duration;
        clip.effects.forEach(effect => {
          if (effect.name === 'zoom-in') motionScale *= (1 + (effect.params?.intensity || 0.2) * progress);
          else if (effect.name === 'zoom-out') motionScale *= (1 + (effect.params?.intensity || 0.2) * (1 - progress));
        });
      }
      ctx.scale(motionScale, motionScale);
      ctx.drawImage(element, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }
  }

  private static tempCanvas: HTMLCanvasElement | null = null;
  private static tempCtx: CanvasRenderingContext2D | null = null;

  private static getTempCanvas(width: number, height: number) {
    if (!this.tempCanvas) {
      this.tempCanvas = document.createElement('canvas');
    }
    if (this.tempCanvas.width !== width || this.tempCanvas.height !== height) {
      this.tempCanvas.width = width;
      this.tempCanvas.height = height;
      this.tempCtx = this.tempCanvas.getContext('2d');
    }
    return { canvas: this.tempCanvas, ctx: this.tempCtx! };
  }

  private static applyAdjustmentLayer(
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    currentTime: number,
    override: any
  ) {
    if (!clip.effects || clip.effects.length === 0) return;

    const getEffectParam = (effectName: string, paramName: string, defaultValue: number) => {
      const overrideKey = `effect_${effectName}_${paramName}`;
      if (override[overrideKey] !== undefined) return override[overrideKey];
      const effect = clip.effects?.find(e => e.name === effectName);
      if (effect && effect.params && effect.params[paramName] !== undefined) return effect.params[paramName];
      return defaultValue;
    };

    const filterString = clip.effects.map(effect => {
      switch (effect.name) {
        case 'blur': return `blur(${getEffectParam('blur', 'amount', 0)}px)`;
        case 'grayscale': return `grayscale(${getEffectParam('grayscale', 'amount', 0)}%)`;
        case 'sepia': return `sepia(${getEffectParam('sepia', 'amount', 0)}%)`;
        case 'invert': return `invert(${getEffectParam('invert', 'amount', 0)}%)`;
        case 'brightness': return `brightness(${getEffectParam('brightness', 'amount', 100)}%)`;
        case 'contrast': return `contrast(${getEffectParam('contrast', 'amount', 100)}%)`;
        case 'hue-rotate': return `hue-rotate(${getEffectParam('hue-rotate', 'amount', 0)}deg)`;
        case 'saturate': return `saturate(${getEffectParam('saturate', 'amount', 100)}%)`;
        case 'color-grade': {
          const b = getEffectParam('color-grade', 'brightness', 100);
          const c = getEffectParam('color-grade', 'contrast', 100);
          const s = getEffectParam('color-grade', 'saturation', 100);
          const h = getEffectParam('color-grade', 'hue', 0);
          return `brightness(${b}%) contrast(${c}%) saturate(${s}%) hue-rotate(${h}deg)`;
        }
        case 'cinematic-look': {
          const intensity = getEffectParam('cinematic-look', 'intensity', 70);
          return `sepia(${intensity * 0.3}%) hue-rotate(180deg) contrast(${100 + intensity * 0.2}%) saturate(${100 + intensity * 0.1}%)`;
        }
        default: return '';
      }
    }).filter(Boolean).join(' ');

    if (filterString || clip.effects.some(e => e.name === 'vignette')) {
      const { canvas: tCanvas, ctx: tCtx } = this.getTempCanvas(ctx.canvas.width, ctx.canvas.height);
      tCtx.clearRect(0, 0, tCanvas.width, tCanvas.height);
      tCtx.drawImage(ctx.canvas, 0, 0);
      
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save();
      if (filterString) ctx.filter = filterString;
      ctx.globalAlpha = clip.opacity ?? 1;
      ctx.drawImage(tCanvas, 0, 0);

      // Apply Vignette separately as it's a gradient, not a CSS filter
      const vignette = clip.effects.find(e => e.name === 'vignette');
      if (vignette) {
        const amount = getEffectParam('vignette', 'amount', 50) / 100;
        const size = getEffectParam('vignette', 'size', 70) / 100;
        const grad = ctx.createRadialGradient(
          ctx.canvas.width / 2, ctx.canvas.height / 2, 0,
          ctx.canvas.width / 2, ctx.canvas.height / 2, ctx.canvas.width * size
        );
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, `rgba(0,0,0,${amount})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }

      ctx.restore();
    }
  }

  private static renderTextClip(
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    track: Track,
    resolution: { width: number; height: number },
    override: any
  ) {
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
