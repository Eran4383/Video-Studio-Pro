export const measureText = (text: string, font: string, fontSize: number): { width: number, height: number } => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: 0, height: 0 };

  ctx.font = `${fontSize}px ${font}`;
  const metrics = ctx.measureText(text);

  const width = metrics.width;
  // Estimate height if actualBoundingBox is not supported, or use it if available
  const height = (metrics.actualBoundingBoxAscent || fontSize * 0.8) + (metrics.actualBoundingBoxDescent || fontSize * 0.2);

  return { width, height };
};
