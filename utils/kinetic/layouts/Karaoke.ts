import { KineticSettings } from '../../../types/kinetic';
import { measureText } from '../kineticTextMeasure';
import { ProcessedWord } from '../KineticLayoutManager';

export const generateKaraoke = (words: ProcessedWord[], settings: KineticSettings) => {
  if (words.length === 0) return [];

  const { boundingBox, karaokeMode, direction, gap = 2 } = settings;
  const isRtl = direction === 'rtl' || (direction === 'auto' && /[\u0590-\u05FF]/.test(words.map(w => w.text).join(' ')));

  const SCREEN_AR = 1920 / 1080;
  const boxAR = (boundingBox.width * SCREEN_AR) / boundingBox.height;

  const REF_FONT_SIZE = 100;
  const baseFontSizeCqh = 15; // 15% of box height as requested

  const wordData = words.map(w => {
    const fullFont = `${w.fontWeight} ${REF_FONT_SIZE}px ${w.fontFamily}`;
    const { width, height } = measureText(w.text, fullFont, REF_FONT_SIZE);
    const wordAR = width / height;
    return { text: w.text, ar: wordAR };
  });

  if (karaokeMode === 'single-line') {
    const totalAR = wordData.reduce((sum, w) => sum + w.ar, 0) + (words.length - 1) * 0.2;
    const multiplier = Math.min(1, boxAR / totalAR);
    const finalFontSize = baseFontSizeCqh * multiplier;
    
    const totalWidth = wordData.reduce((sum, w) => sum + (finalFontSize * w.ar / boxAR), 0) + (words.length - 1) * 2;
    const offsetX = (100 - totalWidth) / 2;
    
    let currentX = isRtl ? 100 - offsetX : offsetX;
    return wordData.map(w => {
      const wWidth = (finalFontSize * w.ar / boxAR);
      const x = isRtl ? currentX - wWidth : currentX;
      currentX = isRtl ? currentX - (wWidth + 2) : currentX + (wWidth + 2);
      return { text: w.text, x: isRtl ? x + wWidth : x, y: 50, fontSize: finalFontSize, width: wWidth };
    });
  }

  // Multi-line mode
  const lines: { text: string, ar: number, width: number }[][] = [];
  let currentLine: { text: string, ar: number, width: number }[] = [];
  let currentLineWidth = 0;
  const spacing = 2; // 2% spacing

  wordData.forEach(w => {
    const wordWidth = (baseFontSizeCqh * w.ar / boxAR);
    
    if (currentLineWidth + wordWidth + (currentLine.length > 0 ? spacing : 0) > 100 && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [{ text: w.text, ar: w.ar, width: wordWidth }];
      currentLineWidth = wordWidth;
    } else {
      currentLine.push({ text: w.text, ar: w.ar, width: wordWidth });
      currentLineWidth += wordWidth + (currentLine.length > 1 ? spacing : 0);
    }
  });
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  const result: any[] = [];
  const totalHeight = lines.length * baseFontSizeCqh + (lines.length - 1) * gap;
  const offsetY = (100 - totalHeight) / 2;

  let currentY = offsetY;

  lines.forEach(line => {
    const lineWidth = line.reduce((sum, w) => sum + w.width, 0) + (line.length - 1) * spacing;
    const offsetX = (100 - lineWidth) / 2;
    let currentX = isRtl ? 100 - offsetX : offsetX;

    line.forEach(w => {
      const x = isRtl ? currentX - w.width : currentX;
      result.push({
        text: w.text,
        x: isRtl ? x + w.width : x,
        y: currentY + (baseFontSizeCqh / 2),
        fontSize: baseFontSizeCqh,
        width: w.width
      });
      currentX = isRtl ? currentX - (w.width + spacing) : currentX + (w.width + spacing);
    });

    currentY += baseFontSizeCqh + gap;
  });

  return result;
};
