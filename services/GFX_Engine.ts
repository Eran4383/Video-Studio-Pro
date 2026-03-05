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
      .filter(t => t.isVisible && t.type !== 'subtitle')
      .forEach(track => {
        track.clips.forEach(clip => {
          if (currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration) {
             // Only render if it has content (text/subtitle)
             if (clip.content) {
                const resolution = project.resolution;
                const x = (clip.position?.x ?? 0.5) * resolution.width;
                const y = (clip.position?.y ?? 0.9) * resolution.height;
                const scale = clip.scale ?? 1;
                const rotation = clip.rotation ?? 0;
                
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rotation * Math.PI / 180);
                ctx.scale(scale, scale);
                
                // Opacity
                ctx.globalAlpha = clip.opacity ?? 1;

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
                
                // Stroke (optional, could be added to Clip props later)
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