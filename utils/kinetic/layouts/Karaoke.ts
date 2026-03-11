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
    
    let currentX = isRtl ? 100 : 0;
    return wordData.map(w => {
      const wWidth = (finalFontSize * w.ar / boxAR);
      const x = isRtl ? currentX - wWidth : currentX;
      currentX = isRtl ? currentX - (wWidth + 2) : currentX + (wWidth + 2);
      return { text: w.text, x: isRtl ? x + wWidth : x, y: 50, fontSize: finalFontSize, width: wWidth };
    });
  }

  // Multi-line mode
  let currentX = isRtl ? 100 : 0;
  let currentY = 0;
  const spacing = 2; // 2% spacing

  return wordData.map(w => {
    const wordWidth = (baseFontSizeCqh * w.ar / boxAR);
    
    // Check overflow
    const wouldOverflow = isRtl ? (currentX - wordWidth < 0) : (currentX + wordWidth > 100);
    
    if (wouldOverflow && currentX !== (isRtl ? 100 : 0)) {
      currentY += baseFontSizeCqh + gap;
      currentX = isRtl ? 100 : 0;
    }

    const x = isRtl ? currentX - wordWidth : currentX;
    const result = { 
      text: w.text, 
      x: isRtl ? x + wordWidth : x, 
      y: currentY + (baseFontSizeCqh / 2), 
      fontSize: baseFontSizeCqh, 
      width: wordWidth 
    };

    currentX = isRtl ? currentX - (wordWidth + spacing) : currentX + (wordWidth + spacing);
    return result;
  });
};
