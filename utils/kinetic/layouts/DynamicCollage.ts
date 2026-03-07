import { KineticSettings } from '../../../types/kinetic';
import { measureText } from '../kineticTextMeasure';

export const generateDynamicCollage = (wordsText: string[], settings: KineticSettings, isRtl: boolean): any[] => {
  const font = (settings.primaryFont && settings.primaryFont !== 'Original') ? settings.primaryFont : 'Inter, sans-serif';
  const wordsWithAR = wordsText.map(text => {
    const size = measureText(text, font, 100);
    const ar = (size.height > 0 ? size.width / size.height : 1) || 1;
    return { text, ar };
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

  // Calculate total height (subtracting the last gap if any)
  // The last line added a gap, so we need to subtract it from currentY.
  // Wait, currentY includes the last gap.
  // The gap added was (lineHeight * (gap / 100)).
  // We need to know the last line height to subtract the gap correctly.
  
  let totalHeight = currentY;
  if (lines.length > 0) {
     const lastLine = lines[lines.length - 1];
     const sumAR = lastLine.reduce((sum, w) => sum + w.ar, 0);
     const totalGapsAR = (lastLine.length - 1) * (gap / 100);
     const lineTotalAR = sumAR + totalGapsAR;
     const lastLineHeight = 100 / lineTotalAR;
     const lastGapHeight = lastLineHeight * (gap / 100);
     totalHeight -= lastGapHeight;
  }

  // Object-fit: contain logic inside bounding box
  const assumedScreenAR = 1920 / 1080;
  const bw = settings.boundingBox?.width || 0.5; // Default 50% if missing, but usually 0.8
  const bh = settings.boundingBox?.height || 0.5;
  
  // Box Aspect Ratio (Width / Height)
  // If box is 50% width and 50% height of screen:
  // Box Width (px) = 1920 * 0.5
  // Box Height (px) = 1080 * 0.5
  // Box AR = (1920 * 0.5) / (1080 * 0.5) = 1920/1080 = 1.77
  const boxAR = (bw * assumedScreenAR) / bh;

  // We have content with Width=100 and Height=totalHeight.
  // We want to fit it into a box with Width=100*boxAR and Height=100 (normalized to height 100).
  // Or simpler:
  // Content Size: W=100, H=totalHeight
  // Target Box Size (in same units): W=100*boxAR, H=100 (if we normalize height to 100)
  // Wait, let's normalize to the box dimensions.
  // Let's say the box is 1x1 unit.
  // Content is W=100, H=totalHeight.
  // We want to scale content by S so that:
  // W*S <= BoxWidth_in_content_units AND H*S <= BoxHeight_in_content_units
  
  // Let's map 0-100 coordinates to 0-1 coordinates relative to the box.
  // Content Width = 100. Content Height = totalHeight.
  // Box Width (relative to content width unit?) No.
  
  // Let's use the logic from the prompt:
  const scaleW = boxAR; // If we scale width by boxAR, we fit width?
  const scaleH = 100 / (totalHeight || 1);
  const S = Math.min(scaleW, scaleH);

  // If S = scaleW = boxAR:
  // New Width = 100 * boxAR.
  // This means the content width (100) is scaled up to match the box width ratio?
  // Wait, if boxAR is 2 (wide box), and content is 100x100.
  // scaleW = 2. scaleH = 1. S = 1.
  // New Width = 100. New Height = 100.
  // Box is 2 units wide, 1 unit high.
  // Content fits in height, but width is half of box.
  
  // If S = scaleH = 1 (totalHeight=100).
  // Content is 100x100.
  // Box is 2x1 (AR=2).
  // S = 1.
  // Content becomes 100x100.
  // We need to center it in 200x100 space?
  // The prompt says:
  // x: (offsetX_cqh + w.x * S) / boxAR
  
  // Let's trace:
  // w.x is 0-100.
  // w.x * S is 0-100 (if S=1).
  // offsetX_cqh = (100 * boxAR - 100 * S) / 2 = (200 - 100)/2 = 50.
  // x = (50 + 0..100) / 2 = 25..75.
  // In 0-100 scale, 25 to 75 is 50% width, centered. Correct.
  
  const offsetX_cqh = (100 * boxAR - 100 * S) / 2;
  const offsetY_cqh = (100 - totalHeight * S) / 2;

  return positionedWords.map(w => ({
    text: w.text,
    x: (offsetX_cqh + w.x * S) / boxAR, // Normalize to 0-100 relative to box width
    y: offsetY_cqh + w.y * S, // Normalize to 0-100 relative to box height
    width: (w.width * S) / boxAR,
    height: w.height * S,
    fontSize: w.fontSize * S
  }));
};
