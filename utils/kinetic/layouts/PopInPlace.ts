import { KineticSettings } from '../../../types/kinetic';
import { measureText } from '../kineticTextMeasure';

export const generatePopInPlace = (
  words: string[],
  settings: KineticSettings
): any[] => {
  if (words.length === 0) return [];

  const { boundingBox, primaryFont } = settings;
  const font = primaryFont || 'Inter, sans-serif';

  // Reference font size for measurements
  const REF_FONT_SIZE = 100;

  // Find the widest word at reference font size
  let maxRefWidth = 0;
  words.forEach(word => {
    const { width } = measureText(word, font, REF_FONT_SIZE);
    if (width > maxRefWidth) maxRefWidth = width;
  });

  // Calculate font size to fit bounding box width
  // boxPixelWidth = boundingBox.width * 1920
  const boxPixelWidth = boundingBox.width * 1920;
  const boxPixelHeight = boundingBox.height * 1080;
  
  // targetFontSizePx / REF_FONT_SIZE = boxPixelWidth / maxRefWidth
  const targetFontSizePx = (boxPixelWidth / maxRefWidth) * REF_FONT_SIZE;
  
  // Cap at 80% of box height to avoid vertical overflow
  const finalFontSizePx = Math.min(targetFontSizePx, boxPixelHeight * 0.8);
  
  // Convert to percentage of box height (0-100) for KineticLayoutManager
  const fontSizePercent = (finalFontSizePx / boxPixelHeight) * 100;

  return words.map((text) => ({
    text,
    x: 50, // Center X in percentage (50% of box width)
    y: 50, // Center Y in percentage (50% of box height)
    fontSize: fontSizePercent,
    width: 100
  }));
};
