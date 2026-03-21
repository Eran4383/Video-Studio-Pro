
import { Project, Asset } from '../types';
import { AssetValidator } from './AssetValidator';
import { GFX_Engine } from './GFX_Engine';
import fixWebmDuration from 'fix-webm-duration';
import { ErrorReportingService } from './ErrorReportingService';

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
    
    // Prime the context to ensure it's "active" and "audible" for MediaRecorder
    const silence = this.audioCtx.createGain();
    silence.gain.value = 0;
    silence.connect(this.audioCtx.destination);
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
    ErrorReportingService.clearExportLogs();
    ErrorReportingService.logExportEvent(0, 'INFO', 'Starting ExportEngine render');
    await this.prepareAssets(project, assets);
    
    // Calculate duration based only on active tracks (visible/unmuted OR subtitle)
    // Subtitles are visual, so we include them even if "muted" (which might be default for text tracks)
    const activeTracks = project.tracks.filter(t => t.isVisible && (!t.isMuted || t.type === 'subtitle'));
    
    // Debug Duration Calculation
    let maxDuration = 1;
    let maxClipInfo = '';
    
    activeTracks.forEach(t => {
        t.clips.forEach(c => {
            const end = Number(c.startTime) + Number(c.duration);
            if (end > maxDuration) {
                maxDuration = end;
                maxClipInfo = `Track: ${t.name}, Clip: ${c.id}, Start: ${c.startTime}, Dur: ${c.duration}`;
            }
        });
    });
    
    console.log(`[ExportEngine] Calculated Duration: ${maxDuration}s`);
    console.log(`[ExportEngine] Longest Clip: ${maxClipInfo}`);
    ErrorReportingService.logExportEvent(0, 'INFO', 'Calculated duration', { maxDuration, maxClipInfo });

    const duration = maxDuration;
    
    // Compatibility check for MP4/WebM
    // Prioritize WebM for better stability in Linux/Container environments, then MP4
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4', // Let browser choose default codecs
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2'
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
    
    // Ensure AudioContext is running
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    const audioTracks = this.audioDest.stream.getAudioTracks();
    console.log(`[ExportEngine] Found ${audioTracks.length} audio tracks to add.`);
    if (audioTracks.length > 0) {
        audioTracks.forEach(t => {
            console.log(`[ExportEngine] Adding audio track: ${t.label}`);
            stream.addTrack(t);
        });
    } else {
        console.warn("[ExportEngine] No audio tracks found in destination stream!");
        ErrorReportingService.logExportEvent(0, 'WARN', 'No audio tracks found in destination stream');
    }

    try {
      console.log(`[ExportEngine] Initializing MediaRecorder with mimeType: ${selectedMime}`);
      this.recorder = new MediaRecorder(stream, { 
        mimeType: selectedMime,
        videoBitsPerSecond: 4000000 // 4Mbps
      });
    } catch (e) {
      console.error("[ExportEngine] Failed to create MediaRecorder:", e);
      ErrorReportingService.logExportEvent(0, 'ERROR', 'Failed to create MediaRecorder', { error: String(e) });
      // Fallback to default mimeType if specific one failed
      try {
        console.log("[ExportEngine] Retrying MediaRecorder without mimeType options...");
        this.recorder = new MediaRecorder(stream);
      } catch (e2) {
        console.error("[ExportEngine] Failed to create MediaRecorder fallback:", e2);
        ErrorReportingService.logExportEvent(0, 'ERROR', 'Failed to create MediaRecorder fallback', { error: String(e2) });
        throw new Error("Failed to initialize video recorder. Your browser may not support the required formats.");
      }
    }

    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };

    return new Promise((resolve, reject) => {
      this.recorder!.onstop = async () => {
        const finalBlob = new Blob(this.chunks, { type: selectedMime || 'video/webm' });
        console.log(`[ExportEngine] Render Finished. Blob size: ${finalBlob.size} bytes`);
        ErrorReportingService.logExportEvent(duration, 'INFO', 'Render Finished', { blobSize: finalBlob.size });
        this.cleanup();
        this.isRendering = false;

        try {
            // Fix WebM duration metadata so players show correct time
            // fix-webm-duration uses a callback style
            const fixedBlob = await new Promise<Blob>((resolveFixed) => {
                fixWebmDuration(finalBlob, duration * 1000, (fixedBlob) => {
                    resolveFixed(fixedBlob);
                });
            });
            resolve(fixedBlob);
        } catch (e) {
            console.warn("[ExportEngine] Failed to fix WebM duration:", e);
            ErrorReportingService.logExportEvent(duration, 'WARN', 'Failed to fix WebM duration', { error: String(e) });
            resolve(finalBlob);
        }
      };

      this.recorder!.onerror = (err) => {
        console.error("[ExportEngine] Recorder Error:", err);
        ErrorReportingService.logExportEvent(0, 'ERROR', 'Recorder Error', { error: String(err) });
        reject(err);
      };
      
      let hasStarted = false;
      
      const startRenderLoop = () => {
          if (hasStarted) return;
          hasStarted = true;
          
          console.log("[ExportEngine] Starting Render Loop...");
          let startTime = performance.now();

          const draw = async () => {
            if (!this.isRendering) return;

            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed >= duration + 0.5) { // Add 0.5s buffer at end
              setTimeout(() => this.recorder?.stop(), 500); 
              return;
            }

            // 1. Clear Canvas
            this.ctx.fillStyle = project.backgroundColor || '#000000';
            this.ctx.fillRect(0, 0, this.width, this.height);

            // 2. Draw Active Clips (Video/Audio first, then GFX, then Subtitles)
            const mediaTracks = project.tracks.filter(t => (t.type === 'video' || t.type === 'audio') && t.isVisible && !t.isMuted);
            const subtitleTracks = project.tracks.filter(t => t.type === 'subtitle' && t.isVisible && !t.isMuted);

            // Draw/Sync Media
            for (const track of mediaTracks) {
              for (const clip of track.clips) {
                const el = this.videoElements.get(clip.id);
                if (!el) {
                    // Only log missing media element once per clip to avoid spam
                    if (!(clip as any)._loggedMissingMedia) {
                        ErrorReportingService.logExportEvent(elapsed, 'WARN', 'Missing media element for sync', { clipId: clip.id });
                        (clip as any)._loggedMissingMedia = true;
                    }
                    continue;
                }

                if (elapsed >= clip.startTime && elapsed <= clip.startTime + clip.duration) {
                  const targetTime = (elapsed - clip.startTime) + clip.offset;
                  
                  // Sync Time
                  if (Math.abs(el.currentTime - targetTime) > 0.15) {
                    el.currentTime = targetTime;
                  }
                  
                  if (el.paused) {
                     el.play().catch(e => {
                         console.warn("Play failed", e);
                         ErrorReportingService.logExportEvent(elapsed, 'WARN', 'Play failed', { clipId: clip.id, error: String(e) });
                     });
                  }

                  // Draw Video Frames (only if it's a video track and a video element)
                  if (track.type === 'video' && el.tagName === 'VIDEO') {
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

            // Draw GFX
            GFX_Engine.render(this.ctx, project, elapsed);

            // Draw Subtitles
            for (const track of subtitleTracks) {
              for (const clip of track.clips) {
                if (elapsed >= clip.startTime && elapsed <= clip.startTime + clip.duration) {
                  if (clip.content) {
                    try {
                        this.ctx.save();
                        
                        // Scale font relative to video height (similar to PreviewPlayer's rem-based sizing)
                        const baseFontSize = this.height * 0.04; 
                        const fontSize = baseFontSize * (Number(clip.scale) || 1);
                        
                        this.ctx.font = `bold ${fontSize}px ${clip.font || 'Arial, sans-serif'}`;
                        this.ctx.textAlign = "center";
                        this.ctx.textBaseline = "middle";
                        this.ctx.lineJoin = "round";
                        this.ctx.lineWidth = fontSize * 0.1; // Scale stroke with font
                        this.ctx.strokeStyle = "rgba(0,0,0,0.8)";
                        this.ctx.fillStyle = clip.color || "white";
                        
                        const x = (Number(clip.position?.x) ?? 0.5) * this.width;
                        const y = (Number(clip.position?.y) ?? 0.9) * this.height;
                        const maxWidth = this.width * 0.8;

                        if (clip.rotation) {
                          this.ctx.translate(x, y);
                          this.ctx.rotate((Number(clip.rotation) * Math.PI) / 180);
                          this.ctx.translate(-x, -y);
                        }
                        
                        // Word Wrap Logic
                        const words = String(clip.content).split(' ');
                        let line = '';
                        const lines = [];
                        
                        for(let n = 0; n < words.length; n++) {
                          const testLine = line + words[n] + ' ';
                          const metrics = this.ctx.measureText(testLine);
                          const testWidth = metrics.width;
                          if (testWidth > maxWidth && n > 0) {
                            lines.push(line);
                            line = words[n] + ' ';
                          } else {
                            line = testLine;
                          }
                        }
                        lines.push(line);

                        const lineHeight = fontSize * 1.2;
                        const totalHeight = lines.length * lineHeight;
                        let startY = y - (totalHeight / 2) + (lineHeight / 2);

                        lines.forEach((l, i) => {
                            this.ctx.strokeText(l, x, startY + (i * lineHeight));
                            this.ctx.fillText(l, x, startY + (i * lineHeight));
                        });

                        this.ctx.restore();
                    } catch (err) {
                        console.error(`[ExportEngine] Error rendering subtitle clip ${clip.id}:`, err);
                        ErrorReportingService.logExportEvent(elapsed, 'ERROR', 'Error rendering subtitle clip', { clipId: clip.id, error: String(err) });
                        this.ctx.restore(); // Ensure restore happens
                    }
                  }
                }
              }
            }

            onProgress((elapsed / duration) * 100);
            requestAnimationFrame(draw);
          };
          requestAnimationFrame(draw);
      };

      this.recorder!.onstart = () => {
          console.log("[ExportEngine] Recorder started event fired");
          startRenderLoop();
      };

      console.log("[ExportEngine] Calling recorder.start()");
      this.recorder!.start(1000); // Collect data every second
      
      // Safety fallback: If onstart doesn't fire within 1s, force start
      setTimeout(() => {
        if (!hasStarted) {
            console.warn("[ExportEngine] Recorder onstart timed out, forcing render loop...");
            ErrorReportingService.logExportEvent(0, 'WARN', 'Recorder onstart timed out, forcing render loop');
            startRenderLoop();
        }
      }, 1000);
    });
  }
}
