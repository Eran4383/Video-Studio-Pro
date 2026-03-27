
import { MediaType, Asset } from '../types';
import { FilePersistenceService } from './FilePersistenceService';
import { webAudioEngine } from './WebAudioEngine';

/**
 * AssetService handles the processing of files into application assets.
 * It extracts metadata, generates thumbnails, and processes audio for waveforms.
 */
export class AssetService {
  /**
   * Processes a File object into an Asset.
   */
  public static async processFile(file: File): Promise<Asset> {
    const id = `asset-${Math.random().toString(36).substr(2, 9)}`;
    const url = URL.createObjectURL(file);
    const type = this.getMediaType(file);
    
    // Persist file to IndexedDB so it survives page refresh
    try {
      await FilePersistenceService.saveFile(id, file);
    } catch (err) {
      console.warn(`[AssetService] Failed to persist file ${id} to IndexedDB:`, err);
    }
    
    let duration = 0;
    let width = 0;
    let height = 0;
    let thumbnail = '';
    let waveform: number[] = [];
    let audioBuffer: AudioBuffer | undefined;

    if (type === MediaType.VIDEO) {
      const metadata = await this.getVideoMetadata(url);
      duration = metadata.duration;
      width = metadata.width;
      height = metadata.height;
      thumbnail = await this.generateVideoThumbnail(url, duration / 2);
      
      // Extract audio for waveform
      const audioResult = await this.extractWaveformAndBuffer(url, 1000, id);
      waveform = audioResult.waveform;
      audioBuffer = audioResult.audioBuffer;
    } else if (type === MediaType.AUDIO) {
      const audioResult = await this.extractWaveformAndBuffer(url, 1000, id);
      waveform = audioResult.waveform;
      audioBuffer = audioResult.audioBuffer;
      
      // For audio, we'll use a placeholder or generic icon for thumbnail
      // In a real app, we might extract album art
      thumbnail = 'audio-placeholder';
      
      // Get duration from AudioBuffer
      if (audioBuffer) {
        duration = audioBuffer.duration;
      }
    } else if (type === MediaType.IMAGE) {
      const metadata = await this.getImageMetadata(url);
      width = metadata.width;
      height = metadata.height;
      thumbnail = url; // Use the image itself as thumbnail
      duration = 5; // Default duration for images on timeline
    }

    return {
      id,
      name: file.name,
      type,
      url,
      duration,
      width,
      height,
      thumbnail,
      waveform,
      audioBuffer,
      file // Keep original file reference if needed
    };
  }

  private static getMediaType(file: File): MediaType {
    if (file.type.startsWith('video/')) return MediaType.VIDEO;
    if (file.type.startsWith('audio/')) return MediaType.AUDIO;
    if (file.type.startsWith('image/')) return MediaType.IMAGE;
    return MediaType.IMAGE; // Default fallback
  }

  public static async extractWaveformAndBuffer(url: string, samples: number, assetId?: string): Promise<{ waveform: number[], audioBuffer?: AudioBuffer }> {
    try {
      console.log(`[AssetService] Fetching asset from URL: ${url}`);
      let arrayBuffer: ArrayBuffer;
      
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch asset: ${response.status} ${response.statusText}`);
        }
        arrayBuffer = await response.arrayBuffer();
      } catch (fetchError) {
        console.warn(`[AssetService] Fetch failed for ${url}. Attempting recovery from IndexedDB...`, fetchError);
        if (assetId) {
          const persistedFile = await FilePersistenceService.getFile(assetId);
          if (persistedFile) {
            console.log(`[AssetService] Recovered file from IndexedDB for asset: ${assetId}`);
            arrayBuffer = await persistedFile.arrayBuffer();
          } else {
            throw new Error(`Failed to fetch and no persisted file found for asset: ${assetId}`);
          }
        } else {
          throw fetchError;
        }
      }
      
      const audioCtx = webAudioEngine.getContext();
      
      try {
        console.log(`[AssetService] Decoding audio data for URL: ${url}`);
        // Use the context from webAudioEngine
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        if (typeof audioBuffer.getChannelData !== 'function') {
          console.warn("[AssetService] decodeAudioData returned an object without getChannelData");
          return { waveform: [], audioBuffer: undefined };
        }

        const channelData = audioBuffer.getChannelData(0);
        const blockSize = Math.floor(channelData.length / samples);
        const waveform: number[] = [];
        
        for (let i = 0; i < samples; i++) {
          let max = 0;
          let min = 0;
          for (let j = 0; j < blockSize; j++) {
            if (i * blockSize + j < channelData.length) {
              const val = channelData[i * blockSize + j];
              if (val > max) max = val;
              if (val < min) min = val;
            }
          }
          waveform.push(min);
          waveform.push(max);
        }
        console.log(`[AssetService] Successfully decoded audio and generated waveform for: ${url}`);
        return { waveform, audioBuffer };
      } catch (decodeError) {
        console.error(`[AssetService] Error decoding audio data:`, decodeError);
        throw decodeError;
      }
    } catch (e) {
      console.error("[AssetService] Waveform generation error:", e);
      return { waveform: [], audioBuffer: undefined };
    }
  }

  private static async extractWaveform(url: string, samples = 1000): Promise<number[]> {
    const result = await this.extractWaveformAndBuffer(url, samples);
    return result.waveform;
  }

  private static getVideoMetadata(url: string): Promise<{ duration: number, width: number, height: number }> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight
        });
      };
      video.onerror = () => {
        resolve({ duration: 0, width: 0, height: 0 });
      };
      video.src = url;
    });
  }

  private static getImageMetadata(url: string): Promise<{ width: number, height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        });
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = url;
    });
  }

  private static generateVideoThumbnail(url: string, time: number): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = url;
      video.currentTime = time;
      video.muted = true;
      video.playsInline = true;
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          resolve('');
        }
      };
      
      video.onerror = () => resolve('');
    });
  }
}
