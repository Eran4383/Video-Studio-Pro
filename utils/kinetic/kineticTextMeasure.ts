export const loadFonts = async (fonts: string[]) => {
  const uniqueFonts = Array.from(new Set(fonts.filter(Boolean)));
  const promises = uniqueFonts.map(font => {
    try {
      return document.fonts.load(`16px "${font}"`);
    } catch (e) {
      console.warn('Failed to load font', font, e);
      return Promise.resolve();
    }
  });
  await Promise.all(promises);
};

export const measureText = (text: string, font: string, fontSize: number): { width: number, height: number } => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: 0, height: 0 };

  ctx.font = font;
  const metrics = ctx.measureText(text);

  const width = metrics.width;
  // Estimate height if actualBoundingBox is not supported, or use it if available
  const height = (metrics.actualBoundingBoxAscent || fontSize * 0.8) + (metrics.actualBoundingBoxDescent || fontSize * 0.2);

  return { width, height };
};
