/**
 * TetrisLayout.ts
 * Absolute 0-100 layout engine for geometric typography blocks.
 */

import { KineticSettings } from '../../../types/kinetic';
import { ProcessedWord } from '../KineticLayoutManager';
import { calculateVisualBounds } from '../visualBoundsCalculator';
import { calculateGutter, calculateRowScale, calculateGlobalScaleAndOffset } from './TetrisMath';
import { analyzeLayoutIntent, detectGravity } from './KineticHeuristics';

interface TetrisWord extends ProcessedWord {
  normW: number;
  normH: number;
  rotation: number;
}

export const generateTetrisLayout = (
  words: ProcessedWord[],
  settings: KineticSettings,
  isRtl: boolean,
  screenAR: number
): any[] => {
  if (words.length === 0) return [];

  // 1. Establish absolute 0-100 working space (matching KineticLayoutManager logic)
  const { boundingBox } = settings;
  const boxW = boundingBox.width * 100;
  const boxH = boundingBox.height * 100;
  const boxX = boundingBox.x * 100;
  const boxY = boundingBox.y * 100;

  const hGutter = calculateGutter(boxW, 0.02); // Horizontal Tile Grout
  const vGutter = calculateGutter(boxW, 0.015); // Vertical Tile Grout
  
  const intent = analyzeLayoutIntent(words.map(w => w.text));
  const gravity = detectGravity(words.map(w => w.text).join(' '));

  // 2. Pre-computation: Measure all words locked to Height = 100
  const measuredWords: TetrisWord[] = words.map(w => {
    const b = calculateVisualBounds({ ...w, fontSize: 100, rotation: 0 });
    const normW = b.width * (100 / Math.max(b.height, 0.001));
    return { ...w, normW, normH: 100, rotation: 0 };
  });

  // 3. Grid Packing & Masonry Rotation Rule
  const rows: { words: TetrisWord[], scale: number, maxH: number }[] = [];
  let i = 0;
  
  while (i < measuredWords.length) {
    const groupSize = intent === 'hero-end' && i === measuredWords.length - 1 ? 1 : Math.min(3, Math.floor(Math.random() * 2) + 1);
    const rowWords = measuredWords.slice(i, i + groupSize);
    i += groupSize;

    rowWords.forEach(w => {
      // 15% chance to rotate to build the "Tetris" vertical blocks
      if (Math.random() < 0.15 && words.length > 1) {
        w.rotation = Math.random() < 0.5 ? 90 : 270;
        // Swap grid math bounds without altering original text
        const temp = w.normW;
        w.normW = w.normH;
        w.normH = temp;
      }
    });

    const scale = calculateRowScale(rowWords.map(w => w.normW), boxW, hGutter);
    const maxH = Math.max(...rowWords.map(w => w.normH * scale));
    rows.push({ words: rowWords, scale, maxH });
  }

  // 4. Position elements in the grid
  const geometricWords: any[] = [];
  let currentY = 0;

  rows.forEach(row => {
    let currentX = gravity === 'left' ? 0 : boxW;

    row.words.forEach(w => {
      const renderW = w.normW * row.scale;
      const renderH = w.normH * row.scale;
      
      const x = gravity === 'left' ? currentX : currentX - renderW;
      const y = currentY + (row.maxH - renderH) / 2; // Center alignment for robust masonry
      
      // CSS bounds extraction: revert swap if rotated
      const fontSize = w.rotation === 0 ? renderH : renderW;
      const width = w.rotation === 0 ? renderW : renderH;

      geometricWords.push({
        ...w,
        localX: x,
        localY: y,
        width,
        fontSize,
        rotation: w.rotation
      });

      currentX += (gravity === 'left' ? 1 : -1) * (renderW + hGutter);
    });
    currentY += row.maxH + vGutter;
  });

  // 5. Global Scale & Center-Point CSS Rotation Fix
  const { scale: globalScale, offsetX, offsetY } = calculateGlobalScaleAndOffset(
    boxW, currentY - vGutter, boxW, boxH, boxX, boxY
  );

  return geometricWords.map(gw => {
    const finalX = offsetX + gw.localX * globalScale;
    const finalY = offsetY + gw.localY * globalScale;
    const finalW = gw.width * globalScale;
    const finalFS = gw.fontSize * globalScale;
    
    // Correct X/Y for CSS Center-Transform Rotation
    let rotatedX = finalX;
    let rotatedY = finalY;
    if (gw.rotation !== 0) {
      const renderW = finalFS; // Visual width in grid
      const renderH = finalW;  // Visual height in grid
      rotatedX = finalX + (renderW / 2) - (finalW / 2);
      rotatedY = finalY + (renderH / 2) - (finalFS / 2);
    }

    return {
      ...gw,
      x: rotatedX,
      y: rotatedY,
      width: finalW,
      fontSize: finalFS
    };
  });
};