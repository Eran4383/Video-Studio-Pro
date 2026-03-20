
/**
 * WaveformAnalyzer handles the mathematical analysis of AudioBuffers.
 * It generates decimated peak data for efficient rendering and future analysis.
 */
export interface WaveformData {
  peaks: Float32Array; // Interleaved [min, max, min, max...]
  rms: Float32Array;   // Root Mean Square (energy), useful for beat detection
  resolution: number;  // Samples per second
}

class WaveformAnalyzer {
  private cache: Map<string, Map<number, WaveformData>> = new Map();

  /**
   * Generates decimated waveform data from an AudioBuffer.
   * @param assetId Unique ID for caching
   * @param buffer The source AudioBuffer
   * @param samplesPerSecond Desired resolution (e.g., 100 for overview, or project FPS)
   */
  public getWaveformData(assetId: string, buffer: AudioBuffer, samplesPerSecond: number): WaveformData {
    // Check cache first
    const assetCache = this.cache.get(assetId) || new Map<number, WaveformData>();
    if (assetCache.has(samplesPerSecond)) {
      return assetCache.get(samplesPerSecond)!;
    }

    const duration = buffer.duration;
    const totalOutputSamples = Math.ceil(duration * samplesPerSecond);
    const rawData = buffer.getChannelData(0); // Analyze first channel for visualization
    const samplesPerBlock = Math.floor(buffer.sampleRate / samplesPerSecond);
    
    const peaks = new Float32Array(totalOutputSamples * 2);
    const rms = new Float32Array(totalOutputSamples);

    for (let i = 0; i < totalOutputSamples; i++) {
      const start = i * samplesPerBlock;
      const end = Math.min(start + samplesPerBlock, rawData.length);
      
      let min = 0;
      let max = 0;
      let sumOfSquares = 0;
      let count = 0;

      // Decimation loop: find min/max and energy in this block
      for (let j = start; j < end; j++) {
        const val = rawData[j];
        if (val < min) min = val;
        if (val > max) max = val;
        sumOfSquares += val * val;
        count++;
      }

      // Store interleaved peaks [min, max, min, max...]
      peaks[i * 2] = min;
      peaks[i * 2 + 1] = max;
      
      // Store RMS (Root Mean Square) for future beat detection
      rms[i] = count > 0 ? Math.sqrt(sumOfSquares / count) : 0;
    }

    const data: WaveformData = { peaks, rms, resolution: samplesPerSecond };
    
    // Save to cache
    assetCache.set(samplesPerSecond, data);
    this.cache.set(assetId, assetCache);

    return data;
  }

  /**
   * Clears analysis cache for a specific asset or all assets.
   */
  public clearCache(assetId?: string): void {
    if (assetId) {
      this.cache.delete(assetId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Helper to get a specific slice of peaks for a clip.
   * Useful for Phase 3 rendering.
   */
  public getClipPeaks(
    assetId: string, 
    buffer: AudioBuffer, 
    offset: number, 
    duration: number, 
    resolution: number
  ): Float32Array {
    const data = this.getWaveformData(assetId, buffer, resolution);
    const startIdx = Math.floor(offset * resolution) * 2;
    const endIdx = Math.ceil((offset + duration) * resolution) * 2;
    
    // Return a view of the array to avoid allocations
    return data.peaks.subarray(
      Math.max(0, startIdx), 
      Math.min(data.peaks.length, endIdx)
    );
  }
}

export const waveformAnalyzer = new WaveformAnalyzer();
