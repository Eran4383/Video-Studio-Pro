import { TranscriptionResult } from '../types';
import { AudioUtils } from './AudioUtils';
import { DiagnosticsService } from './DiagnosticsService';

export interface DeepgramOptions {
  model?: 'nova-2' | 'general' | 'whisper';
  smart_format?: boolean;
  diarize?: boolean;
  punctuate?: boolean;
  utterances?: boolean;
  keywords?: string[];
  context?: string;
}

export class DeepgramService {
  private static async getTemporaryKey(): Promise<string> {
    const response = await fetch('/api/deepgram-token');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get temporary Deepgram key');
    }
    const data = await response.json();
    return data.key;
  }

  static async transcribeAudio(file: File, options: DeepgramOptions = {}): Promise<TranscriptionResult[]> {
    try {
      DiagnosticsService.getInstance().log('info', 'DeepgramService', `Starting transcription for file: ${file.name}`, { size: file.size, type: file.type, options });
      
      // 1. Extract and compress audio (client-side)
      DiagnosticsService.getInstance().log('info', 'DeepgramService', 'Calling AudioUtils.extractAndCompressAudio');
      const compressedAudioBlob = await AudioUtils.extractAndCompressAudio(file);
      DiagnosticsService.getInstance().log('info', 'DeepgramService', `Audio ready. Size: ${compressedAudioBlob.size}`);

      // 2. Get temporary API key from backend
      const apiKey = await this.getTemporaryKey();

      // 3. Upload directly to Deepgram API
      const params = new URLSearchParams({
        model: options.model || 'nova-2',
        smart_format: String(options.smart_format !== false), // Default true
        punctuate: String(options.punctuate !== false),       // Default true
        diarize: String(!!options.diarize),                   // Default false
        utterances: String(!!options.utterances),             // Default false
        words: 'true'                                         // Always true for timestamps
      });

      if (options.keywords && options.keywords.length > 0) {
        options.keywords.forEach(k => params.append('keywords', k));
      }

      // Add context for forced alignment if provided
      // Note: Deepgram context is passed as a query parameter 'context' or 'extra' depending on version, 
      // but for Nova-2 it's usually supported via 'context' or 'keywords' for boosting. 
      // However, the user specifically requested &context=${encodeURIComponent(textFromGemini)}.
      // We will append it to the params.
      if (options.context) {
        // Truncate if too long? Deepgram might have limits. 
        // For now we pass it as requested.
        params.append('context', options.context);
      }

      const url = `https://api.deepgram.com/v1/listen?${params.toString()}`;
      DiagnosticsService.getInstance().log('info', 'DeepgramService', `Calling URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': compressedAudioBlob.type,
        },
        body: compressedAudioBlob,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deepgram API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      // Parse Deepgram response
      if (!data.results || !data.results.channels || !data.results.channels[0].alternatives || !data.results.channels[0].alternatives[0].words) {
        throw new Error('Invalid response from Deepgram API');
      }

      const words = data.results.channels[0].alternatives[0].words;
      
      if (!Array.isArray(words)) {
        console.warn('Deepgram returned words but it is not an array:', words);
        return [];
      }

      return words.map((word: any) => ({
        word: word.punctuated_word || word.word,
        start: word.start,
        end: word.end,
        confidence: word.confidence,
      }));

    } catch (error) {
      console.error('Deepgram Service Error:', error);
      throw error;
    }
  }
}
