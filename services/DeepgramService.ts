import { TranscriptionResult } from '../types';
import { AudioUtils } from './AudioUtils';

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

  static async transcribeAudio(file: File): Promise<TranscriptionResult[]> {
    try {
      console.log('DeepgramService.transcribeAudio started for:', file.name);
      // 1. Extract and compress audio (client-side)
      console.log('Calling AudioUtils.extractAndCompressAudio');
      const compressedAudioBlob = await AudioUtils.extractAndCompressAudio(file);
      console.log('AudioUtils.extractAndCompressAudio returned blob:', compressedAudioBlob.size);

      // 2. Get temporary API key from backend
      const apiKey = await this.getTemporaryKey();

      // 3. Upload directly to Deepgram API
      const url = 'https://api.deepgram.com/v1/listen?smart_format=true&punctuate=true&diarize=false&model=nova-2';
      
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
        word: word.word,
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
