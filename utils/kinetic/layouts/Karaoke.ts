import { KineticSettings } from '../../../types/kinetic';

export const generateKaraoke = (words: string[], settings: KineticSettings) => {
  // Simple row layout for karaoke
  const gap = settings.gap || 2;
  const fontSize = 15; // Standard size for karaoke
  
  return words.map((text, index) => {
    // This is a very basic implementation that puts words in a row
    // In a real app, we'd handle wrapping, but for "simple layout" this works
    return {
      text,
      x: 10 + (index * 15), // Basic horizontal spacing
      y: 50,
      fontSize,
      width: 12
    };
  });
};
