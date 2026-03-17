/**
 * TetrisLayout.ts
 * High-Resolution 2D Grid Bin Packing layout engine.
 */

import { KineticSettings } from '../../../types/kinetic';
import { ProcessedWord } from '../KineticLayoutManager';
import { calculateVisualBounds } from '../visualBoundsCalculator';
import { COLS, Matrix, createMatrix, allocateBlock, calculateVolumeScale } from './TetrisMath';
import { analyzeLayoutIntent, detectGravity } from './KineticHeuristics';

export const generateTetrisLayout = (
  words: ProcessedWord[],
  settings: KineticSettings,
  isRtl: boolean,
  screenAR: number
): any[] => {
  if (words.length === 0) return [];

  const { boundingBox, gap } = settings;
  const boxW = boundingBox.width * 100;
  const boxH = boundingBox.height * 100;
  const boxX = boundingBox.x * 100;
  const boxY = boundingBox.y * 100;

  // 1. Grid Construction (High-Res 200 columns)
  const cellWidthX = boxW / COLS;
  const cellHeightY = cellWidthX * screenAR; // Maintain square virtual cells

  // Gutters relative to cell dimensions
  const gapFactor = gap ?? 0.1;
  const baseHGutter = cellWidthX * gapFactor;
  const baseVGutter = cellHeightY * gapFactor;

  const intent = analyzeLayoutIntent(words.map(w => w.text));
  const gravity = detectGravity(words.map(w => w.text).join(' '));
  const matrix: Matrix = createMatrix(Math.ceil(COLS * (boxH / boxW)));

  // 2. Volume-Based Quantization
  const aspectRatios = words.map(w => {
    const b = calculateVisualBounds({ ...w, fontSize: 100, rotation: 0 });
    return b.width / Math.max(b.height, 0.001);
  });
  
  const volumeScale = calculateVolumeScale(COLS, matrix.length, aspectRatios);

  const quantizedWords = words.map((w, i) => {
    const b = calculateVisualBounds({ ...w, fontSize: 100, rotation: 0 });
    const aspectRatio = b.width / Math.max(b.height, 0.001);
    
    // Scale dimensions based on volume
    let gridCols = Math.max(1, Math.min(COLS, Math.ceil(aspectRatio * volumeScale)));
    let gridRows = Math.max(1, Math.ceil(volumeScale));

    // Intent: Hero Word
    const isHero = (intent === 'hero-end' && i === words.length - 1) || Math.random() < 0.05;
    if (isHero) {
      gridCols = Math.min(COLS, gridCols * 1.5);
      gridRows = Math.min(COLS, gridRows * 1.5);
    }

    let rotation = 0;
    if (Math.random() < 0.15 && w.text.length > 1) {
      rotation = Math.random() < 0.5 ? 90 : 270;
      [gridCols, gridRows] = [gridRows, gridCols];
    }

    return { ...w, gridCols, gridRows, rotation, origW: b.width };
  });

  // 3. Grid Allocation
  const placedWords = quantizedWords.map(w => {
    const pos = allocateBlock(matrix, w.gridCols, w.gridRows, gravity);
    return { ...w, col: pos.col, row: pos.row };
  });

  // 4. Global Restraint & Scale
  const usedRows = Math.max(...placedWords.map(w => w.row + w.gridRows), 1);

  const gridTotalHeightY = usedRows * cellHeightY;
  const globalScale = gridTotalHeightY > boxH ? boxH / gridTotalHeightY : 1;

  const finalCellW = cellWidthX * globalScale;
  const finalCellH = cellHeightY * globalScale;
  const finalHGutter = baseHGutter * globalScale;
  const finalVGutter = baseVGutter * globalScale;

  const offsetX = (boxW - (COLS * finalCellW)) / 2;
  const offsetY = (boxH - (usedRows * finalCellH)) / 2;

  // 5. Final Coordinates
  return placedWords.map(w => {
    const cellX = boxX + offsetX + (w.col * finalCellW);
    const cellY = boxY + offsetY + (w.row * finalCellH);

    const blockW = (w.gridCols * finalCellW) - finalHGutter;
    const blockH = (w.gridRows * finalCellH) - finalVGutter;

    const safeWidth = Math.max(blockW, 0.1);
    const fontSize = 100 * (safeWidth / Math.max(w.origW, 0.001));

    return {
      ...w,
      x: cellX + finalHGutter / 2,
      y: cellY + finalVGutter / 2,
      width: safeWidth,
      fontSize: Math.max(fontSize, 0.1),
      rotation: w.rotation
    };
  });
};
