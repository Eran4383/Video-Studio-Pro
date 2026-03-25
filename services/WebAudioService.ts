
import { Asset, Clip } from '../types';

class WebAudioService {
  private context: AudioContext | null = null;
  private sources: Map<string, AudioBufferSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();

  constructor() {
    // Context is initialized on first user interaction
  }

  private initContext() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioContextClass();
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    return this.context;
  }

  public playClip(clip: Clip, asset: Asset, currentTime: number) {
    const ctx = this.initContext();
    if (!asset.audioBuffer || !(asset.audioBuffer instanceof AudioBuffer)) {
      console.warn(`[WebAudioService] No valid AudioBuffer found for asset: ${asset.id}`);
      return;
    }

    // Stop existing source for this clip if any
    this.stopClip(clip.id);

    const source = ctx.createBufferSource();
    source.buffer = asset.audioBuffer;

    const gainNode = ctx.createGain();
    // Handle muting if needed, but usually handled by the caller filtering active sources
    gainNode.gain.value = 1.0;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    const clipOffset = Math.max(0, currentTime - clip.startTime);
    const assetOffset = clip.offset + clipOffset;
    const durationRemaining = clip.duration - clipOffset;

    if (durationRemaining <= 0) return;

    // Start playback
    // start(when, offset, duration)
    source.start(ctx.currentTime, assetOffset, durationRemaining);

    this.sources.set(clip.id, source);
    this.gainNodes.set(clip.id, gainNode);

    source.onended = () => {
      this.sources.delete(clip.id);
      this.gainNodes.delete(clip.id);
    };
  }

  public stopClip(clipId: string) {
    const source = this.sources.get(clipId);
    if (source) {
      try {
        source.stop();
      } catch (e) {
        // Source might have already stopped
      }
      this.sources.delete(clipId);
      this.gainNodes.delete(clipId);
    }
  }

  public stopAll() {
    this.sources.forEach((_, id) => this.stopClip(id));
  }

  public resume() {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  public suspend() {
    if (this.context && this.context.state === 'running') {
      this.context.suspend();
    }
  }
}

export const webAudioService = new WebAudioService();
