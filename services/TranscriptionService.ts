import { DeepgramService } from './DeepgramService';
import { Clip, MediaType, Asset, TranscriptionResult, Marker } from '../types';
import { DiagnosticsService } from './DiagnosticsService';

export class TranscriptionService {
  static async processAsset(asset: Asset, context?: string): Promise<TranscriptionResult[]> {
    try {
      DiagnosticsService.getInstance().log('info', 'TranscriptionService', `Processing asset: ${asset.name}`);
      // Fetch the asset data (assuming it's a blob URL or accessible URL)
      const response = await fetch(asset.url);
      const blob = await response.blob();
      
      // Create a File object from the blob
      const file = new File([blob], asset.name, { type: blob.type });

      // Call Deepgram via our backend proxy
      DiagnosticsService.getInstance().log('info', 'TranscriptionService', 'Calling DeepgramService.transcribeAudio');
      const result = await DeepgramService.transcribeAudio(file);
      DiagnosticsService.getInstance().log('info', 'TranscriptionService', `Transcription complete. Received ${result.length} results`);
      return result;
    } catch (error: any) {
      DiagnosticsService.getInstance().log('error', 'TranscriptionService', `Transcription failed: ${error.message}`, error);
      throw error;
    }
  }

  static convertToClips(results: TranscriptionResult[], assetId: string, trackId: string, offset: number = 0): Clip[] {
    if (!Array.isArray(results)) {
      DiagnosticsService.getInstance().log('error', 'TranscriptionService', 'convertToClips received non-array results', results);
      return [];
    }
    // Sort by start time to ensure order
    const sortedResults = [...results].sort((a, b) => a.start - b.start);

    return sortedResults.map((res, index) => {
      const start = parseFloat(String(res.start));
      const end = parseFloat(String(res.end));
      
      // Skip invalid timestamps
      if (isNaN(start)) return null;

      // Ensure duration is at least a minimum visible amount (e.g., 0.1s)
      // If end is missing or invalid, default to start + 0.5s
      const duration = Math.max(0.1, (isNaN(end) ? start + 0.5 : end) - start);
      
      return {
        id: `sub-${Date.now()}-${index}`,
        assetId: assetId, // We link to the original asset, though it's text
        startTime: start + offset,
        offset: 0, // Text clips don't really have an offset into an asset in the same way
        duration: duration,
        layer: 10, // High layer for visibility
        effects: [],
        content: res.word,
        isSilent: true, // Crucial: Prevent this clip from playing audio
        linkedClipId: undefined // Could link to the audio clip if we had its ID
      };
    }).filter((clip): clip is Clip => clip !== null);
  }

  // Added to support potential legacy calls or marker-based workflows
  static convertToMarkers(results: TranscriptionResult[], offset: number = 0): Marker[] {
    return results.map((res, index) => ({
      id: `marker-${Date.now()}-${index}`,
      time: res.start + offset,
      label: res.word,
      color: '#3B82F6' // Blue color for transcription markers
    }));
  }
}
