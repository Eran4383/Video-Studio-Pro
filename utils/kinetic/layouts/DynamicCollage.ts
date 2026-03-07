import { KineticSettings } from '../../../types/kinetic';
import { measureText } from '../kineticTextMeasure';

interface GeometricWord {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

export const generateDynamicCollage = (wordsText: string[], settings: KineticSettings): GeometricWord[] => {
  const { primaryFont, gap } = settings;
  const gapPct = (gap || 0) / 100;

  // 1. Measure Aspect Ratios
  const measureSize = 100; 
  const wordMetrics = wordsText.map(text => {
    const { width, height } = measureText(text, primaryFont || 'Inter', measureSize);
    return { text, ar: width / height };
  });

  // 2. Group into lines (1-3 words)
  const lines: { text: string, ar: number }[][] = [];
  let i = 0;
  while (i < wordMetrics.length) {
    const count = Math.min(Math.floor(Math.random() * 3) + 1, wordMetrics.length - i);
    lines.push(wordMetrics.slice(i, i + count));
    i += count;
  }

  // 3. Calculate Geometry per line
  let currentY = 0;
  const lineGeometries: { y: number, height: number, words: GeometricWord[] }[] = [];

  lines.forEach((lineWords) => {
    const totalAR = lineWords.reduce((sum, w) => sum + w.ar, 0);
    const gapsCount = Math.max(0, lineWords.length - 1);
    const totalGapWidth = gapsCount * gapPct;
    
    // Available width for content (assuming container width = 1.0)
    const availableWidth = Math.max(0.1, 1.0 - totalGapWidth);
    
    // Height of this line to make it fit width 1.0 exactly: W = h * totalAR => h = W / totalAR
    const lineHeight = availableWidth / totalAR;
    
    let currentX = 0;
    const lineResultWords: GeometricWord[] = [];
    
    lineWords.forEach((w) => {
      const wordWidth = lineHeight * w.ar;
      
      lineResultWords.push({
        text: w.text,
        x: currentX,
        y: currentY,
        width: wordWidth,
        height: lineHeight,
        fontSize: lineHeight // fontSize roughly equals line height
      });
      
      currentX += wordWidth + gapPct;
    });
    
    lineGeometries.push({ y: currentY, height: lineHeight, words: lineResultWords });
    currentY += lineHeight + gapPct;
  });

  // 4. Global Scale to fit Height
  // Remove last gap from total height
  const totalHeight = Math.max(0.1, currentY - gapPct);
  
  // Scale down if too tall, or center if too short
  // We want to fit within 1.0 height.
  let scale = 1.0;
  if (totalHeight > 1.0) {
    scale = 1.0 / totalHeight;
  }
  
  // Center vertically
  const finalContentHeight = totalHeight * scale;
  const offsetY = (1.0 - finalContentHeight) / 2;
  
  // Center horizontally if scaled down (width becomes < 1.0)
  // Since we packed to width 1.0, scaling by S makes width S.
  const offsetX = (1.0 - scale) / 2;

  const finalWords: GeometricWord[] = [];
  
  lineGeometries.forEach(line => {
    line.words.forEach(w => {
      finalWords.push({
        text: w.text,
        x: (w.x * scale) + offsetX,
        y: (w.y * scale) + offsetY,
        width: w.width * scale,
        height: w.height * scale,
        fontSize: w.fontSize * scale
      });
    });
  });

  return finalWords;
};
