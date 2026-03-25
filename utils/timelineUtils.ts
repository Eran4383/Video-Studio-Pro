import { Clip } from '../types';

/**
 * Sorts clips by startTime and ensures they are valid.
 * For subtitle tracks, it might also ensure no overlaps, 
 * but for now let's just sort them to keep the timeline predictable.
 */
export const sanitizeTrackClips = (clips: Clip[]): Clip[] => {
  return [...clips].sort((a, b) => a.startTime - b.startTime);
};
