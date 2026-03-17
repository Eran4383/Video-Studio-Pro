/**
 * TetrisLayout.ts
 * Absolute 0-100 layout engine for geometric typography blocks.
 */

import { KineticSettings } from '../../../types/kinetic';
import { ProcessedWord } from '../KineticLayoutManager';
import { calculateVisualBounds } from '../visualBoundsCalculator';
import { COLS, Matrix, createMatrix, allocateBlock } from './TetrisMath';
import { analyzeLayoutIntent, detectGravity } from './KineticHeuristics';

export const generateTetrisLayout = (
  words: ProcessedWord[],
  settings: KineticSettings,
  isRtl: boolean,
  screenAR: number
): any[] => {
  if (words.length === 0) return [];

  const { boundingBox } = settings;
  const boxW = boundingBox.width * 100;
  const boxH = boundingBox.height * 100;
  const boxX = boundingBox.x * 100;
  const boxY = boundingBox.y * 100;

  // 1. Visual Square Grid Construction
  const cellWidthX = boxW / COLS;
  // Account for screen aspect ratio so the grid cells are perfect visual squares
  const cellHeightY = cellWidthX * screenAR;

  // Base Gutters
  const density = settings.density ?? 0.015;
  const baseHGutter = boxW * density;
  const baseVGutter = boxW * density * screenAR;

  const intent = analyzeLayoutIntent(words.map(w => w.text));
  const gravity = detectGravity(words.map(w => w.text).join(' '));
  const matrix: Matrix = createMatrix(10);

  // 2. Measure & Quantize
  const quantizedWords = words.map((w, i) => {
    const b = calculateVisualBounds({ ...w, fontSize: 100, rotation: 0 });
    const aspectRatio = b.width / Math.max(b.height, 0.001);
    
    let pCols = Math.max(1, Math.min(COLS, Math.ceil(aspectRatio)));
    let pRows = 1;

    // Intent: Hero Word
    const isHero = (intent === 'hero-end' && i === words.length - 1) || Math.random() < 0.05;
    if (isHero && pCols <= COLS / 2) {
      const mul = Math.floor(Math.random() * 2) + 2; 
      pCols = Math.min(COLS, pCols * mul);
      pRows = mul;
    }

    let gridCols = pCols;
    let gridRows = pRows;
    let rotation = 0;

    // 15% chance to rotate
    if (Math.random() < 0.15 && w.text.length > 1) {
      rotation = Math.random() < 0.5 ? 90 : 270;
      gridCols = pRows;
      gridRows = pCols;
    }

    return { ...w, pCols, pRows, gridCols, gridRows, rotation, origW: b.width };
  });

  // 3. Grid Allocation
  const placedWords = quantizedWords.map(w => {
    const pos = allocateBlock(matrix, w.gridCols, w.gridRows, gravity);
    return { ...w, col: pos.col, row: pos.row };
  });

  // 4. Global Restraint & Scale (Safe Math)
  const totalRows = placedWords.length > 0 ? Math.max(...placedWords.map(w => w.row + w.gridRows)) : 1;
  const gridTotalHeightY = totalRows * cellHeightY;
  
  const globalScale = gridTotalHeightY > boxH ? boxH / gridTotalHeightY : 1;

  // IMPORTANT: Scale the gutters too to prevent negative widths!
  const finalCellW = cellWidthX * globalScale;
  const finalCellH = cellHeightY * globalScale;
  const finalHGutter = baseHGutter * globalScale;
  const finalVGutter = baseVGutter * globalScale;

  const offsetX = (boxW - (COLS * finalCellW)) / 2;
  const offsetY = (boxH - (totalRows * finalCellH)) / 2;

  // 5. Final Coordinates Generation
  return placedWords.map(w => {
    const cellX = boxX + offsetX + (w.col * finalCellW);
    const cellY = boxY + offsetY + (w.row * finalCellH);

    // Dimensions in the grid
    const blockW = (w.gridCols * finalCellW) - finalHGutter;
    const blockH = (w.gridRows * finalCellH) - finalVGutter;

    // Physical dimensions (Unrotated for DOM)
    const physicalW = (w.pCols * finalCellW) - finalHGutter;
    const physicalH = (w.pRows * finalCellH) - finalVGutter;

    // Center point of the block
    const centerX = cellX + blockW / 2 + finalHGutter / 2;
    const centerY = cellY + blockH / 2 + finalVGutter / 2;

    // Safe Math: Absolute protection against negative dimensions
    const safeWidth = Math.max(physicalW, 0.1);
    const fontSize = 100 * (safeWidth / Math.max(w.origW, 0.001));

    // Calculate final Top-Left by reversing from the Center point
    const finalX = centerX - (safeWidth / 2);
    const finalY = centerY - (Math.max(physicalH, 0.1) / 2);

    return {
      ...w,
      x: finalX,
      y: finalY,
      width: safeWidth,
      fontSize: Math.max(fontSize, 0.1),
      rotation: w.rotation
    };
  });
};