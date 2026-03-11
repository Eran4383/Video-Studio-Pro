import { Clip } from '../../types';
import { KineticWord, KineticBlock } from '../../types/kinetic';
import { measureText } from './kineticTextMeasure';

export const generateKineticLayout = (clip: Clip, preset: { colors: string[], animation: string }): KineticWord[] => {
  if (!clip.content || !clip.kineticData?.settings?.boundingBox) return [];

  const { boundingBox, primaryFont, direction } = clip.kineticData.settings;
  const words = clip.content.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return [];

  const durationPerWord = clip.duration / words.length;
  // Detect RTL if direction is auto or rtl
  const isRTL = direction === 'rtl' || (direction === 'auto' && /[\u0590-\u05FF]/.test(clip.content));

  // Use a virtual canvas size for calculations
  const CANVAS_WIDTH = 1920;
  const CANVAS_HEIGHT = 1080;

  // Convert bounding box percentages to pixels
  const bbox = {
    x: boundingBox.x * CANVAS_WIDTH,
    y: boundingBox.y * CANVAS_HEIGHT,
    width: boundingBox.width * CANVAS_WIDTH,
    height: boundingBox.height * CANVAS_HEIGHT
  };

  // Determine font size based on bounding box height (e.g., 1/4 of height)
  // This is a heuristic; could be adjusted based on word count/density
  const fontSizePx = bbox.height / 4; 
  const lineHeight = fontSizePx * 1.2;
  const spacing = fontSizePx * 0.3;

  let currentX = isRTL ? bbox.x + bbox.width : bbox.x;
  let currentY = bbox.y + fontSizePx; // Start at baseline (approx)

  const kineticWords: KineticWord[] = [];

  words.forEach((word, index) => {
    const { width } = measureText(word, primaryFont || 'Inter, sans-serif', fontSizePx);
    
    let xPos = 0;
    let yPos = currentY;

    if (isRTL) {
      // Check if word fits in current line
      if (currentX - width < bbox.x) {
        // Wrap to next line
        currentX = bbox.x + bbox.width;
        currentY += lineHeight;
        yPos = currentY;
      }
      xPos = currentX - width;
      currentX -= (width + spacing);
    } else {
      // Check if word fits in current line
      if (currentX + width > bbox.x + bbox.width) {
        // Wrap to next line
        currentX = bbox.x;
        currentY += lineHeight;
        yPos = currentY;
      }
      xPos = currentX;
      currentX += (width + spacing);
    }

    // Convert back to percentage (0-1) relative to screen
    const topY = yPos - (fontSizePx * 0.8);
    
    kineticWords.push({
      id: `word-${index}-${Date.now()}`,
      text: word,
      startTime: index * durationPerWord, // Relative to clip start
      endTime: (index + 1) * durationPerWord, // Relative to clip start
      sourceClipId: clip.id,
      fontSize: fontSizePx / CANVAS_HEIGHT, // Store as percentage of screen height
      color: preset.colors[index % preset.colors.length],
      fontFamily: primaryFont || 'Inter, sans-serif',
      animation: preset.animation as any,
      position: { 
        x: xPos / CANVAS_WIDTH, 
        y: topY / CANVAS_HEIGHT 
      },
      sceneEndTime: clip.duration
    });
  });

  return kineticWords;
};
