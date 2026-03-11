import { KineticSettings } from '../../../types/kinetic';
import { measureText } from '../kineticTextMeasure';
import { ProcessedWord } from '../KineticLayoutManager';

export const generateKaraoke = (words: ProcessedWord[], settings: KineticSettings, screenAR: number) => {
  if (words.length === 0) return [];

  const { boundingBox, karaokeMode, direction, gap = 2 } = settings;
  const isRtl = direction === 'rtl' || (direction === 'auto' && /[\u0590-\u05FF]/.test(words.map(w => w.text).join(' ')));

  const SCREEN_AR = screenAR;
  const boxAR = (boundingBox.width * SCREEN_AR) / boundingBox.height;

  const REF_FONT_SIZE = 100;
  const baseFontSizeCqh = 15; // 15% of box height as requested

  const pattern = settings.karaokeSizePattern || 'uniform';
  
  const wordData = words.map((w, i) => {
    const fullFont = `${w.fontWeight} ${REF_FONT_SIZE}px ${w.fontFamily}`;
    const { width, height } = measureText(w.text, fullFont, REF_FONT_SIZE);
    const wordAR = width / height;
    
    let multiplier = 1;
    if (pattern === 'random') {
      multiplier = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
    } else if (pattern === 'ascending') {
      multiplier = words.length > 1 ? 0.7 + (0.6 * (i / (words.length - 1))) : 1;
    } else if (pattern === 'descending') {
      multiplier = words.length > 1 ? 1.3 - (0.6 * (i / (words.length - 1))) : 1;
    }
    
    return { text: w.text, ar: wordAR, multiplier };
  });

  const SAFETY_MARGIN = 0.85;

  if (karaokeMode === 'single-line') {
    const totalAR = wordData.reduce((sum, w) => sum + (w.ar * w.multiplier), 0) + (words.length - 1) * 0.2;
    const sizeMultiplier = Math.min(1, boxAR / totalAR) * SAFETY_MARGIN;
    const finalBaseFontSize = baseFontSizeCqh * sizeMultiplier;
    
    const totalWidth = wordData.reduce((sum, w) => sum + (finalBaseFontSize * w.multiplier * w.ar / boxAR), 0) + (words.length - 1) * 2;
    const offsetX = (100 - totalWidth) / 2;
    
    let currentX = isRtl ? 100 - offsetX : offsetX;
    return wordData.map(w => {
      const fontSize = finalBaseFontSize * w.multiplier;
      const wWidth = (fontSize * w.ar / boxAR);
      const x = isRtl ? currentX - wWidth : currentX;
      currentX = isRtl ? currentX - (wWidth + 2) : currentX + (wWidth + 2);
      return { text: w.text, x: isRtl ? x + wWidth : x, y: 50, fontSize, width: wWidth };
    });
  }

  // Multi-line mode
  const lines: { text: string, ar: number, width: number, fontSize: number }[][] = [];
  let currentLine: { text: string, ar: number, width: number, fontSize: number }[] = [];
  let currentLineWidth = 0;
  const spacing = 2; // 2% spacing

  wordData.forEach(w => {
    let fontSize = baseFontSizeCqh * w.multiplier * SAFETY_MARGIN;
    let wordWidth = (fontSize * w.ar / boxAR);
    
    // Clamping to prevent extremely long words from overflowing horizontally
    if (wordWidth > 100 * SAFETY_MARGIN) {
      const scaleDown = (100 * SAFETY_MARGIN) / wordWidth;
      fontSize *= scaleDown;
      wordWidth *= scaleDown;
    }
    
    if (currentLineWidth + wordWidth + (currentLine.length > 0 ? spacing : 0) > 100 && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [{ text: w.text, ar: w.ar, width: wordWidth, fontSize }];
      currentLineWidth = wordWidth;
    } else {
      currentLine.push({ text: w.text, ar: w.ar, width: wordWidth, fontSize });
      currentLineWidth += wordWidth + (currentLine.length > 1 ? spacing : 0);
    }
  });
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  const result: any[] = [];
  // Approximate total height using baseFontSizeCqh for simplicity, or we could find max font size per line
  const lineHeights = lines.map(line => Math.max(...line.map(w => w.fontSize)));
  const totalHeight = lineHeights.reduce((sum, h) => sum + h, 0) + (lines.length - 1) * gap;

  // FIX 1: Vertical Scaling Constraint
  let finalLineHeights = [...lineHeights];
  let finalTotalHeight = totalHeight;
  let finalGap = gap;
  let finalSpacing = spacing;

  if (totalHeight > 100 * SAFETY_MARGIN) {
    const scaleDown = (100 * SAFETY_MARGIN) / totalHeight;
    finalTotalHeight *= scaleDown;
    finalLineHeights = lineHeights.map(h => h * scaleDown);
    finalGap *= scaleDown;
    finalSpacing *= scaleDown;
    
    lines.forEach(line => {
      line.forEach(w => {
        w.fontSize *= scaleDown;
        w.width *= scaleDown;
      });
    });
  }

  const offsetY = (100 - finalTotalHeight) / 2;
  let currentY = offsetY;

  lines.forEach((line, i) => {
    const lineWidth = line.reduce((sum, w) => sum + w.width, 0) + (line.length - 1) * finalSpacing;
    const offsetX = (100 - lineWidth) / 2;
    let currentX = isRtl ? 100 - offsetX : offsetX;
    const lineHeight = finalLineHeights[i];

    line.forEach(w => {
      const x = isRtl ? currentX - w.width : currentX;
      result.push({
        text: w.text,
        x: isRtl ? x + w.width : x,
        y: currentY + (lineHeight / 2),
        fontSize: w.fontSize,
        width: w.width
      });
      currentX = isRtl ? currentX - (w.width + finalSpacing) : currentX + (w.width + finalSpacing);
    });

    currentY += lineHeight + finalGap;
  });

  return result;
};
