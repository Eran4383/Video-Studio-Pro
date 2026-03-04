import { Project, Asset, Clip } from '../../types';
import { GFX_Engine } from '../GFX_Engine';

export class SceneRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  public render(
    project: Project,
    assets: Asset[],
    mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>,
    time: number
  ) {
    // 1. Clear Canvas
    this.ctx.fillStyle = project.backgroundColor || '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw Active Media Clips (Video/Image)
    // We render tracks in order. Assuming tracks[0] is the bottom-most layer? 
    // Usually in NLEs, higher track index = higher z-index.
    // Let's assume the array order is the render order for now.
    const visualTracks = project.tracks.filter(t => (t.type === 'video' || t.type === 'image') && t.isVisible);

    for (const track of visualTracks) {
      const clip = track.clips.find(c => time >= c.startTime && time < c.startTime + c.duration);
      if (clip) {
        this.drawMediaClip(clip, mediaElements, time);
      }
    }

    // 3. Draw GFX (Overlays)
    GFX_Engine.render(this.ctx, project, time);

    // 4. Draw Subtitles (Topmost layer)
    const subtitleTracks = project.tracks.filter(t => t.type === 'subtitle' && t.isVisible);
    for (const track of subtitleTracks) {
      const clip = track.clips.find(c => time >= c.startTime && time < c.startTime + c.duration);
      if (clip && clip.content) {
        this.drawSubtitle(clip);
      }
    }
  }

  private drawMediaClip(
    clip: Clip, 
    mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>, 
    time: number
  ) {
    const element = mediaElements.get(clip.id);
    if (!element) return;

    // Calculate source time for video
    // For images, source time doesn't matter, but we check type
    if (element instanceof HTMLVideoElement) {
        // Video frame synchronization is handled by the Controller (seeking)
        // We just draw the current state of the element
        if (element.readyState >= 2) {
            this.ctx.drawImage(element, 0, 0, this.width, this.height);
        }
    } else if (element instanceof HTMLImageElement) {
        if (element.complete) {
            this.ctx.drawImage(element, 0, 0, this.width, this.height);
        }
    }
  }

  private drawSubtitle(clip: Clip) {
    if (!clip.content) return;

    this.ctx.save();
    
    // Dynamic font sizing based on video height (4% of height)
    const baseFontSize = this.height * 0.04; 
    const scale = Number(clip.scale) || 1;
    const fontSize = baseFontSize * scale;
    
    this.ctx.font = `bold ${fontSize}px ${clip.font || 'Arial, sans-serif'}`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.lineJoin = "round";
    this.ctx.lineWidth = fontSize * 0.1; // Stroke relative to font size
    this.ctx.strokeStyle = "rgba(0,0,0,0.8)";
    this.ctx.fillStyle = clip.color || "white";
    
    // Position (0-1 range -> pixels)
    const x = (Number(clip.position?.x) ?? 0.5) * this.width;
    const y = (Number(clip.position?.y) ?? 0.9) * this.height;
    
    // Rotation
    if (clip.rotation) {
      this.ctx.translate(x, y);
      this.ctx.rotate((Number(clip.rotation) * Math.PI) / 180);
      this.ctx.translate(-x, -y);
    }
    
    // Word Wrap
    const maxWidth = this.width * 0.8;
    const words = String(clip.content).split(' ');
    let line = '';
    const lines: string[] = [];
    
    for(let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = this.ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line);
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    // Draw Lines
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = y - (totalHeight / 2) + (lineHeight / 2);

    lines.forEach((l, i) => {
        const lineY = startY + (i * lineHeight);
        this.ctx.strokeText(l, x, lineY);
        this.ctx.fillText(l, x, lineY);
    });

    this.ctx.restore();
  }
}
