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
  const matrix: Matrix = createMatrix(24); // Start with 24 rows capacity
  
  const hGutter = boxW * (settings.gap || 0.015);
  const vGutter = boxW * (settings.gap || 0.015);

  const intent = analyzeLayoutIntent(words.map(w => w.text));
  const gravity = detectGravity(words.map(w => w.text).join(' '));

  // 1. Measure and Quantize (Strict Math)
  const quantizedWords = words.map((w, index) => {
    const b = calculateVisualBounds({ ...w, fontSize: 100, rotation: 0 });
    const aspectRatio = b.width / Math.max(b.height, 0.001);
    
    // Physical columns required for unrotated word
    let physicalCols = Math.max(1, Math.min(COLS, Math.ceil(aspectRatio))); 
    let physicalRows = 1;

    // Intent Scaling (Hero words)
    const isHero = (intent === 'hero-end' && index === words.length - 1) || Math.random() < 0.05;
    if (isHero && physicalCols <= COLS / 2) {
      const scaleMultiplier = Math.floor(Math.random() * 2) + 2; // scale by 2 or 3
      physicalCols = Math.min(COLS, physicalCols * scaleMultiplier);
      physicalRows = scaleMultiplier;
    }

    // Grid tracking (Swapped if rotated)
    let gridCols = physicalCols;
    let gridRows = physicalRows;
    let rotation = 0;
    
    if (Math.random() < 0.15 && w.text.length > 1) { // Prevent rotating single letters usually
      rotation = Math.random() < 0.5 ? 90 : 270;
      gridCols = physicalRows;
      gridRows = physicalCols;
    }

    return { 
      ...w, 
      physicalCols, 
      physicalRows,
      gridCols, 
      gridRows, 
      rotation, 
      originalWidth: b.width, 
      originalHeight: b.height 
    };
  });

  // 2. Allocate in Matrix
  const placedWords = quantizedWords.map(w => {
    const { col, row } = allocateBlock(matrix, w.gridCols, w.gridRows, gravity);
    return { ...w, col, row };
  });

  // 3. Global Restraint & Centering (Fix: using ACTUAL rows, not matrix capacity)
  const actualUsedRows = placedWords.length > 0 
    ? Math.max(...placedWords.map(w => w.row + w.gridRows)) 
    : 1;
    
  const globalScale = (actualUsedRows * cellSize > boxH) ? boxH / (actualUsedRows * cellSize) : 1;
  const offsetX = (boxW - (COLS * cellSize * globalScale)) / 2;
  const offsetY = (boxH - (actualUsedRows * cellSize * globalScale)) / 2;

  // 4. Render to DOM coordinates
  return placedWords.map(w => {
    // Top-left of the allocated grid block
    const gridX = boxX + offsetX + (w.col * cellSize * globalScale) + hGutter / 2;
    const gridY = boxY + offsetY + (w.row * cellSize * globalScale) + vGutter / 2;
    
    // Actual dimensions of the grid block
    const blockW = (w.gridCols * cellSize * globalScale) - hGutter;
    const blockH = (w.gridRows * cellSize * globalScale) - vGutter;

    // Physical dimensions of the text container (UNROTATED)
    const physicalWidth = (w.physicalCols * cellSize * globalScale) - hGutter;
    const physicalHeight = (w.physicalRows * cellSize * globalScale) - vGutter;

    // Center of the allocated block
    const centerX = gridX + blockW / 2;
    const centerY = gridY + blockH / 2;
    
    // Font Size Calculation (Always based on the unrotated physical target width)
    const fontSize = 100 * (physicalWidth / Math.max(w.originalWidth, 0.001));

    // CSS X/Y places the top-left corner of the unrotated physical box 
    // so that its center aligns exactly with the center of the grid block
    const finalX = centerX - (physicalWidth / 2);
    const finalY = centerY - (physicalHeight / 2);

    return {
      ...w,
      x: finalX,
      y: finalY,
      width: physicalWidth, // Always emit the unrotated width to prevent DOM text wrapping
      fontSize,
      rotation: w.rotation
    };
  });
};