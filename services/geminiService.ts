
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
    // Create a new GoogleGenAI instance right before the call to ensure the latest selected API key is used.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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
    // Create a new instance right before making an API call for up-to-date configuration.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
   * Transcribes audio to plain text using gemini-1.5-flash.
   * Used for the first step of the hybrid transcription strategy.
   */
  async generatePlainTextTranscription(audioBase64: string, mimeType: string): Promise<string> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is missing.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = "Transcribe the following audio file into plain text. Do not include timestamps, speaker labels, or any other metadata. Just the spoken/sung words. Return ONLY the text.";

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType, data: audioBase64 } },
            { text: prompt }
          ]
        }
      });

      return response.text || '';
    } catch (error: any) {
      console.error("Gemini Plain Text Transcription Error:", error);
      throw new Error(error.message || "Unknown Gemini API error");
    }
  }

  /**
   * Transcribes audio and returns word-level timestamps.
   */
  async transcribeAudio(audioBase64: string, mimeType: string, context?: string) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is missing. Please check your environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      Task: High-Precision Audio Transcription with Exact Timestamps
      
      Goal: Transcribe the audio and provide exact start and end times for EVERY word.
      
      CRITICAL INSTRUCTIONS:
      1. ACCURACY: Transcribe exactly what is heard. Do not paraphrase.
      2. TIMING: 
         - "start" must be the exact second the word begins (e.g., 1.24).
         - "end" must be the exact second the word ends.
         - If there is silence or music before the first word, the "start" time MUST reflect that delay. Do NOT start at 0.0 unless the word actually starts at 0.0.
      3. CONTINUITY: Ensure the timeline is continuous. Do not reset timestamps.
      4. FORMAT: Return ONLY a JSON array.
      
      Schema: Array<{ word: string, start: number, end: number }>
      
      Context / Ground Truth:
      ${context ? `Use this text as the ground truth for spelling/order:\n"${context}"` : "No text provided."}
      
      Edge Cases:
      - Instrumental sections: Do NOT generate words.
      - Background vocals: Include if distinct.
    `;

    try {
      const response = await ai.models.generateContent({
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
      console.error("Gemini API Error:", error);
      throw new Error(error.message || "Unknown Gemini API error");
    }
  }
}
