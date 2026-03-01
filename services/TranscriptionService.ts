import { DeepgramService, DeepgramOptions } from './DeepgramService';
import { GeminiService } from './geminiService';
import { Clip, MediaType, Asset, TranscriptionResult, Marker } from '../types';
import { DiagnosticsService } from './DiagnosticsService';

export class TranscriptionService {
  static async processAsset(asset: Asset, context?: string, options?: DeepgramOptions): Promise<TranscriptionResult[]> {
    try {
      DiagnosticsService.getInstance().log('info', 'TranscriptionService', `Processing asset: ${asset.name}`, options);
      
      // 1. Fetch the asset data
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const file = new File([blob], asset.name, { type: blob.type });

      // 2. Convert to Base64 for Gemini
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            // Remove the data URL prefix (e.g., "data:audio/wav;base64,")
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          } else {
            reject(new Error('Failed to convert blob to base64'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      // 3. Step 1: Get plain text from Gemini (Hybrid Strategy)
      DiagnosticsService.getInstance().log('info', 'TranscriptionService', 'Step 1: Calling Gemini for plain text transcription...');
      let plainText = context || '';
      
      if (!plainText) {
        try {
          plainText = await GeminiService.getInstance().generatePlainTextTranscription(base64Audio, blob.type);
          DiagnosticsService.getInstance().log('info', 'TranscriptionService', `Gemini transcription complete. Length: ${plainText.length} chars`);
        } catch (geminiError: any) {
           DiagnosticsService.getInstance().log('error', 'TranscriptionService', `Gemini transcription failed: ${geminiError.message}. Falling back to Deepgram only.`);
           // Fallback: Proceed without context if Gemini fails
        }
      } else {
        DiagnosticsService.getInstance().log('info', 'TranscriptionService', 'Using provided context (forced alignment script).');
      }

      // 4. Step 2: Call Deepgram with context (Forced Alignment)
      DiagnosticsService.getInstance().log('info', 'TranscriptionService', 'Step 2: Calling Deepgram with context...');
      
      const deepgramOptions: DeepgramOptions = {
        ...options,
        context: plainText // Pass the Gemini text (or user script) as context
      };

      const result = await DeepgramService.transcribeAudio(file, deepgramOptions);
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

      // Calculate duration based on exact timestamps
      // If end is missing, default to start + 0.3s (average word length)
      // We enforce a tiny minimum (0.05s) just to ensure the clip exists in the UI
      let duration = 0.3;
      if (!isNaN(end) && end > start) {
        duration = end - start;
      }
      
      // Ensure we don't have zero or negative duration clips which break the timeline
      duration = Math.max(0.05, duration);
      
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
