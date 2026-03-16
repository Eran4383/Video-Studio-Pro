/**
 * TetrisMath.ts
 * Strict 0-100 space mathematical bounds for Tetris packing.
 */

export const calculateGutter = (boxWidth100: number, density: number): number => {
  return boxWidth100 * density;
};

export const calculateRowScale = (normWidths: number[], availableWidth: number, gutter: number): number => {
  const sumWidths = normWidths.reduce((sum, w) => sum + w, 0);
  const totalGutter = Math.max(0, normWidths.length - 1) * gutter;
  const targetWidth = availableWidth - totalGutter;
  
  if (sumWidths <= 0) return 1;
  return targetWidth / sumWidths;
};

export const calculateGlobalScaleAndOffset = (
  blockWidth: number,
  blockHeight: number,
  boxWidth: number,
  boxHeight: number,
  boxX: number,
  boxY: number
): { scale: number; offsetX: number; offsetY: number } => {
  // Global Restraint: Only scale down if the height exceeded the box
  const scale = blockHeight > boxHeight ? boxHeight / Math.max(blockHeight, 0.001) : 1;
  
  const finalWidth = blockWidth * scale;
  const finalHeight = blockHeight * scale;
  
  return {
    scale,
    offsetX: boxX + (boxWidth - finalWidth) / 2, // Perfect Center X
    offsetY: boxY + (boxHeight - finalHeight) / 2 // Perfect Center Y
  };
};