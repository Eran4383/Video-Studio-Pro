/**
 * TetrisMath.ts
 * Strict 2D Grid Bin Packing Math (Safe from negative bounds)
 */

export const COLS = 24;
export type Matrix = boolean[][];

export const createMatrix = (initialRows: number): Matrix => {
  return Array.from({ length: initialRows }, () => Array(COLS).fill(false));
};

export const allocateBlock = (
  matrix: Matrix,
  wordCols: number,
  wordRows: number,
  gravity: 'left' | 'right'
): { col: number; row: number } => {
  let row = 0;
  let safetyLimit = 0;
  
  while (safetyLimit < 500) {
    // Dynamically expand matrix height if needed
    while (matrix.length <= row + wordRows) {
      matrix.push(Array(COLS).fill(false));
    }

    const colStart = gravity === 'left' ? 0 : COLS - wordCols;
    const colEnd = gravity === 'left' ? COLS - wordCols : 0;
    const step = gravity === 'left' ? 1 : -1;

    let c = colStart;
    while (gravity === 'left' ? c <= colEnd : c >= colEnd) {
      let canFit = true;
      for (let r = 0; r < wordRows; r++) {
        for (let wc = 0; wc < wordCols; wc++) {
          if (matrix[row + r][c + wc]) {
            canFit = false;
            break;
          }
        }
        if (!canFit) break;
      }

      if (canFit) {
        // Mark as occupied
        for (let r = 0; r < wordRows; r++) {
          for (let wc = 0; wc < wordCols; wc++) {
            matrix[row + r][c + wc] = true;
          }
        }
        return { col: c, row };
      }
      c += step;
    }
    row++;
    safetyLimit++;
  }
  return { col: 0, row: 0 }; // Fallback to prevent infinite loops
};