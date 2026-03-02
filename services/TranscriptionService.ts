import { GeminiService } from './geminiService';
import { Clip, MediaType, Asset } from '../types';

export interface TranscriptionResult {
  word: string;
  start: number;
  end: number;
}

export class TranscriptionService {
  static async processAsset(asset: Asset, context?: string): Promise<TranscriptionResult[]> {
    try {
      // Fetch the asset data (assuming it's a blob URL or accessible URL)
      const response = await fetch(asset.url);
      const blob = await response.blob();
      
      // Convert to Base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(blob);
      });

      // Call Gemini
      return await GeminiService.getInstance().transcribeAudio(base64, blob.type, context);
    } catch (error) {
      console.error("Transcription failed:", error);
      throw error;
    }
  }

  static convertToClips(results: TranscriptionResult[], assetId: string, trackId: string, offset: number = 0): Clip[] {
    return results.map((res, index) => {
      // Ensure duration is at least a minimum visible amount (e.g., 0.1s)
      const duration = Math.max(0.1, res.end - res.start);
      return {
        id: `sub-${Date.now()}-${index}`,
        assetId: assetId, // We link to the original asset, though it's text
        startTime: res.start + offset,
        offset: 0, // Text clips don't really have an offset into an asset in the same way
        duration: duration,
        layer: 10, // High layer for visibility
        effects: [],
        content: res.word,
        isSilent: true, // Crucial: Prevent this clip from playing audio
        linkedClipId: undefined // Could link to the audio clip if we had its ID
      };
    });
  }
}
