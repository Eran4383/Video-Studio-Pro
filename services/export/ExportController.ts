import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { Project, Asset } from '../../types';
import { VideoMuxerService } from './VideoMuxerService';
import { AudioMuxerService } from './AudioMuxerService';
import { SceneRenderer } from './SceneRenderer';

export class ExportController {
  private width: number;
  private height: number;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mediaElements: Map<string, HTMLVideoElement | HTMLImageElement> = new Map();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true })!;
  }

  public async export(project: Project, assets: Asset[], onProgress: (p: number) => void): Promise<Blob> {
    console.log('[ExportController] Starting Export...');
    
    // 1. Setup Muxer
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width: this.width,
        height: this.height
      },
      audio: {
        codec: 'aac',
        sampleRate: 44100,
        numberOfChannels: 2
      },
      fastStart: 'in-memory'
    });

    const videoMuxer = new VideoMuxerService(muxer, this.width, this.height, project.fps);
    const audioMuxer = new AudioMuxerService(muxer);
    const renderer = new SceneRenderer(this.ctx, this.width, this.height);

    // 2. Preload Assets
    onProgress(1);
    await this.preloadAssets(project, assets);

    // 3. Render Audio (Fast)
    onProgress(5);
    await audioMuxer.renderAndEncode(project, assets);

    // 4. Render Video (Frame by Frame)
    // Calculate duration including subtitles
    const activeTracks = project.tracks.filter(t => t.isVisible && (!t.isMuted || t.type === 'subtitle'));
    const duration = Math.max(...activeTracks.flatMap(t => t.clips.map(c => c.startTime + c.duration)), 1);
    const totalFrames = Math.ceil(duration * project.fps);

    console.log(`[ExportController] Video Duration: ${duration}s, Total Frames: ${totalFrames}`);

    for (let i = 0; i < totalFrames; i++) {
      const time = i / project.fps;
      
      // Sync Video Elements
      await this.syncMedia(project, time);

      // Draw
      renderer.render(project, assets, this.mediaElements, time);

      // Encode
      // Note: VideoFrame constructor takes timestamp in microseconds
      const frame = new VideoFrame(this.canvas, { timestamp: time * 1_000_000 });
      await videoMuxer.encodeFrame(frame);
      frame.close();

      // Progress & Yield
      const progress = 10 + ((i / totalFrames) * 90);
      onProgress(progress);

      // Yield to main thread every 5 frames to keep UI responsive
      if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }

    // 5. Finalize
    console.log('[ExportController] Finalizing...');
    await videoMuxer.flush();
    muxer.finalize();

    this.cleanup();

    const buffer = muxer.target.buffer;
    console.log(`[ExportController] Export Complete. Size: ${buffer.byteLength}`);
    return new Blob([buffer], { type: 'video/mp4' });
  }

  private async preloadAssets(project: Project, assets: Asset[]) {
    const videoClips = project.tracks
      .filter(t => t.type === 'video' || t.type === 'image')
      .flatMap(t => t.clips);

    const promises = videoClips.map(async clip => {
      const asset = assets.find(a => a.id === clip.assetId);
      if (!asset) return;
      if (this.mediaElements.has(clip.id)) return; // Already loaded

      if (asset.type === 'VIDEO') {
        const video = document.createElement('video');
        video.src = asset.url;
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.preload = 'auto';
        // We append to body (hidden) to ensure some browsers process it correctly
        video.style.display = 'none';
        document.body.appendChild(video);
        
        await new Promise<void>((resolve, reject) => {
            video.onloadedmetadata = () => resolve();
            video.onerror = (e) => {
                console.warn(`Failed to load video asset: ${asset.name}`, e);
                resolve(); // Resolve anyway to continue
            };
        });
        this.mediaElements.set(clip.id, video);
      } else if (asset.type === 'IMAGE') {
        const img = new Image();
        img.src = asset.url;
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (e) => {
                console.warn(`Failed to load image asset: ${asset.name}`, e);
                resolve();
            };
        });
        this.mediaElements.set(clip.id, img);
      }
    });

    await Promise.all(promises);
  }

  private async syncMedia(project: Project, time: number) {
    const activeVideoClips = project.tracks
        .filter(t => t.type === 'video' && t.isVisible)
        .flatMap(t => t.clips)
        .filter(c => time >= c.startTime && time < c.startTime + c.duration);

    const seekPromises = activeVideoClips.map(clip => {
        const el = this.mediaElements.get(clip.id);
        if (el instanceof HTMLVideoElement) {
            const targetTime = (time - clip.startTime) + clip.offset;
            
            // Always seek for frame accuracy in offline export
            el.currentTime = targetTime;
            return new Promise<void>(resolve => {
                const onSeeked = () => {
                    resolve();
                };
                el.addEventListener('seeked', onSeeked, { once: true });
                
                // Timeout safety
                setTimeout(resolve, 500);
            });
        }
        return Promise.resolve();
    });
    
    await Promise.all(seekPromises);
  }

  private cleanup() {
    this.mediaElements.forEach((el) => {
        if (el instanceof HTMLVideoElement) {
            el.remove();
            el.src = "";
        }
    });
    this.mediaElements.clear();
    this.canvas.remove();
  }
}
