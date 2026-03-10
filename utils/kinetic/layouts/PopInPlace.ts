import { KineticSettings } from '../../../types/kinetic';
import { measureText } from '../kineticTextMeasure';

export const generatePopInPlace = (
  words: string[],
  settings: KineticSettings
): any[] => {
  if (words.length === 0) return [];

  const { boundingBox, primaryFont } = settings;
  const font = primaryFont || 'Inter, sans-serif';

  // Screen aspect ratio constant
  const SCREEN_AR = 1920 / 1080;
  
  // Bounding box aspect ratio in screen space
  const boxAR = (boundingBox.width * SCREEN_AR) / boundingBox.height;

  // Reference font size for measurements
  const REF_FONT_SIZE = 100;

  // Find the word with the maximum aspect ratio (width/height)
  let maxWordAR = 0;
  words.forEach(word => {
    const { width, height } = measureText(word, font, REF_FONT_SIZE);
    const wordAR = width / height;
    if (wordAR > maxWordAR) maxWordAR = wordAR;
  });

  // Calculate font size in cqh (percentage of box height)
  // We want: wordWidth <= boxWidth
  // wordWidth = fontSize * wordAR
  // boxWidth = 100 * boxAR (if fontSize is in % of box height)
  // So: fontSize * wordAR <= 100 * boxAR  =>  fontSize <= 100 * (boxAR / wordAR)
  
  const calculatedFontSize = Math.min(100, 100 * (boxAR / maxWordAR));
  
  // Apply 100% width usage
  const finalFontSize = calculatedFontSize;

  return words.map((text) => ({
    text,
    x: 50, // Center X in percentage (50% of box width)
    y: 50, // Center Y in percentage (50% of box height)
    fontSize: finalFontSize,
    width: 100
  }));
};
