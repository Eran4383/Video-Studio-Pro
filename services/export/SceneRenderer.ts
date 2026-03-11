import { Project, Asset, Clip } from '../../types';
import { GFX_Engine } from '../GFX_Engine';
import { generateBlockLayout } from '../../utils/kinetic/KineticLayoutManager';

export class SceneRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private cachedKineticBlocks: {
    block: any;
    words: any[];
    metadata: Record<string, { index: number, total: number }>;
    clipMap: Record<string, Clip>;
  }[] | null = null;

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
    const visualTracks = project.tracks.filter(t => t.type === 'video' && t.isVisible);

    for (const track of visualTracks) {
      const clip = track.clips.find(c => time >= c.startTime && time < c.startTime + c.duration);
      if (clip) {
        this.drawMediaClip(clip, mediaElements, time);
      }
    }

    // 3. Draw GFX (Overlays)
    GFX_Engine.render(this.ctx, project, time);

    // 4. Draw Kinetic Blocks
    this.drawKineticBlocks(project, time);

    // 5. Draw Subtitles (Topmost layer)
    const subtitleTracks = project.tracks.filter(t => t.type === 'subtitle' && t.isVisible);
    const kineticClipIds = new Set(project.kineticBlocks?.flatMap(b => b.clipIds) || []);

    for (const track of subtitleTracks) {
      const clip = track.clips.find(c => time >= c.startTime && time < c.startTime + c.duration);
      if (clip && clip.content) {
        if (kineticClipIds.has(clip.id)) continue;
        this.drawSubtitle(clip, time);
      }
    }
  }

  private drawKineticBlocks(project: Project, time: number) {
    if (!project.kineticBlocks || project.kineticBlocks.length === 0) return;

    if (!this.cachedKineticBlocks) {
      // Collect all clips from visual tracks for layout generation
      const allClips: Clip[] = [];
      project.tracks.forEach(t => {
        if (t.type === 'video' || t.type === 'subtitle') { // Kinetic blocks usually link to subtitle clips or video clips with content
          allClips.push(...t.clips);
        }
      });

      // Create clip map for fast lookup
      const clipMap: Record<string, Clip> = {};
      allClips.forEach(c => clipMap[c.id] = c);

      this.cachedKineticBlocks = project.kineticBlocks.map(block => {
        const words = generateBlockLayout(block, allClips);
        
        // Pre-calculate word indices and counts per clip for O(1) timing calculation
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

        return { block, words, metadata, clipMap };
      });
    }

    for (const cached of this.cachedKineticBlocks) {
      const { block, words, metadata, clipMap } = cached;
      const { settings } = block;
      if (!settings || words.length === 0) continue;

      const box = settings.boundingBox || { x: 0, y: 0, width: 1, height: 1 };
      const boxX = box.x * this.width;
      const boxY = box.y * this.height;
      const boxWidth = box.width * this.width;
      const boxHeight = box.height * this.height;

      this.ctx.save();

      // Draw Box Overlay (if enabled)
      if (settings.showBox) {
        this.ctx.strokeStyle = 'rgba(234, 179, 8, 0.5)'; // Yellow-500
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        this.ctx.fillStyle = 'rgba(234, 179, 8, 0.1)';
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        this.ctx.setLineDash([]);
      }

      words.forEach(word => {
        const clip = clipMap[word.sourceClipId];
        const meta = metadata[word.id];
        
        let isActive = false;
        let isPast = false;

        if (clip && meta) {
          const wordDuration = clip.duration / Math.max(1, meta.total);
          const liveStartTime = clip.startTime + (meta.index * wordDuration);
          const liveEndTime = liveStartTime + wordDuration;
          
          isActive = time >= liveStartTime && time <= liveEndTime;
          isPast = time > liveEndTime;
        } else {
          isActive = time >= word.startTime && time <= word.endTime;
          isPast = time > word.endTime;
        }

        const isKeepVisible = 
          (word.layoutStyle === 'dynamic-collage' && settings.keepPastInCollage) ||
          (word.layoutStyle === 'karaoke' && settings.keepPastInKaraoke) ||
          (word.layoutStyle === 'pop-in-place' && settings.keepPastInPop) ||
          settings.keepPreviousWordsVisible; // fallback for old projects

        const isSceneDone = time > word.sceneEndTime;
        if (isSceneDone) return;

        const shouldShow = isActive || (isPast && isKeepVisible);

        if (!shouldShow) return;

        const pastOpacity = settings.pastWordsOpacity !== undefined ? settings.pastWordsOpacity / 100 : 0.4;
        const opacityValue = isPast 
          ? (word.layoutStyle === 'pop-in-place' || !isKeepVisible ? 0 : pastOpacity) 
          : 1;

        if (opacityValue <= 0) return;

        const isStretchX = word.stretchX;
        const isStretchY = word.stretchY;

        // Calculate Position relative to Box
        let wordX = boxX + (word.position.x * boxWidth);
        let wordY = boxY + (word.position.y * boxHeight);

        // Calculate Font Size
        let fontSizePx = (word.fontSize || 0.1) * boxHeight;
        if (isStretchX) fontSizePx = boxWidth; // 100cqw
        if (isStretchY) fontSizePx = boxHeight; // 100cqh

        this.ctx.globalAlpha = opacityValue;
        
        const fontWeight = word.fontWeight || settings.fontWeight || '900';
        const fontFamily = word.fontFamily || settings.primaryFont || 'Inter, sans-serif';
        this.ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
        this.ctx.fillStyle = word.color;
        
        // Shadow
        this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;

        let textToDraw = word.text;
        const textCase = word.textCase || (settings.textCase !== 'random' ? settings.textCase : undefined) || 'none';
        if (textCase === 'uppercase') textToDraw = textToDraw.toUpperCase();
        if (textCase === 'lowercase') textToDraw = textToDraw.toLowerCase();

        this.ctx.textBaseline = 'top';
        this.ctx.textAlign = 'left';

        if (isStretchX) {
          this.ctx.textAlign = 'center';
          wordX = boxX + (boxWidth / 2);
        }

        if (isStretchY) {
          this.ctx.textBaseline = 'middle';
          wordY = boxY + (boxHeight / 2);
        }

        if (word.isCentered && !isStretchX && !isStretchY) {
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          // wordX and wordY are already centered in pop-in-place layout (50%, 50%)
        }

        this.ctx.fillText(textToDraw, wordX, wordY);
      });

      this.ctx.restore();
    }
  }

  private drawMediaClip(
    clip: Clip, 
    mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>, 
    time: number
  ) {
    const element = mediaElements.get(clip.id);
    if (!element) return;

    let srcWidth = 0;
    let srcHeight = 0;

    if (element instanceof HTMLVideoElement) {
        if (element.readyState < 2) return;
        srcWidth = element.videoWidth;
        srcHeight = element.videoHeight;
    } else if (element instanceof HTMLImageElement) {
        if (!element.complete) return;
        srcWidth = element.naturalWidth;
        srcHeight = element.naturalHeight;
    }

    if (srcWidth === 0 || srcHeight === 0) return;

    this.ctx.save();

    // 1. Calculate Object-Fit: Contain dimensions
    // Match PreviewPlayer behavior (object-contain)
    const scaleFactor = Math.min(this.width / srcWidth, this.height / srcHeight);
    const drawWidth = srcWidth * scaleFactor;
    const drawHeight = srcHeight * scaleFactor;

    // 2. Apply Clip Transformations
    // Default position is center (0.5, 0.5)
    const x = (Number(clip.position?.x) ?? 0.5) * this.width;
    const y = (Number(clip.position?.y) ?? 0.5) * this.height;
    const rotation = Number(clip.rotation) || 0;
    const scale = Number(clip.scale) || 1;
    const opacity = Number(clip.opacity) ?? 1;

    this.ctx.translate(x, y);
    this.ctx.rotate((rotation * Math.PI) / 180);
    this.ctx.scale(scale, scale);
    this.ctx.globalAlpha = opacity;

    // 3. Draw Centered
    this.ctx.drawImage(element, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    this.ctx.restore();
  }

  private drawSubtitle(clip: Clip, time: number) {
    if (!clip.content) return;

    // KINETIC TYPOGRAPHY RENDERER (Legacy support for old clips)
    if (clip.kineticData && clip.kineticData.words && clip.kineticData.words.length > 0) {
      const { settings, words } = clip.kineticData;
      const { boundingBox } = settings;

      // 1. Calculate Absolute Bounding Box
      const boxX = (boundingBox.x) * this.width;
      const boxY = (boundingBox.y) * this.height;
      const boxWidth = (boundingBox.width) * this.width;
      const boxHeight = (boundingBox.height) * this.height;

      // 2. Relative Timing
      const relativeTime = time - clip.startTime;

      this.ctx.save();
      
      // Draw Box Overlay (if enabled)
      if (settings.showBox) {
        this.ctx.strokeStyle = 'rgba(234, 179, 8, 0.5)'; // Yellow-500
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        this.ctx.fillStyle = 'rgba(234, 179, 8, 0.1)';
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        this.ctx.setLineDash([]);
      }

      // 3. Draw Words
      words.forEach(word => {
        if (relativeTime >= word.startTime) {
          // Calculate Position relative to Box
          const wordX = boxX + (word.position.x * boxWidth); // position.x is 0-1 relative to box
          const wordY = boxY + (word.position.y * boxHeight);

          // Calculate Font Size (cqh equivalent)
          // word.fontSize is 0-1 relative to box HEIGHT
          const fontSize = word.fontSize * boxHeight;

          this.ctx.font = `900 ${fontSize}px ${word.fontFamily || settings.primaryFont || 'Inter, sans-serif'}`;
          this.ctx.fillStyle = word.color;
          this.ctx.textBaseline = 'top'; // DOM usually aligns top-left for spans
          this.ctx.textAlign = 'left';
          
          // Shadow
          this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
          this.ctx.shadowBlur = 0;
          this.ctx.shadowOffsetX = 2;
          this.ctx.shadowOffsetY = 2;

          this.ctx.fillText(word.text, wordX, wordY);
        }
      });

      this.ctx.restore();

    } else {
      // STANDARD SUBTITLE RENDERER
      this.ctx.save();
      
      // Dynamic font sizing based on video width (2.2% of width to match 1.25rem on 1920px)
    const baseFontSize = this.width * 0.022; 
    const scale = Number(clip.scale) || 1;
    const scaleX = Number(clip.scaleX ?? scale);
    const scaleY = Number(clip.scaleY ?? scale);
    
    const fontSize = baseFontSize;
    const fontWeight = clip.fontWeight || 'bold';
    
    this.ctx.font = `${fontWeight} ${fontSize}px ${clip.font || 'Inter, sans-serif'}`;
    this.ctx.textAlign = (clip.textAlign as CanvasTextAlign) || "center";
    this.ctx.textBaseline = "middle";
    this.ctx.lineJoin = "round";
    this.ctx.lineWidth = fontSize * 0.1; // Stroke relative to font size
    this.ctx.strokeStyle = "rgba(0,0,0,0.8)";
    this.ctx.fillStyle = clip.color || "white";
    this.ctx.globalAlpha = clip.opacity ?? 1;
    
    // Position (0-1 range -> pixels)
    const x = (Number(clip.position?.x) ?? 0.5) * this.width;
    const y = (Number(clip.position?.y) ?? 0.9) * this.height;
    
    this.ctx.translate(x, y);
    if (clip.rotation) {
      this.ctx.rotate((Number(clip.rotation) * Math.PI) / 180);
    }
    this.ctx.scale(scaleX, scaleY);
    
    // Word Wrap
    const maxWidth = (this.width * 0.8) / scaleX;
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
    // Draw centered at (0,0) relative to transform
    const startY = -(totalHeight / 2) + (lineHeight / 2);

    // Calculate max block width for alignment offsets
    let blockWidth = 0;
    lines.forEach(l => {
        const w = this.ctx.measureText(l).width;
        if (w > blockWidth) blockWidth = w;
    });

    lines.forEach((l, i) => {
        const lineY = startY + (i * lineHeight);
        let lineX = 0;
        
        // Adjust X based on alignment relative to the center anchor
        if (clip.textAlign === 'left') lineX = -blockWidth / 2;
        if (clip.textAlign === 'right') lineX = blockWidth / 2;
        
        this.ctx.strokeText(l, lineX, lineY);
        this.ctx.fillText(l, lineX, lineY);
    });

    this.ctx.restore();
    }
  }
}
