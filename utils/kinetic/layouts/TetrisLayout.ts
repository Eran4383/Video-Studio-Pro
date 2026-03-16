import { KineticSettings } from '../../../types/kinetic';
import { ProcessedWord } from '../KineticLayoutManager';
import { calculateVisualBounds } from '../visualBoundsCalculator';
import { calculateGutter, calculateRowScale, calculateGlobalScaleAndOffset } from './TetrisMath';
import { analyzeLayoutIntent, detectGravity } from './KineticHeuristics';

interface TetrisWord extends ProcessedWord {
  wWidth: number;
  h: number;
  originalWidth: number;
  originalHeight: number;
  rotation: number;
}

export const generateTetrisLayout = (
  words: ProcessedWord[],
  settings: KineticSettings,
  isRtl: boolean,
  screenAR: number
): any[] => {
  if (words.length === 0) return [];

  const { boundingBox } = settings;
  const boxWidth = boundingBox.width;
  const boxHeight = boundingBox.height;

  const gutter = calculateGutter(boxWidth, 0.02);
  const vGutter = 0.015 * boxWidth;
  const intent = analyzeLayoutIntent(words.map(w => w.text));
  const gravity = detectGravity(words.map(w => w.text).join(' '));

  // 1. Measure strictly with original bounds stored
  const measuredWords: TetrisWord[] = words.map(w => {
    const b = calculateVisualBounds({ ...w, fontSize: 100, rotation: 0 });
    const origW = b.width * (100 / Math.max(b.height, 0.001));
    return { 
        ...w, 
        wWidth: origW, 
        h: 100, 
        originalWidth: origW, 
        originalHeight: 100, 
        rotation: 0 
    };
  });

  // 2. Pack into rows
  const rows: any[] = [];
  let i = 0;
  while (i < measuredWords.length) {
    const groupSize = intent === 'hero-end' && i === measuredWords.length - 1 ? 1 : Math.min(3, Math.floor(Math.random() * 2) + 1);
    const rowWords = measuredWords.slice(i, i + groupSize);
    i += groupSize;

    // Rotation logic - swap virtual bounds for the grid, but keep original bounds intact
    rowWords.forEach(w => {
      if (Math.random() < 0.15) {
        w.rotation = Math.random() < 0.5 ? 90 : 270;
        w.wWidth = w.originalHeight;
        w.h = w.originalWidth;
      }
    });

    const wordWidths = rowWords.map(w => w.wWidth);
    const scale = calculateRowScale(wordWidths, boxWidth, gutter);

    rows.push({ words: rowWords, scale, maxHeight: Math.max(...rowWords.map(w => w.h)) });
  }

  // 3. Position and Justify (Using Center-Point math for robust rotation)
  const geometricWords: any[] = [];
  let currentY = 0;
  let maxRowWidth = 0;

  rows.forEach(row => {
    let currentX = gravity === 'left' ? 0 : boxWidth;

    row.words.forEach((w: TetrisWord) => {
      const cellWidth = w.wWidth * row.scale;
      const cellHeight = w.h * row.scale;
      
      const cellX = gravity === 'left' ? currentX : currentX - cellWidth;
      const cellY = currentY + (row.maxHeight * row.scale - cellHeight) / 2;

      // Center of the layout cell
      const cx = cellX + cellWidth / 2;
      const cy = cellY + cellHeight / 2;

      // Actual visual bounds of the word container (unrotated)
      const actualWidth = w.originalWidth * row.scale;
      const actualHeight = w.originalHeight * row.scale;
      
      geometricWords.push({
        ...w,
        x: cx - actualWidth / 2,
        y: cy - actualHeight / 2,
        fontSize: 100 * row.scale, // CRITICAL FIX: Base 100 * scale so Manager can process it safely
        width: actualWidth, // CRITICAL FIX: Emit the unrotated physical container width
        rotation: w.rotation
      });

      currentX += (gravity === 'left' ? 1 : -1) * (cellWidth + gutter);
    });

    maxRowWidth = Math.max(maxRowWidth, Math.abs(currentX - (gravity === 'left' ? 0 : boxWidth)));
    currentY += row.maxHeight * row.scale + vGutter;
  });

  // 4. Global Restraint
  const { scale: globalScale, offsetX, offsetY } = calculateGlobalScaleAndOffset(
    maxRowWidth, currentY, boxWidth, boxHeight
  );

  // 5. Final Conversion to 0-100 Space matching the parent container offset
  return geometricWords.map(gw => ({
    ...gw,
    x: (boundingBox.x + gw.x * globalScale + offsetX) * 100,
    y: (boundingBox.y + gw.y * globalScale + offsetY) * 100,
    width: gw.width * globalScale * 100,
    fontSize: gw.fontSize * globalScale * 100
  }));
};