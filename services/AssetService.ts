
import { Asset, MediaType, WAVEFORM_SAMPLES_PER_SECOND } from '../types';
import { MagneticAnchorService } from './MagneticAnchorService';

export class AssetService {
  static async processFile(file: File): Promise<Asset> {
    const url = URL.createObjectURL(file);
    
    // Improved type detection
    let type = MediaType.IMAGE;
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (file.type.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm', 'ts'].includes(ext || '')) {
      type = MediaType.VIDEO;
    } else if (file.type.startsWith('audio/') || ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'].includes(ext || '')) {
      type = MediaType.AUDIO;
    } else if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      type = MediaType.IMAGE;
    }

    let duration = 0;
    let thumbnail = '';
    let width = 0;
    let height = 0;
    let waveform: number[] | undefined = undefined;
    let audioBuffer: AudioBuffer | undefined = undefined;

    try {
      if (type === MediaType.VIDEO) {
        const metadata = await this.getVideoMetadata(url);
        duration = metadata.duration;
        width = metadata.width;
        height = metadata.height;
        thumbnail = await this.generateThumbnail(url).catch(() => '');
        
        // Extract real waveform data aligned to project standard
        // WAVEFORM_SAMPLES_PER_SECOND samples per second for frame-accurate alignment
        const samples = Math.ceil(duration * WAVEFORM_SAMPLES_PER_SECOND);
        const result = await this.extractWaveformAndBuffer(url, samples).catch(err => {
          console.warn("Waveform extraction failed", err);
          return { waveform: undefined, audioBuffer: undefined };
        });
        waveform = result.waveform;
        audioBuffer = result.audioBuffer;
      } else if (type === MediaType.AUDIO) {
        duration = await this.getAudioDuration(url);
        
        // Extract real waveform data aligned to project standard
        const samples = Math.ceil(duration * WAVEFORM_SAMPLES_PER_SECOND);
        const result = await this.extractWaveformAndBuffer(url, samples).catch(err => {
          console.warn("Waveform extraction failed", err);
          return { waveform: undefined, audioBuffer: undefined };
        });
        waveform = result.waveform;
        audioBuffer = result.audioBuffer;
      } else if (type === MediaType.IMAGE) {
        const metadata = await this.getImageMetadata(url);
        width = metadata.width;
        height = metadata.height;
        duration = 5;
        thumbnail = url;
      }
      
      if (waveform) {
          // ... (existing anchor logic)
      }

    } catch (e) {
      console.error("Asset processing failed", e);
    }

    return {
      id: `asset-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type,
      url,
      duration: duration || 5,
      thumbnail,
      width,
      height,
      waveform,
      audioBuffer
    };
  }

  public static async extractWaveformAndBuffer(url: string, samples = 1000): Promise<{ waveform: number[], audioBuffer: AudioBuffer | undefined }> {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return { waveform: [], audioBuffer: undefined };

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[AssetService] Failed to fetch URL: ${url}. Status: ${response.status}`);
        return { waveform: [], audioBuffer: undefined };
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioCtx = new AudioContextClass();
      
      try {
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
        return { waveform, audioBuffer };
      } finally {
        // We don't close the context here because the AudioBuffer might be tied to it in some browsers
        // and we want to keep it valid for playback in the main engine.
        // await audioCtx.close();
      }
    } catch (e) {
      console.warn("Waveform generation error:", e);
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
      video.playsInline = true;
      
      const onLoaded = () => {
        // Ensure we have valid dimensions
        if (video.videoWidth && video.videoHeight) {
            resolve({
              duration: video.duration || 0,
              width: video.videoWidth,
              height: video.videoHeight
            });
        } else {
            // Retry once if dimensions are missing? Or just resolve with 0
            // Sometimes seeking helps
            video.currentTime = 0.1;
        }
      };

      video.onloadedmetadata = onLoaded;
      
      // Fallback for some browsers that need a seek to get dimensions
      video.onseeked = () => {
         if (video.videoWidth && video.videoHeight) {
            resolve({
              duration: video.duration || 0,
              width: video.videoWidth,
              height: video.videoHeight
            });
         } else {
            resolve({ duration: video.duration || 0, width: 1920, height: 1080 }); // Default fallback
         }
      };

      video.onerror = () => resolve({ duration: 0, width: 0, height: 0 });
      
      // Timeout
      setTimeout(() => resolve({ duration: 0, width: 0, height: 0 }), 3000);
      
      video.src = url;
    });
  }

  private static getImageMetadata(url: string): Promise<{ width: number, height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = url;
    });
  }

  private static getAudioDuration(url: string): Promise<number> {
    return new Promise((resolve) => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.src = url;
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.onerror = () => resolve(0);
    });
  }

  private static generateThumbnail(url: string): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = url;
      video.muted = true;
      video.currentTime = 0.5;
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      video.onerror = () => resolve('');
    });
  }
}
