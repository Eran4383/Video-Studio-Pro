/**
 * KineticHeuristics.ts
 * Decision-making functions for kinetic typography layout intent.
 */

export const analyzeLayoutIntent = (words: string[]): string => {
  if (words.length === 0) return 'full-justified';
  
  const lastWord = words[words.length - 1];
  const avgLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  
  if (lastWord.length > avgLength * 1.5) return 'hero-end';
  
  const increasing = words.every((w, i) => i === 0 || w.length > words[i - 1].length);
  return increasing && words.length > 2 ? 'stairs-up' : 'full-justified';
};

export const detectGravity = (text: string): 'left' | 'right' => {
  return /[\u0591-\u05F4]/.test(text) ? 'right' : 'left';
};
