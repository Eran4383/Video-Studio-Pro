
import { Project, Asset } from '../types';
import { AssetValidator } from './AssetValidator';

export class ExportEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioCtx: AudioContext;
  private audioDest: MediaStreamAudioDestinationNode;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private container: HTMLDivElement | null = null;
  private videoElements: Map<string, HTMLVideoElement> = new Map();
  private isRendering: boolean = false;

  constructor(private width: number, private height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Create a hidden container for video elements to ensure they process frames
    this.container = document.createElement('div');
    this.container.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:1px;height:1px;overflow:hidden;opacity:0;';
    this.container.appendChild(this.canvas);
    document.body.appendChild(this.container);

    this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true })!;
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
    this.audioDest = this.audioCtx.createMediaStreamDestination();
  }

  private async prepareAssets(project: Project, assets: Asset[]) {
    console.log("[ExportEngine] Pre-loading assets...");
    
    // Resume AudioContext if suspended
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    for (const track of project.tracks) {
      if (track.isMuted) continue;

      for (const clip of track.clips) {
        const asset = assets.find(a => a.id === clip.assetId);
        if (!asset) continue;

        if (asset.type === 'VIDEO' || asset.type === 'AUDIO') {
          const el = asset.type === 'VIDEO' ? document.createElement('video') : document.createElement('audio');
          el.src = asset.url;
          el.muted = false; // We need audio to flow to the node, but not to speakers
          el.volume = 1.0;
          el.preload = "auto";
          el.crossOrigin = "anonymous";
          
          // Important: Mute the element output to speakers, but keep the stream alive?
          // Actually, if we connect to a destination, it disconnects from speakers automatically usually.
          // But to be safe, we don't set .muted = true because that mutes the stream too in some browsers.
          // We rely on the connection to 'audioDest' which is a stream destination (not speakers).
          
          this.container?.appendChild(el);
          this.videoElements.set(clip.id, el as HTMLVideoElement); // Storing audio els here too for simplicity, casting is safe-ish for common props
          
          // Connect Audio
          try {
            const source = this.audioCtx.createMediaElementSource(el);
            source.connect(this.audioDest);
          } catch (e) {
            console.warn("Could not connect audio source", e);
          }

          // Wait for basic metadata
          await new Promise((resolve) => {
            el.onloadedmetadata = resolve;
            el.onerror = resolve;
            setTimeout(resolve, 2000);
          });
        }
      }
    }
  }

  private cleanup() {
    this.videoElements.forEach(v => {
      v.pause();
      v.src = "";
      v.load();
      v.remove();
    });
    this.videoElements.clear();
    if (this.container) {
      document.body.removeChild(this.container);
      this.container = null;
    }
  }

  async render(project: Project, assets: Asset[], onProgress: (p: number) => void): Promise<Blob> {
    this.isRendering = true;
    await this.prepareAssets(project, assets);
    
    const duration = Math.max(...project.tracks.flatMap(t => t.clips.map(c => c.startTime + c.duration)), 1);
    
    // Compatibility check for MP4
    const mimeTypes = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    
    let selectedMime = '';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }

    console.log(`[ExportEngine] Final Mime Choice: ${selectedMime}`);

    const stream = this.canvas.captureStream(30); // 30 FPS
    this.audioDest.stream.getAudioTracks().forEach(t => stream.addTrack(t));

    this.recorder = new MediaRecorder(stream, { 
      mimeType: selectedMime,
      videoBitsPerSecond: 4000000 // 4Mbps for efficiency on 8GB RAM
    });

    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };

    return new Promise((resolve, reject) => {
      this.recorder!.onstop = () => {
        const finalBlob = new Blob(this.chunks, { type: selectedMime });
        console.log(`[ExportEngine] Render Finished. Blob size: ${finalBlob.size} bytes`);
        this.cleanup();
        this.isRendering = false;
        resolve(finalBlob);
      };

      this.recorder!.onerror = (err) => reject(err);

      this.recorder!.start(1000); // Collect data every second
      let startTime = performance.now();

      const draw = async () => {
        if (!this.isRendering) return;

        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed >= duration) {
          setTimeout(() => this.recorder?.stop(), 500); // Tiny buffer
          return;
        }

        // 1. Clear Canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 2. Draw Active Clips
        for (const track of project.tracks) {
          if (!track.isVisible) continue;
          if (track.isMuted) continue;
          
          // Subtitle Rendering
          if (track.type === 'subtitle') {
            for (const clip of track.clips) {
              if (elapsed >= clip.startTime && elapsed <= clip.startTime + clip.duration) {
                if (clip.content) {
                  this.ctx.save();
                  this.ctx.font = "bold 48px Arial, sans-serif";
                  this.ctx.textAlign = "center";
                  this.ctx.textBaseline = "bottom";
                  this.ctx.lineJoin = "round";
                  this.ctx.lineWidth = 6;
                  this.ctx.strokeStyle = "rgba(0,0,0,0.8)";
                  this.ctx.fillStyle = "white";
                  
                  // Simple word wrap or just max width
                  const x = this.width / 2;
                  const y = this.height - 80;
                  const maxWidth = this.width * 0.8;
                  
                  this.ctx.strokeText(clip.content, x, y, maxWidth);
                  this.ctx.fillText(clip.content, x, y, maxWidth);
                  this.ctx.restore();
                }
              }
            }
            continue; // Skip the rest of the loop for subtitle tracks
          }

          // Video/Audio Rendering
          for (const clip of track.clips) {
            const el = this.videoElements.get(clip.id);
            if (!el) continue;

            if (elapsed >= clip.startTime && elapsed <= clip.startTime + clip.duration) {
              const targetTime = (elapsed - clip.startTime) + clip.offset;
              
              // Sync Time
              if (Math.abs(el.currentTime - targetTime) > 0.15) {
                el.currentTime = targetTime;
              }
              
              if (el.paused) {
                 el.play().catch(e => console.warn("Play failed", e));
              }

              // Draw Video Frames
              if (el.tagName === 'VIDEO') {
                // Check if ready to draw
                if ((el as HTMLVideoElement).readyState >= 2) {
                   this.ctx.drawImage(el as HTMLVideoElement, 0, 0, this.width, this.height);
                }
              }
            } else {
              // Pause clips that are not in view to save CPU/RAM
              if (!el.paused) el.pause();
            }
          }
        }

        onProgress((elapsed / duration) * 100);
        requestAnimationFrame(draw);
      };

      requestAnimationFrame(draw);
    });
  }
}
