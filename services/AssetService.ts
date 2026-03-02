
import { Asset, MediaType } from '../types';

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
    let waveform: number[] | undefined = undefined;

    try {
      if (type === MediaType.VIDEO || type === MediaType.AUDIO) {
        duration = await Promise.race([
          this.getMediaDuration(url),
          new Promise<number>((_, reject) => setTimeout(() => reject('Timeout'), 5000))
        ]).catch(() => (type === MediaType.VIDEO ? 10 : 0));

        if (type === MediaType.VIDEO) {
          thumbnail = await this.generateThumbnail(url).catch(() => '');
        }
        
        // Extract real waveform data with high fidelity (1000 samples)
        waveform = await this.extractWaveform(url, 1000).catch(err => {
          console.warn("Waveform extraction failed", err);
          return undefined;
        });
      } else if (type === MediaType.IMAGE) {
        duration = 5;
        thumbnail = url;
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
      waveform
    };
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
