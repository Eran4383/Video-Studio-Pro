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
  static render(ctx: CanvasRenderingContext2D, project: Project, currentTime: number) {
    // Render GFX clips (Text, Overlays) that are not handled by the subtitle system
    // We iterate through video tracks and look for clips with content or GFX properties
    project.tracks
      .filter(t => t.type === 'video' && t.isVisible)
      .forEach(track => {
        track.clips.forEach(clip => {
          if (currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration) {
            // If it has content but isn't a subtitle clip (subtitles are handled separately in Preview)
            // Actually, in ExportEngine, we want to render everything.
            // For now, let's render GFX props if they exist.
            const layer = this.getLayerForClip(clip, project.resolution);
            if (layer && clip.content) {
              ctx.save();
              ctx.translate(layer.x, layer.y);
              ctx.rotate(layer.rotation * Math.PI / 180);
              ctx.scale(layer.scale, layer.scale);
              ctx.globalAlpha = layer.opacity;

              ctx.font = "bold 60px Arial, sans-serif";
              ctx.fillStyle = clip.color || "white";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.strokeStyle = "black";
              ctx.lineWidth = 4;
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