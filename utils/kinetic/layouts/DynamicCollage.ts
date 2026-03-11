import { KineticSettings } from '../../../types/kinetic';
import { measureText } from '../kineticTextMeasure';
import { ProcessedWord } from '../KineticLayoutManager';

export const generateDynamicCollage = (words: ProcessedWord[], settings: KineticSettings, isRtl: boolean): any[] => {
  const wordsWithAR = words.map(w => {
    const fullFont = `${w.fontWeight} 100px ${w.fontFamily}`;
    const size = measureText(w.text, fullFont, 100);
    const ar = (size.height > 0 ? size.width / size.height : 1) || 1;
    return { text: w.text, ar };
  });

  const lines: typeof wordsWithAR[] = [];
  let i = 0;
  while (i < wordsWithAR.length) {
    const numWords = (Math.random() > 0.5 && i < wordsWithAR.length - 1) ? 2 : 1;
    lines.push(wordsWithAR.slice(i, i + numWords));
    i += numWords;
  }

  const gap = settings.gap ?? 2;
  const positionedWords: any[] = [];
  let currentY = 0;

  lines.forEach(line => {
    const sumAR = line.reduce((sum, w) => sum + w.ar, 0);
    const totalGapsAR = (line.length - 1) * (gap / 100);
    const lineTotalAR = sumAR + totalGapsAR;

    // Logical height to make line width exactly 100
    const lineHeight = 100 / lineTotalAR; 
    let currentX = isRtl ? 100 : 0;
    
    line.forEach(w => {
      const wordWidth = lineHeight * w.ar;
      const gapWidth = lineHeight * (gap / 100);

      if (isRtl) {
        currentX -= wordWidth;
        positionedWords.push({ text: w.text, x: currentX, y: currentY, fontSize: lineHeight, width: wordWidth, height: lineHeight });
        currentX -= gapWidth;
      } else {
        positionedWords.push({ text: w.text, x: currentX, y: currentY, fontSize: lineHeight, width: wordWidth, height: lineHeight });
        currentX += wordWidth + gapWidth;
      }
    });
    currentY += lineHeight + (lineHeight * (gap / 100));
  });

  // Vertical stretching logic
  const totalHeight = currentY;
  let verticalOffset = 0;
  let rowGap = 0;

  if (totalHeight < 100 && lines.length > 1) {
    const remainingSpace = 100 - totalHeight;
    rowGap = remainingSpace / (lines.length - 1);
  } else if (totalHeight < 100 && lines.length === 1) {
    verticalOffset = (100 - totalHeight) / 2;
  }

  // Apply vertical stretching to positionedWords
  let currentRowY = 0;
  let lastY = -1;
  let addedGap = 0;

  positionedWords.forEach((w) => {
    if (w.y !== lastY) {
      if (lastY !== -1) {
        addedGap += rowGap;
      }
      lastY = w.y;
    }
    w.y = w.y + addedGap + verticalOffset;
  });

  // Object-fit: contain logic inside bounding box
  const assumedScreenAR = 1920 / 1080;
  const bw = settings.boundingBox?.width || 0.5;
  const bh = settings.boundingBox?.height || 0.5;
  const boxAR = (bw * assumedScreenAR) / bh;

  // We now assume the content height is roughly 100 (due to stretching)
  // But width is still 100.
  const contentHeight = Math.max(100, totalHeight + addedGap);
  const scaleW = boxAR;
  const scaleH = 100 / contentHeight;
  const S = Math.min(scaleW, scaleH);

  const offsetX_cqh = (100 * boxAR - 100 * S) / 2;
  const offsetY_cqh = (100 - contentHeight * S) / 2;

  return positionedWords.map(w => ({
    text: w.text,
    x: (offsetX_cqh + w.x * S) / boxAR,
    y: offsetY_cqh + w.y * S,
    width: (w.width * S) / boxAR,
    height: w.height * S,
    fontSize: w.fontSize * S
  }));
};
