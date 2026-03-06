import { Project, Clip } from '../types';

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
    // Render GFX clips (Text, Overlays) and Video/Image
    project.tracks
      .filter(t => t.isVisible)
      .forEach(track => {
        track.clips.forEach(clip => {
          if (currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration) {
             const override = liveOverrides[clip.id] || {};
             const posX = override.posX !== undefined ? override.posX / 100 : (clip.position?.x ?? 0.5);
             const posY = override.posY !== undefined ? override.posY / 100 : (clip.position?.y ?? (clip.content ? 0.9 : 0.5));
             const scale = override.scale !== undefined ? override.scale / 100 : (clip.scale || 1);
             const rotation = override.rotation !== undefined ? override.rotation : (clip.rotation || 0);
             const opacity = override.opacity !== undefined ? override.opacity / 100 : (clip.opacity ?? 1);

             // Render Video/Image
             if (activeMedia && clip.id === activeMedia.clipId) {
                 const asset = activeMedia.asset;
                 const element = activeMedia.element;
                 
                 const assetAspect = (asset.width || 1920) / (asset.height || 1080);
                 const canvasAspect = ctx.canvas.width / ctx.canvas.height;
                 let drawW = ctx.canvas.width;
                 let drawH = ctx.canvas.height;
                 
                 // "object-contain" logic (as per user instruction "similar to object-fit: cover" but with provided logic that implements contain)
                 if (assetAspect > canvasAspect) {
                     drawH = drawW / assetAspect;
                 } else {
                     drawW = drawH * assetAspect;
                 }

                 ctx.save();
                 ctx.globalAlpha = opacity;
                 ctx.translate(posX * ctx.canvas.width, posY * ctx.canvas.height);
                 ctx.rotate(rotation * Math.PI / 180);
                 ctx.scale(scale, scale);
                 ctx.drawImage(element, -drawW / 2, -drawH / 2, drawW, drawH);
                 ctx.restore();
             }

             // Only render text if it has content AND it is NOT a subtitle track (since subtitles are DOM-based)
             // Or if we want to move subtitles to canvas too? User didn't ask for that.
             // The original code filtered out 'subtitle' tracks.
             if (clip.content && track.type !== 'subtitle') {
                const resolution = project.resolution;
                
                ctx.save();
                ctx.translate(posX * resolution.width, posY * resolution.height);
                ctx.rotate(rotation * Math.PI / 180);
                ctx.scale(scale, scale);
                
                // Opacity
                ctx.globalAlpha = opacity;

                // Shadow
                if (clip.shadow) {
                    ctx.shadowColor = "rgba(0,0,0,0.8)";
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetX = 2;
                    ctx.shadowOffsetY = 2;
                }

                // Font Styling
                const fontSize = resolution.height * 0.05; // 5% of height
                const fontWeight = clip.fontWeight || 'bold';
                const fontFamily = clip.font || 'Arial, sans-serif';
                ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
                
                ctx.fillStyle = clip.color || "white";
                ctx.textAlign = (clip.textAlign as CanvasTextAlign) || "center";
                ctx.textBaseline = "middle";
                
                // Stroke (optional)
                ctx.strokeStyle = "black";
                ctx.lineWidth = fontSize * 0.05;
                ctx.lineJoin = "round";
                ctx.strokeText(clip.content, 0, 0);
                
                ctx.fillText(clip.content, 0, 0);
                ctx.restore();
             }
          }
        });
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