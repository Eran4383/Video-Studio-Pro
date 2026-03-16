import { KineticSettings } from '../../../types/kinetic';
import { ProcessedWord } from '../KineticLayoutManager';
import { calculateVisualBounds } from '../visualBoundsCalculator';
import { calculateGutter, calculateRowScale, calculateGlobalScaleAndOffset } from './TetrisMath';
import { analyzeLayoutIntent, detectGravity } from './KineticHeuristics';

export const generateTetrisLayout = (
  words: ProcessedWord[],
  settings: KineticSettings,
  isRtl: boolean,
  screenAR: number
): any[] => {
  if (words.length === 0) return [];
  
  const { boundingBox } = settings;
  const boxWidth = 1; // Normalized 0-1
  const boxHeight = boundingBox.height / boundingBox.width; // Normalized relative to width
  
  const gutter = calculateGutter(boxWidth, 0.02);
  const intent = analyzeLayoutIntent(words.map(w => w.text));
  const gravity = detectGravity(words.map(w => w.text).join(' '));

  // 1. Measure
  const measuredWords = words.map(w => {
    const b = calculateVisualBounds({ ...w, fontSize: 100, rotation: 0 });
    return { ...w, wWidth: b.width * (100 / b.height), h: b.height };
  });

  // 2. Pack into rows (Heuristic-based)
  const rows: any[] = [];
  let i = 0;
  while (i < measuredWords.length) {
    const groupSize = intent === 'hero-end' && i === measuredWords.length - 1 ? 1 : Math.min(3, Math.floor(Math.random() * 2) + 1);
    const rowWords = measuredWords.slice(i, i + groupSize);
    i += groupSize;
    
    const wordWidths = rowWords.map(w => w.wWidth);
    const scale = calculateRowScale(wordWidths, boxWidth, gutter);
    
    rows.push({ words: rowWords, scale });
  }

  // 3. Position and Justify
  const geometricWords: any[] = [];
  let currentY = 0;
  let maxRowWidth = 0;

  rows.forEach(row => {
    let currentX = gravity === 'left' ? 0 : boxWidth;
    const rowHeight = 0.15; // Normalized base height
    
    row.words.forEach((w: any) => {
      const wWidth = w.wWidth * row.scale;
      const x = gravity === 'left' ? currentX : currentX - wWidth;
      
      geometricWords.push({
        ...w,
        x,
        y: currentY,
        fontSize: 100 * row.scale,
        width: wWidth,
        isCentered: false,
        rotation: 0
      });
      
      currentX += (gravity === 'left' ? 1 : -1) * (wWidth + gutter);
    });
    
    maxRowWidth = Math.max(maxRowWidth, Math.abs(currentX - (gravity === 'left' ? 0 : boxWidth)));
    currentY += rowHeight;
  });

  // 4. Global Restraint
  const { scale: globalScale, offsetX, offsetY } = calculateGlobalScaleAndOffset(
    maxRowWidth, currentY, boxWidth, boxHeight
  );

  // 5. Final Conversion to 0-100
  return geometricWords.map(gw => ({
    ...gw,
    x: (gw.x * globalScale + offsetX) * 100,
    y: (gw.y * globalScale + offsetY) * 100,
    width: gw.width * globalScale * 100,
    fontSize: gw.fontSize * globalScale * 100
  }));
};
