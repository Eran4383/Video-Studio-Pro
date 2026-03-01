
import { Asset, MediaType } from '../types';

export class AssetService {
  static async processFile(file: File): Promise<Asset> {
    console.log("Processing file:", file.name, file.type);
    const url = URL.createObjectURL(file);
    
    // Improved type detection
    let type = MediaType.IMAGE;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Check MIME type first, then extension
    if (file.type.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm', 'ts', 'm4v'].includes(ext)) {
      type = MediaType.VIDEO;
    } else if (file.type.startsWith('audio/') || ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac', 'wma'].includes(ext)) {
      type = MediaType.AUDIO;
    } else if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(ext)) {
      type = MediaType.IMAGE;
    }
    
    console.log("Detected type:", type);

    let duration = 0;
    let thumbnail = '';
    let waveform: number[] | undefined = undefined;

    try {
      if (type === MediaType.VIDEO || type === MediaType.AUDIO) {
        // Get duration with timeout
        console.log("Getting duration...");
        duration = await Promise.race([
          this.getMediaDuration(url),
          new Promise<number>((resolve) => setTimeout(() => resolve(type === MediaType.VIDEO ? 10 : 0), 5000))
        ]).catch((e) => {
            console.warn("Duration check failed", e);
            return type === MediaType.VIDEO ? 10 : 0;
        });
        console.log("Duration:", duration);

        if (type === MediaType.VIDEO) {
          console.log("Generating thumbnail...");
          thumbnail = await Promise.race([
              this.generateThumbnail(url),
              new Promise<string>((resolve) => setTimeout(() => resolve(''), 5000))
          ]).catch((e) => {
              console.warn("Thumbnail generation failed", e);
              return '';
          });
          console.log("Thumbnail generated");
        }
        
        // Extract real waveform data with high fidelity (1000 samples)
        // We wrap this in a separate try/catch to ensure it doesn't fail the whole import
        try {
           console.log("Extracting waveform...");
           waveform = await this.extractWaveform(url, 1000);
           console.log("Waveform extracted");
        } catch (err) {
           console.warn("Waveform extraction failed, using silence", err);
           waveform = undefined;
        }
      } else if (type === MediaType.IMAGE) {
        duration = 5;
        thumbnail = url;
      }
    } catch (e) {
      console.error("Asset processing failed", e);
      // Fallback values
      duration = duration || 5;
    }

    const asset = {
      id: `asset-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type,
      url,
      duration: duration || 5,
      thumbnail,
      waveform
    };
    console.log("Asset created:", asset);
    return asset;
  }

  private static async extractWaveform(url: string, samples = 1000): Promise<number[]> {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return [];

      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioCtx = new AudioContextClass();
      
      try {
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        const blockSize = Math.floor(channelData.length / samples);
        const waveform: number[] = [];
        
        for (let i = 0; i < samples; i++) {
          let max = 0;
          for (let j = 0; j < blockSize; j++) {
            if (i * blockSize + j < channelData.length) {
              const val = Math.abs(channelData[i * blockSize + j]);
              if (val > max) max = val;
            }
          }
          waveform.push(Math.min(1, max * 1.5)); 
        }
        return waveform;
      } finally {
        await audioCtx.close();
      }
    } catch (e) {
      console.warn("Waveform generation error:", e);
      return [];
    }
  }

  private static getMediaDuration(url: string): Promise<number> {
    return new Promise((resolve) => {
      const media = document.createElement('video');
      media.preload = 'metadata';
      media.src = url;
      media.onloadedmetadata = () => resolve(media.duration);
      media.onerror = () => resolve(0);
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
