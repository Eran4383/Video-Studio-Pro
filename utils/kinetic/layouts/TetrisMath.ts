/**
 * TetrisMath.ts
 * Mathematical utilities for the Tetris-style layout engine.
 */

export const calculateGutter = (width: number, density: number): number => width * density;

export const verticalGutter = 0.015; // 1.5% of screen width

export const calculateRowScale = (wordWidths: number[], totalWidth: number, gutter: number): number => {
  const sumWidths = wordWidths.reduce((a, b) => a + b, 0);
  const totalGutter = (wordWidths.length - 1) * gutter;
  const availableWidth = totalWidth - totalGutter;
  
  if (sumWidths <= 0) return 1;
  return Math.min(1, availableWidth / sumWidths);
};

export const calculateGlobalScaleAndOffset = (
  blockWidth: number,
  blockHeight: number,
  boxWidth: number,
  boxHeight: number
): { scale: number; offsetX: number; offsetY: number } => {
  const scale = Math.min(
    boxWidth / (blockWidth || 0.001),
    boxHeight / (blockHeight || 0.001)
  );
  
  return {
    scale,
    offsetX: (boxWidth - blockWidth * scale) / 2,
    offsetY: (boxHeight - blockHeight * scale) / 2
  };
};
