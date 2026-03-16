/**
 * KineticHeuristics.ts
 * AI-like rule engine for typography layouts.
 */

export const analyzeLayoutIntent = (words: string[]): string => {
  if (words.length === 0) return 'full-justified';
  
  const lengths = words.map(w => w.length);
  const isAscending = lengths.every((l, i) => i === 0 || l >= lengths[i - 1]);
  
  // Rule 1: Escalating word length implies a staircase
  if (isAscending && words.length > 2) return 'stairs-up';
  
  // Rule 2: Last word is massive (Hero end)
  if (words.length > 1 && lengths[lengths.length - 1] > lengths[0] * 2) return 'hero-end';
  
  return 'full-justified';
};

export const detectGravity = (text: string): 'left' | 'right' => {
  const isRtl = /[\u0590-\u05FF]/.test(text);
  const baseGravity = isRtl ? 'right' : 'left';
  
  // The Rebel Factor: 10% chance to break the rules for aesthetic variety
  if (Math.random() < 0.10) {
    return baseGravity === 'left' ? 'right' : 'left';
  }
  
  return baseGravity;
};