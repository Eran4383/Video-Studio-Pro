/**
 * TetrisMath.ts
 * 2D Grid Bin Packing engine for kinetic typography.
 * Manages a 24-column matrix of square cells.
 */

export const COLS = 24;

export type Matrix = boolean[][];

export interface Point {
  col: number;
  row: number;
}

/**
 * Creates a new matrix with a specified number of rows.
 */
export const createMatrix = (rows: number): Matrix => {
  return Array.from({ length: rows }, () => Array(COLS).fill(false));
};

/**
 * Calculates the size of a single square cell based on the bounding box width.
 */
export const getCellSize = (boxWidth: number): number => boxWidth / COLS;

/**
 * Checks if a block of size (wordCols x wordRows) fits at (col, row).
 */
const isSpaceOccupied = (
  matrix: Matrix,
  col: number,
  row: number,
  wordCols: number,
  wordRows: number
): boolean => {
  if (col + wordCols > COLS || row + wordRows > matrix.length) return true;

  for (let r = row; r < row + wordRows; r++) {
    for (let c = col; c < col + wordCols; c++) {
      if (matrix[r][c]) return true;
    }
  }
  return false;
};

/**
 * Marks a block of size (wordCols x wordRows) as occupied in the matrix.
 */
const markOccupied = (
  matrix: Matrix,
  col: number,
  row: number,
  wordCols: number,
  wordRows: number
): void => {
  for (let r = row; r < row + wordRows; r++) {
    for (let c = col; c < col + wordCols; c++) {
      matrix[r][c] = true;
    }
  }
};

/**
 * Allocates a block in the matrix based on gravity.
 * Dynamically adds rows if no space is found.
 */
export const allocateBlock = (
  matrix: Matrix,
  wordCols: number,
  wordRows: number,
  gravity: 'left' | 'right'
): Point => {
  let attempts = 0;
  const MAX_ATTEMPTS = 1000; // Safety break

  while (attempts < MAX_ATTEMPTS) {
    // Search range based on gravity
    const startCol = gravity === 'left' ? 0 : COLS - wordCols;
    const endCol = gravity === 'left' ? COLS - wordCols : 0;
    const step = gravity === 'left' ? 1 : -1;

    for (let r = 0; r <= matrix.length - wordRows; r++) {
      for (let c = startCol; gravity === 'left' ? c <= endCol : c >= endCol; c += step) {
        if (!isSpaceOccupied(matrix, c, r, wordCols, wordRows)) {
          markOccupied(matrix, c, r, wordCols, wordRows);
          return { col: c, row: r };
        }
      }
    }

    // If no space found, add more rows
    const newRows = createMatrix(5);
    matrix.push(...newRows);
    attempts++;
  }

  throw new Error("Failed to allocate block: Maximum attempts reached.");
};
