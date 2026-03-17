/**
 * TetrisMath.ts
 * High-Resolution 2D Grid Bin Packing Math
 */

export const COLS = 200;
export type Matrix = boolean[][];

export const createMatrix = (rows: number): Matrix => 
  Array.from({ length: rows }, () => Array(COLS).fill(false));

export const calculateVolumeScale = (gridCols: number, gridRows: number, aspectRatios: number[]): number => {
  const totalArea = gridCols * gridRows;
  const sumAspectRatios = aspectRatios.reduce((a, b) => a + b, 0);
  // Volume scale ensures words expand to fill the grid proportionally
  return Math.sqrt(totalArea / Math.max(sumAspectRatios, 0.001)) * 0.85;
};

export const allocateBlock = (
  matrix: Matrix,
  wordCols: number,
  wordRows: number,
  gravity: 'left' | 'right'
): { col: number; row: number } => {
  let row = 0;
  while (true) {
    // Dynamic row expansion
    while (matrix.length <= row + wordRows) matrix.push(Array(COLS).fill(false));
    
    const colStart = gravity === 'left' ? 0 : COLS - wordCols;
    const colEnd = gravity === 'left' ? COLS - wordCols : 0;
    const step = gravity === 'left' ? 1 : -1;
    
    for (let c = colStart; gravity === 'left' ? c <= colEnd : c >= colEnd; c += step) {
      let canFit = true;
      for (let r = 0; r < wordRows; r++) {
        for (let wc = 0; wc < wordCols; wc++) {
          if (matrix[row + r][c + wc]) { canFit = false; break; }
        }
        if (!canFit) break;
      }
      if (canFit) {
        for (let r = 0; r < wordRows; r++) {
          for (let wc = 0; wc < wordCols; wc++) matrix[row + r][c + wc] = true;
        }
        return { col: c, row };
      }
    }
    row++;
    // Safety limit to prevent infinite loops
    if (row > 2000) return { col: 0, row: 0 }; 
  }
};
