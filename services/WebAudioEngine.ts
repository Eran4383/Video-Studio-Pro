
import { Clip } from '../types';

/**
 * WebAudioEngine handles the core audio operations using the Web Audio API.
 * It provides frame-accurate, sub-millisecond precision for playback and decoding.
 */
class WebAudioEngine {
  private context: AudioContext | null = null;
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();
  private audioBuffers: Map<string, AudioBuffer> = new Map();

  /**
   * Initializes or returns the existing AudioContext.
   * Must be called within a user interaction to ensure it's not suspended.
   */
  public getContext(): AudioContext {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioContextClass();
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    return this.context;
  }

  /**
   * Decodes an ArrayBuffer into an AudioBuffer.
   * This is used for decoding MP4/audio files into memory.
   */
  public async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    const ctx = this.getContext();
    return await ctx.decodeAudioData(arrayBuffer);
  }

  /**
   * Fetches and decodes audio from a URL.
   */
  public async loadFromUrl(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await this.decodeAudioData(arrayBuffer);
  }

  /**
   * Caches an AudioBuffer for a specific asset.
   */
  public cacheBuffer(assetId: string, buffer: AudioBuffer): void {
    this.audioBuffers.set(assetId, buffer);
  }

  /**
   * Retrieves a cached AudioBuffer.
   */
  public getBuffer(assetId: string): AudioBuffer | undefined {
    return this.audioBuffers.get(assetId);
  }

  /**
   * Plays a specific clip at a given timeline time.
   * Calculates the exact sample offset within the buffer.
   */
  public playClip(clip: Clip, assetId: string, timelineTime: number): void {
    const ctx = this.getContext();
    const buffer = this.audioBuffers.get(assetId);
    
    if (!buffer) {
      console.warn(`[WebAudioEngine] No buffer found for asset: ${assetId}`);
      return;
    }

    // Ensure any existing source for this clip is stopped
    this.stopClip(clip.id);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    // Create a gain node for future volume/fade support
    const gainNode = ctx.createGain();
    gainNode.gain.value = 1.0;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Calculate precise offsets
    // timelineTime is the current position of the playhead
    const timeInClip = timelineTime - clip.startTime;
    const assetOffset = clip.offset + timeInClip;
    const durationToPlay = clip.duration - timeInClip;

    // Only start if there is something to play
    if (durationToPlay > 0 && assetOffset >= 0) {
      // Use sub-millisecond precision for the start time
      source.start(ctx.currentTime, assetOffset, durationToPlay);
      this.activeSources.set(clip.id, source);

      source.onended = () => {
        // Cleanup when playback finishes naturally
        if (this.activeSources.get(clip.id) === source) {
          this.activeSources.delete(clip.id);
        }
      };
    }
  }

  /**
   * Stops a specific clip's playback.
   */
  public stopClip(clipId: string): void {
    const source = this.activeSources.get(clipId);
    if (source) {
      try {
        source.stop();
      } catch (e) {
        // Source might have already stopped or not started
      }
      this.activeSources.delete(clipId);
    }
  }

  /**
   * Stops all active audio sources.
   * Used for pausing or seeking.
   */
  public stopAll(): void {
    this.activeSources.forEach((source, id) => {
      try {
        source.stop();
      } catch (e) {}
    });
    this.activeSources.clear();
  }

  /**
   * Clears the buffer cache.
   */
  public clearCache(): void {
    this.audioBuffers.clear();
  }
}

// Export a singleton instance
export const webAudioEngine = new WebAudioEngine();
