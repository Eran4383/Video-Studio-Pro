
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
   * Transcribes audio and returns word-level timestamps.
   */
  async transcribeAudio(audioBase64: string, mimeType: string, context?: string) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is missing. Please check your environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      Task: Precise Audio Transcription and Word-Level Forced Alignment
      
      Goal: Generate a JSON array of word-level timestamps that are perfectly synchronized with the audio, preventing any time drift.

      Process:
      1. IDENTIFICATION: First, listen to the entire audio to understand the flow, tempo, and content.
      2. FORCED ALIGNMENT: Extract the exact start and end time for EVERY single word.
      
      CRITICAL TIMING INSTRUCTIONS:
      - ABSOLUTE TIME: All timestamps must be calculated from the very beginning of the audio file (0.00s).
      - NO DRIFT: Ensure that words at the end of the file are just as synchronized as words at the beginning. Do not let errors accumulate.
      - CONTINUITY: Treat the audio as a single continuous stream.
      
      Output Requirements:
      - Return ONLY a JSON array of objects. No markdown, no code blocks.
      - Schema: Array<{ word: string, start: number, end: number }>
      - "start" and "end" must be numbers in seconds (float), e.g., 12.345.
      
      Context / Ground Truth:
      ${context ? `Use the following text as the strict ground truth for spelling and word order. Align the audio to this text:\n"${context}"` : "No text provided. Transcribe exactly what is heard."}
      
      Handling Edge Cases:
      - If a word is sung or elongated, "start" is when it begins and "end" is when it fully finishes.
      - Background vocals: Include them if distinct, prefixed with (bg).
      - Silence/Instrumentals: Do not generate words for these sections.
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
