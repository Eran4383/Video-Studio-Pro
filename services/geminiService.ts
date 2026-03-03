
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private static instance: GeminiService;
  
  private constructor() {}

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  /**
   * Generates a video using Veo 3.1.
   * Note: Veo models require a user-selected paid API key from a billing-enabled project.
   */
  async generateVideo(prompt: string, aspectRatio: '16:9' | '9:16' = '16:9') {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is missing. Please check your environment variables.");
    }

    // Create a new GoogleGenAI instance right before the call to ensure the latest selected API key is used.
    const ai = new GoogleGenAI({ apiKey });
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });

    while (!operation.done) {
      // Poll every 5 seconds as video generation is a long-running process.
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("Video generation completed but no video URI was found.");
    }

    // The download link requires an API key to fetch the MP4 bytes.
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch generated video: ${response.statusText}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  /**
   * Uses Gemini 3 Pro to generate a script or analyze video content with reasoning capabilities.
   */
  async analyzeContent(prompt: string) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is missing. Please check your environment variables.");
    }

    // Create a new instance right before making an API call for up-to-date configuration.
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        // High-quality reasoning for complex creative tasks.
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });
    
    // Use the .text property directly to extract output.
    return response.text || '';
  }

  /**
   * Transcribes audio and returns word-level timestamps.
   */
  async transcribeAudio(audioBase64: string, mimeType: string, context?: string, signal?: AbortSignal) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is missing. Please check your environment variables.");
    }

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      Task: Precise Audio Transcription and Word-Level Alignment
      
      Instructions:
      1. Analyze the provided audio file with high precision.
      2. Return a JSON array of objects. Each object represents a single spoken word.
      3. Required keys: "word" (string), "start" (number, seconds), "end" (number, seconds).
      4. CRITICAL: The "start" and "end" times must be EXACT. 
         - If a word is elongated (e.g., "FREEEEEEEEE"), the "end" time must reflect the full duration of the utterance.
         - Do not just mark the start; mark the entire duration the word is audible.
      5. ${context ? `GUIDED ALIGNMENT MODE:
         - The user has provided a script/lyrics below. Use this as the GROUND TRUTH for spelling and word order.
         - Script: "${context}"
         - Your goal is to align this text to the audio.
         - If the audio deviates (ad-libs, different words), transcribe what is actually heard, but prefer the script's spelling.
         - Handle singing or spoken dubbing by finding the precise start/end times for each syllable/word.
         - If there are background vocals/backing singers, include them if they are distinct words, but DO NOT add any prefixes or markers.` 
         : 'PURE TRANSCRIPTION MODE: Transcribe every spoken word accurately. Do not include background markers or non-verbal cues.'}
      6. Output ONLY valid JSON. No markdown formatting.
    `;

    try {
      const generatePromise = ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            { inlineData: { mimeType, data: audioBase64 } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: 'application/json'
        }
      });

      let response;
      if (signal) {
        const abortPromise = new Promise<never>((_, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
        response = await Promise.race([generatePromise, abortPromise]);
      } else {
        response = await generatePromise;
      }

      if (!response.text) {
        throw new Error("No response text received from Gemini.");
      }

      try {
        return JSON.parse(response.text);
      } catch (jsonError) {
        console.error("Failed to parse JSON response:", response.text);
        throw new Error("Invalid JSON response from AI. See console for details.");
      }
    } catch (error: any) {
      if (error.name === 'AbortError') throw error;
      console.error("Gemini API Error:", error);
      throw new Error(error.message || "Unknown Gemini API error");
    }
  }
}
