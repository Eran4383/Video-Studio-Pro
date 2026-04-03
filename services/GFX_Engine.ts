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
  private static tempCtx: CanvasRenderingContext2D | null = null;
  private static noiseCanvas: HTMLCanvasElement | null = null;

  private static getTempCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (!this.tempCanvas) {
      this.tempCanvas = document.createElement('canvas');
      this.tempCtx = this.tempCanvas.getContext('2d', { alpha: true });
    }
    if (this.tempCanvas.width !== width) this.tempCanvas.width = width;
    if (this.tempCanvas.height !== height) this.tempCanvas.height = height;
    return { canvas: this.tempCanvas, ctx: this.tempCtx! };
  }

  private static getNoiseCanvas(width: number, height: number): HTMLCanvasElement {
    if (!this.noiseCanvas) {
      this.noiseCanvas = document.createElement('canvas');
      this.noiseCanvas.width = 256;
      this.noiseCanvas.height = 256;
      const ctx = this.noiseCanvas.getContext('2d')!;
      const idata = ctx.createImageData(256, 256);
      const buffer32 = new Uint32Array(idata.data.buffer);
      for (let i = 0; i < buffer32.length; i++) {
        if (Math.random() < 0.5) buffer32[i] = 0xffffffff;
      }
      ctx.putImageData(idata, 0, 0);
    }
    return this.noiseCanvas;
  }

  static render(
    ctx: CanvasRenderingContext2D, 
    project: Project, 
    currentTime: number, 
    liveOverrides: Record<string, any> = {}, 
    mediaElements: Record<string, HTMLVideoElement | HTMLImageElement> = {}
  ) {
    const { width, height } = ctx.canvas;
    const isPlayback = project.previewQuality && project.previewQuality < 1;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = project.backgroundColor || '#000000';
    ctx.fillRect(0, 0, width, height);

    project.tracks.forEach(track => {
      if (!track.isVisible) return;

      const activeClips = track.clips.filter(clip => 
        currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration
      );

      activeClips.forEach(clip => {
        if (clip.type === MediaType.EFFECT) {
          this.renderAdjustmentLayer(ctx, clip, currentTime, liveOverrides, project.backgroundColor, isPlayback);
        } else if (track.type === 'video' || track.type === 'image') {
          this.renderMediaClip(ctx, clip, track, currentTime, liveOverrides, mediaElements, isPlayback);
        } else if (clip.content && track.type !== 'subtitle') {
          this.renderTextClip(ctx, clip, project.resolution, liveOverrides);
        }
      });
    });
  }

  private static getEffectParam(clip: Clip, effectName: string, paramName: string, defaultValue: any, liveOverrides: Record<string, any>) {
    const override = liveOverrides[clip.id] || {};
    const overrideKey = `effect_${effectName}_${paramName}`;
    if (override[overrideKey] !== undefined) return override[overrideKey];
    
    const effect = clip.effects?.find(e => e.name === effectName || e.id === effectName);
    if (effect && effect.params && effect.params[paramName] !== undefined) return effect.params[paramName];
    
    return defaultValue;
  }

  private static applyCommonFilters(clip: Clip, liveOverrides: Record<string, any>, isPlayback: boolean = false): string {
    const override = liveOverrides[clip.id] || {};
    
    const brightness = override.brightness !== undefined ? override.brightness / 100 : (clip.brightness ?? 1);
    const contrast = override.contrast !== undefined ? override.contrast / 100 : (clip.contrast ?? 1);
    const saturation = override.saturation !== undefined ? override.saturation / 100 : (clip.saturation ?? 1);
    const hue = override.hue !== undefined ? override.hue : (clip.hue ?? 0);
    const blur = override.blur !== undefined ? override.blur : (clip.blur ?? 0);
    const sepia = override.sepia !== undefined ? override.sepia / 100 : (clip.sepia ?? 0);
    const grayscale = override.grayscale !== undefined ? override.grayscale / 100 : (clip.grayscale ?? 0);
    const invert = override.invert !== undefined ? override.invert / 100 : (clip.invert ?? 0);

    let filters = [];
    if (brightness !== 1) filters.push(`brightness(${brightness * 100}%)`);
    if (contrast !== 1) filters.push(`contrast(${contrast * 100}%)`);
    if (saturation !== 1) filters.push(`saturate(${saturation * 100}%)`);
    if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`);
    if (blur !== 0) filters.push(`blur(${blur}px)`);
    if (sepia !== 0) filters.push(`sepia(${sepia * 100}%)`);
    if (grayscale !== 0) filters.push(`grayscale(${grayscale * 100}%)`);
    if (invert !== 0) filters.push(`invert(${invert * 100}%)`);

    clip.effects?.forEach(effect => {
      if (effect.isEnabled === false) return;
      const p = (name: string, def: any) => this.getEffectParam(clip, effect.id, name, def, liveOverrides);
      
      switch (effect.name) {
        case 'blur': filters.push(`blur(${p('amount', 5)}px)`); break;
        case 'grayscale': filters.push(`grayscale(${p('amount', 100)}%)`); break;
        case 'sepia': filters.push(`sepia(${p('amount', 100)}%)`); break;
        case 'invert': filters.push(`invert(${p('amount', 100)}%)`); break;
        case 'brightness': filters.push(`brightness(${p('amount', 100)}%)`); break;
        case 'contrast': filters.push(`contrast(${p('amount', 100)}%)`); break;
        case 'saturate': filters.push(`saturate(${p('amount', 100)}%)`); break;
        case 'hue-rotate': filters.push(`hue-rotate(${p('amount', 0)}deg)`); break;
        case 'vhs':
          if (isPlayback) {
            filters.push(`sepia(20%) saturate(80%)`);
          } else {
            const colorBleed = p('colorBleed', 50) / 100;
            filters.push(`sepia(30%) hue-rotate(${colorBleed * 20}deg) contrast(120%) saturate(80%)`);
          }
          break;
      }
    });

    return filters.join(' ');
  }

  private static renderSourceWithEffects(
    ctx: CanvasRenderingContext2D,
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    clip: Clip,
    currentTime: number,
    liveOverrides: Record<string, any>,
    isAdjustment: boolean = false,
    isPlayback: boolean = false
  ) {
    const override = liveOverrides[clip.id] || {};
    const posX = override.posX !== undefined ? override.posX / 100 : (clip.position?.x ?? 0.5);
    const posY = override.posY !== undefined ? override.posY / 100 : (clip.position?.y ?? 0.5);
    const scale = override.scale !== undefined ? override.scale / 100 : (clip.scale || 1);
    const rotation = override.rotation !== undefined ? override.rotation : (clip.rotation || 0);
    const opacity = override.opacity !== undefined ? override.opacity / 100 : (clip.opacity ?? 1);

    const srcW = (source as any).naturalWidth || (source as any).videoWidth || (source as any).width || 1920;
    const srcH = (source as any).naturalHeight || (source as any).videoHeight || (source as any).height || 1080;
    const srcAspect = srcW / srcH;
    const canvasAspect = ctx.canvas.width / ctx.canvas.height;
    
    let drawW = ctx.canvas.width;
    let drawH = ctx.canvas.height;
    if (!isAdjustment) {
      if (srcAspect > canvasAspect) {
        drawH = drawW / srcAspect;
      } else {
        drawW = drawH * srcAspect;
      }
    }

    ctx.save();
    
    // 1. Transitions & Pre-Transforms
    let transitionAlpha = 1;
    let transitionScale = 1;
    let transitionRotate = 0;
    let transitionOffsetX = 0;
    let transitionOffsetY = 0;

    if (clip.effects) {
      clip.effects.filter(e => e.type === 'transition').forEach(effect => {
        const params = effect.params || {};
        const duration = params.duration || 1;
        const position = params.position || 'start';
        
        let progress = 0;
        if (position === 'start') {
          progress = Math.min(1, (currentTime - clip.startTime) / duration);
        } else {
          progress = Math.min(1, (clip.startTime + clip.duration - currentTime) / duration);
        }

        if (progress >= 1) return;

        switch (effect.name) {
          case 'crossfade': transitionAlpha *= progress; break;
          case 'zoom-transition':
            const intensity = (params.intensity || 50) / 100;
            transitionScale *= (1 - intensity * (1 - progress));
            transitionAlpha *= progress;
            break;
          case 'wipe-right':
            ctx.beginPath();
            ctx.rect(-drawW / 2, -drawH / 2, drawW * progress, drawH);
            ctx.clip();
            break;
          case 'slide-up': transitionOffsetY += drawH * (1 - progress); break;
          case 'spin-transition':
            const rots = params.rotations || 1;
            transitionRotate += (1 - progress) * 360 * rots;
            transitionAlpha *= progress;
            break;
          case 'blur-transition':
            const blurAmt = (params.blurAmount || 20) * (1 - progress);
            ctx.filter = (ctx.filter === 'none' ? '' : ctx.filter + ' ') + `blur(${blurAmt}px)`;
            transitionAlpha *= progress;
            break;
          case 'whip-pan':
            const panDir = params.direction || 1;
            transitionOffsetX += drawW * (1 - progress) * panDir;
            ctx.filter = (ctx.filter === 'none' ? '' : ctx.filter + ' ') + `blur(${20 * (1 - progress)}px)`;
            break;
          case 'glitch-transition':
            const gInt = (params.intensity || 70) / 100;
            if (Math.random() < gInt * (1 - progress)) {
              transitionOffsetX += (Math.random() - 0.5) * drawW * 0.1;
              ctx.filter = (ctx.filter === 'none' ? '' : ctx.filter + ' ') + `hue-rotate(${Math.random() * 360}deg)`;
            }
            break;
        }
      });
    }

    ctx.globalAlpha = opacity * transitionAlpha;

    // 2. Filters
    const filterString = this.applyCommonFilters(clip, liveOverrides, isPlayback);
    if (filterString) {
      ctx.filter = (ctx.filter === 'none' ? '' : ctx.filter + ' ') + filterString;
    }

    // 3. Base Transform
    if (!isAdjustment) {
      ctx.translate(posX * ctx.canvas.width + transitionOffsetX, posY * ctx.canvas.height + transitionOffsetY);
      ctx.rotate((rotation + transitionRotate) * Math.PI / 180);
    } else {
      ctx.translate(ctx.canvas.width / 2 + transitionOffsetX, ctx.canvas.height / 2 + transitionOffsetY);
      ctx.rotate(transitionRotate * Math.PI / 180);
    }
    
    // 4. Motion & Complex Effects
    let motionScale = scale * transitionScale;
    let motionRotate = 0;
    let motionOffsetX = 0;
    let motionOffsetY = 0;
    let flickerBrightness = 1;
    let vhsNoise = 0;
    let vignetteAmount = 0;
    let vignetteSize = 0;
    let rgbSplitDist = 0;
    let filmGrainAmt = 0;

    clip.effects?.forEach(effect => {
      if (effect.isEnabled === false) return;
      const p = (name: string, def: any) => this.getEffectParam(clip, effect.id, name, def, liveOverrides);
      const progress = (currentTime - clip.startTime) / clip.duration;

      switch (effect.name) {
        case 'crop':
          const cTop = Math.max(0, Math.min(100, p('top', 0))) / 100;
          const cBottom = Math.max(0, Math.min(100, p('bottom', 0))) / 100;
          const cLeft = Math.max(0, Math.min(100, p('left', 0))) / 100;
          const cRight = Math.max(0, Math.min(100, p('right', 0))) / 100;
          
          const cropW = Math.max(0, drawW * (1 - cLeft - cRight));
          const cropH = Math.max(0, drawH * (1 - cTop - cBottom));
          
          ctx.beginPath();
          ctx.rect(
            -drawW / 2 + (cLeft * drawW),
            -drawH / 2 + (cTop * drawH),
            cropW,
            cropH
          );
          ctx.clip();
          break;
        case 'zoom-in': motionScale *= (1 + (p('speed', 1.2) - 1) * progress); break;
        case 'zoom-out': motionScale *= (p('speed', 0.8) + (1 - p('speed', 0.8)) * (1 - progress)); break;
        case 'shake':
          const sIntensity = p('intensity', 50) / 100;
          const sSpeed = p('speed', 50) / 100;
          motionOffsetX += Math.sin(currentTime * (10 + sSpeed * 40)) * sIntensity * drawW * 0.05;
          motionOffsetY += Math.cos(currentTime * (12 + sSpeed * 35)) * sIntensity * drawH * 0.05;
          break;
        case 'jitter':
          const jAmt = p('amount', 20) / 100;
          const jSpeed = p('speed', 90) / 100;
          if (Math.sin(currentTime * 50 * jSpeed) > 0) {
            motionOffsetX += (Math.random() - 0.5) * jAmt * drawW * 0.1;
            motionOffsetY += (Math.random() - 0.5) * jAmt * drawH * 0.1;
          }
          break;
        case 'spin':
          const spinSpeed = p('speed', 50) / 100;
          motionRotate += (currentTime * spinSpeed * 360);
          break;
        case 'pulse':
          const pulseScale = p('scale', 1.1) - 1;
          const pulseSpeed = p('speed', 60) / 60;
          motionScale *= (1 + Math.abs(Math.sin(currentTime * Math.PI * pulseSpeed)) * pulseScale);
          break;
        case 'flicker':
          const fSpeed = p('speed', 50) / 100;
          const fIntensity = p('intensity', 50) / 100;
          const fVal = Math.sin(currentTime * (10 + fSpeed * 50));
          flickerBrightness = fVal > 0 ? 1 + (fIntensity * 0.5) : 1 - (fIntensity * 0.5);
          break;
        case 'flash':
          const flashSpeed = p('speed', 80) / 100;
          const flashBright = p('brightness', 100) / 100;
          const flashVal = Math.sin(currentTime * (20 + flashSpeed * 60));
          if (flashVal > 0.8) flickerBrightness = 1 + flashBright * 2;
          break;
        case 'glitch':
          const gIntensity = p('intensity', 50) / 100;
          if (Math.sin(currentTime * 30) > (1 - gIntensity * 0.8)) {
            motionOffsetX += (Math.random() - 0.5) * gIntensity * drawW * 0.1;
            motionOffsetY += (Math.random() - 0.5) * gIntensity * drawH * 0.05;
            ctx.filter = (ctx.filter === 'none' ? '' : ctx.filter + ' ') + `hue-rotate(${Math.random() * 90 - 45}deg) saturate(${100 + gIntensity * 100}%)`;
          }
          break;
        case 'vhs':
          vhsNoise = p('noise', 30) / 100;
          break;
        case 'vignette':
          vignetteAmount = p('amount', 50) / 100;
          vignetteSize = p('size', 70) / 100;
          break;
        case 'rgb-split':
          rgbSplitDist = p('distance', 10);
          break;
        case 'film-grain':
          filmGrainAmt = p('amount', 40) / 100;
          break;
        case 'cinematic-look':
          const cIntensity = p('intensity', 70) / 100;
          ctx.filter = (ctx.filter === 'none' ? '' : ctx.filter + ' ') + `contrast(110%) saturate(${100 - cIntensity * 20}%) sepia(${cIntensity * 20}%) hue-rotate(${cIntensity * -10}deg)`;
          break;
      }
    });

    if (flickerBrightness !== 1) {
      ctx.filter = (ctx.filter === 'none' ? '' : ctx.filter + ' ') + `brightness(${flickerBrightness * 100}%)`;
    }

    ctx.translate(motionOffsetX, motionOffsetY);
    ctx.rotate(motionRotate * Math.PI / 180);
    ctx.scale(motionScale, motionScale);

    // 5. Draw
    if (rgbSplitDist > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      
      // Red
      ctx.save();
      ctx.filter = (ctx.filter === 'none' ? '' : ctx.filter + ' ') + 'matrix(1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)'; // Mock red channel
      // Since 2D canvas doesn't have easy channel isolation, we'll just offset slightly with opacity
      ctx.globalAlpha = 0.7;
      ctx.translate(-rgbSplitDist, 0);
      ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Blue/Green
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.translate(rgbSplitDist, 0);
      ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
      
      ctx.restore();
    } else {
      ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
    }

    // 6. Post-process
    // Skip heavy post-processing during playback
    if (isPlayback) {
      ctx.restore();
      return;
    }

    // Vignette
    if (vignetteAmount > 0) {
      const grad = ctx.createRadialGradient(0, 0, drawW * 0.2 * vignetteSize, 0, 0, drawW * 0.7);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${vignetteAmount})`);
      ctx.fillStyle = grad;
      ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
    }

    // Noise (VHS / Film Grain)
    const totalNoise = Math.max(vhsNoise, filmGrainAmt);
    if (totalNoise > 0) {
      const noiseCanvas = this.getNoiseCanvas(256, 256);
      ctx.save();
      ctx.globalAlpha = totalNoise * 0.15;
      ctx.globalCompositeOperation = 'overlay';
      const pattern = ctx.createPattern(noiseCanvas, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
      }
      ctx.restore();
      
      if (vhsNoise > 0) {
        ctx.fillStyle = `rgba(0,0,0,${vhsNoise * 0.2})`;
        for (let i = 0; i < drawH; i += 4) {
          ctx.fillRect(-drawW / 2, -drawH / 2 + i, drawW, 1);
        }
      }
    }
    
    ctx.restore();
  }

  private static renderMediaClip(
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    track: Track,
    currentTime: number,
    liveOverrides: Record<string, any>,
    mediaElements: Record<string, HTMLVideoElement | HTMLImageElement> = {},
    isPlayback: boolean = false
  ) {
    const element = mediaElements[clip.id];
    if (!element) return;
    const isReady = element instanceof HTMLImageElement ? element.complete : element.readyState >= 2;
    if (!isReady) return;

    this.renderSourceWithEffects(ctx, element, clip, currentTime, liveOverrides, false, isPlayback);
  }

  private static renderAdjustmentLayer(
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    currentTime: number,
    liveOverrides: Record<string, any>,
    backgroundColor: string = '#000000',
    isPlayback: boolean = false
  ) {
    const { canvas: tempCanvas, ctx: tempCtx } = this.getTempCanvas(ctx.canvas.width, ctx.canvas.height);
    
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(ctx.canvas, 0, 0);

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    this.renderSourceWithEffects(ctx, tempCanvas, clip, currentTime, liveOverrides, true, isPlayback);
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
    const props = clip.effects.find(e => e.name === 'GFX_PROPS')?.params || { x: 0.5, y: 0.5, scale: 1, rotation: 0 };
    return {
      id: clip.id,
      x: props.x * resolution.width,
      y: props.y * resolution.height,
      width: 200,
      height: 100,
      rotation: props.rotation || 0,
      scale: props.scale || 1,
      opacity: 1
    };
  }

  static normalizeProperties(layer: GFXLayer, resolution: { width: number; height: number }) {
    return {
      x: layer.x / resolution.width,
      y: layer.y / resolution.height,
      scale: layer.scale,
      rotation: layer.rotation
    };
  }
}
