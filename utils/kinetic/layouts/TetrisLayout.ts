/**
 * TetrisLayout.ts
 * Absolute 0-100 layout engine for geometric typography blocks.
 * Uses 2D Grid Bin Packing for layout.
 */

import { KineticSettings } from '../../../types/kinetic';
import { ProcessedWord } from '../KineticLayoutManager';
import { calculateVisualBounds } from '../visualBoundsCalculator';
import { 
  COLS, 
  Matrix, 
  createMatrix, 
  getCellSize, 
  allocateBlock 
} from './TetrisMath';
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

  const cellSize = getCellSize(boxW);
  const matrix: Matrix = createMatrix(24); // Start with 24 rows
  
  const hGutter = boxW * (settings.gap || 0.015);
  const vGutter = boxW * (settings.gap || 0.015);

  const intent = analyzeLayoutIntent(words.map(w => w.text));
  const gravity = detectGravity(words.map(w => w.text).join(' '));

  // 1. Measure and Quantize
  const quantizedWords = words.map((w, index) => {
    const b = calculateVisualBounds({ ...w, fontSize: 100, rotation: 0 });
    const aspectRatio = b.width / Math.max(b.height, 0.001);
    
    let cols = Math.max(1, Math.min(COLS, Math.ceil(aspectRatio * 4))); // Quantized to grid
    let rows = 1;

    // Intent and Rotation
    const isHero = (intent === 'hero-end' && index === words.length - 1) || Math.random() < 0.1;
    if (isHero) {
      cols = Math.min(COLS, cols * 2);
      rows = Math.min(COLS, rows * 2);
    }

    let rotation = 0;
    if (Math.random() < 0.15) {
      rotation = Math.random() < 0.5 ? 90 : 270;
      [cols, rows] = [rows, cols]; // Swap
    }

    return { ...w, cols, rows, rotation, originalWidth: b.width, originalHeight: b.height };
  });

  // 2. Allocate
  const placedWords = quantizedWords.map(w => {
    const { col, row } = allocateBlock(matrix, w.cols, w.rows, gravity);
    return { ...w, col, row };
  });

  // 3. Global Restraint & Centering
  const totalRows = matrix.length;
  const globalScale = (totalRows * cellSize > boxH) ? boxH / (totalRows * cellSize) : 1;
  const offsetX = (boxW - (COLS * cellSize * globalScale)) / 2;
  const offsetY = (boxH - (totalRows * cellSize * globalScale)) / 2;

  // 4. Render
  return placedWords.map(w => {
    const x = boxX + offsetX + (w.col * cellSize * globalScale) + hGutter / 2;
    const y = boxY + offsetY + (w.row * cellSize * globalScale) + vGutter / 2;
    
    // Font Size Calculation
    const allocatedWidth = (w.cols * cellSize * globalScale) - hGutter;
    const fontSize = 100 * (allocatedWidth / w.originalWidth);

    // Rotation Center Correction
    let finalX = x;
    let finalY = y;
    if (w.rotation !== 0) {
      const renderW = w.cols * cellSize * globalScale;
      const renderH = w.rows * cellSize * globalScale;
      finalX = x + (renderW / 2) - (renderH / 2);
      finalY = y + (renderH / 2) - (renderW / 2);
    }

    return {
      ...w,
      x: finalX,
      y: finalY,
      width: w.cols * cellSize * globalScale,
      fontSize,
      rotation: w.rotation
    };
  });
};
