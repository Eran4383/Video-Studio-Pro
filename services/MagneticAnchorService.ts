
import { Asset } from '../types';

export interface AnchorPoint {
  time: number; // Time in seconds relative to asset start
  amplitude: number;
}

export class MagneticAnchorService {
  /**
   * Analyzes an asset's waveform to find "anchors" (onsets of sound after silence).
   * @param asset The asset to analyze
   * @param threshold Minimum amplitude to be considered "sound" (0.0 to 1.0)
   * @param silenceDuration Minimum duration of silence before a sound to trigger an anchor (in samples)
   */
  static detectAnchors(asset: Asset, threshold: number = 0.05, silenceDuration: number = 5): number[] {
    if (!asset.waveform || asset.waveform.length === 0) return [];

    const waveform = asset.waveform;
    const duration = asset.duration;
    const samplesCount = waveform.length / 2;
    const anchors: number[] = [];

    let isSilent = true;
    let silenceCounter = 0;

    for (let i = 0; i < samplesCount; i++) {
      const min = waveform[i * 2];
      const max = waveform[i * 2 + 1];
      const amp = Math.max(Math.abs(min), Math.abs(max));
      
      if (amp < threshold) {
        silenceCounter++;
        if (silenceCounter >= silenceDuration) {
          isSilent = true;
        }
      } else {
        // We found sound!
        if (isSilent) {
          // It was silent before, so this is an onset (anchor)
          const time = (i / samplesCount) * duration;
          anchors.push(time);
        }
        isSilent = false;
        silenceCounter = 0;
      }
    }

    return anchors;
  }

  /**
   * Finds the nearest anchor to a given time.
   */
  static findNearestAnchor(time: number, anchors: number[], threshold: number = 0.01): number | null {
    if (anchors.length === 0) return null;

    let nearest = anchors[0];
    let minDiff = Math.abs(time - nearest);

    for (const anchor of anchors) {
      const diff = Math.abs(time - anchor);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = anchor;
      }
    }

    return minDiff <= threshold ? nearest : null;
  }
}
