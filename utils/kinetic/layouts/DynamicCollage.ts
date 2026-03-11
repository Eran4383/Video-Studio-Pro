import { KineticSettings } from '../../../types/kinetic';
import { measureText } from '../kineticTextMeasure';
import { ProcessedWord } from '../KineticLayoutManager';

export const generateDynamicCollage = (words: ProcessedWord[], settings: KineticSettings, isRtl: boolean, screenAR: number): any[] => {
  const wordsWithAR = words.map(w => {
    const fullFont = `${w.fontWeight} 100px ${w.fontFamily}`;
    const size = measureText(w.text, fullFont, 100);
    const ar = (size.height > 0 ? size.width / size.height : 1) || 1;
    return { text: w.text, ar };
  });

  const assumedScreenAR = screenAR;
  const bw = settings.boundingBox?.width || 0.5;
  const bh = settings.boundingBox?.height || 0.5;
  const boxAR = (bw * assumedScreenAR) / bh;

  type WordWithAR = { text: string; ar: number };
  
  // Find the best partition of words into lines to match boxAR
  let bestLines: WordWithAR[][] = [];
  let bestDiff = Infinity;

  const n = wordsWithAR.length;
  
  if (n <= 12) {
    const numPartitions = 1 << (n - 1);

    for (let p = 0; p < numPartitions; p++) {
      const currentLines: WordWithAR[][] = [];
      let currentLine: WordWithAR[] = [wordsWithAR[0]];

      for (let j = 0; j < n - 1; j++) {
        if ((p & (1 << j)) !== 0) {
          // Break line
          currentLines.push(currentLine);
          currentLine = [wordsWithAR[j + 1]];
        } else {
          // Continue line
          currentLine.push(wordsWithAR[j + 1]);
        }
      }
      currentLines.push(currentLine);

      // Calculate total height for this partition
      let totalH = 0;
      currentLines.forEach(line => {
        const sumAR = line.reduce((sum, w) => sum + w.ar, 0);
        const totalGapsAR = (line.length - 1) * ((settings.gap ?? 2) / 100);
        const lineTotalAR = sumAR + totalGapsAR;
        totalH += 100 / lineTotalAR;
      });

      // Add gaps between rows
      totalH += (currentLines.length - 1) * (settings.gap ?? 2);

      const currentAR = 100 / totalH;
      const diff = Math.abs(currentAR - boxAR);

      if (diff < bestDiff) {
        bestDiff = diff;
        bestLines = currentLines;
      }
    }
  } else {
    // Fallback for large n: simple greedy approach or random
    let i = 0;
    while (i < wordsWithAR.length) {
      const numWords = (Math.random() > 0.5 && i < wordsWithAR.length - 1) ? 2 : 1;
      bestLines.push(wordsWithAR.slice(i, i + numWords));
      i += numWords;
    }
  }

  const lines = bestLines;
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
    currentY += lineHeight + gap;
  });

  // Vertical stretching logic
  const totalHeight = currentY - gap; // Remove last gap
  let verticalOffset = 0;
  let rowGap = 0;

  // We want to fill the box as much as possible. 
  // If the content is shorter than the box, we can stretch the gaps.
  // The box height in our logical units (where width=100) is 100 / boxAR.
  const targetHeight = 100 / boxAR;

  if (totalHeight < targetHeight && lines.length > 1) {
    const remainingSpace = targetHeight - totalHeight;
    rowGap = remainingSpace / (lines.length - 1);
  } else if (totalHeight < targetHeight && lines.length === 1) {
    verticalOffset = (targetHeight - totalHeight) / 2;
  }

  // Apply vertical stretching to positionedWords
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
  const contentHeight = Math.max(targetHeight, totalHeight + addedGap);
  const scaleW = boxAR;
  const scaleH = 100 / contentHeight;
  const S = Math.min(scaleW, scaleH) * 0.85; // 0.85 safety margin

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
