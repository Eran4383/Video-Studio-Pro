import { KineticSettings } from '../../../types/kinetic';
import { ProcessedWord } from '../KineticLayoutManager';
import { calculateVisualBounds } from '../visualBoundsCalculator';

export const generateTetrisLayout = (words: ProcessedWord[], settings: KineticSettings, isRtl: boolean, screenAR: number): any[] => {
  if (words.length === 0) return [];
  const { boundingBox } = settings;
  const boxAR = (boundingBox.width * screenAR) / boundingBox.height;
  const REF_FONT_SIZE = 100;
  const geometricWords: any[] = [];
  let currentY = 0;
  let i = 0;

  while (i < words.length) {
    let lineWords = [];
    let totalWidth = 0;
    let maxH = 0;
    
    // Try to form a horizontal line
    while (i < words.length && totalWidth < 80) {
      const w = words[i];
      const b = calculateVisualBounds({ ...w, fontSize: REF_FONT_SIZE });
      const wWidth = (b.width * (REF_FONT_SIZE / b.height)) / boxAR;
      if (totalWidth + wWidth > 90) break;
      lineWords.push({ ...w, b, wWidth });
      totalWidth += wWidth + 5;
      maxH = Math.max(maxH, REF_FONT_SIZE);
      i++;
    }

    // 15% chance to make a word vertical
    if (Math.random() < 0.15 && lineWords.length > 0) {
      const vIdx = Math.floor(Math.random() * lineWords.length);
      const vWord = lineWords.splice(vIdx, 1)[0];
      const rotation = Math.random() > 0.5 ? 90 : -90;
      const vB = calculateVisualBounds({ ...vWord, fontSize: REF_FONT_SIZE, rotation });
      const vH = vB.height;
      const vW = vB.width / boxAR;
      
      // Scale horizontal words to match vH
      const hScale = vH / REF_FONT_SIZE;
      lineWords.forEach(lw => { lw.b.height *= hScale; lw.wWidth *= hScale; });
      
      const blockW = vW + 5 + Math.max(...lineWords.map(lw => lw.wWidth), 0);
      const startX = isRtl ? 100 - blockW : 0;
      
      // Place Vertical
      geometricWords.push({ text: vWord.text, x: startX + vW/2, y: currentY + vH/2, fontSize: REF_FONT_SIZE, width: vW, isCentered: true, anchor: {x:0.5, y:0.5}, rotation });
      
      // Place Horizontal
      let hY = currentY;
      lineWords.forEach(lw => {
        geometricWords.push({ text: lw.text, x: startX + vW + 5 + lw.wWidth/2, y: hY + lw.b.height/2, fontSize: REF_FONT_SIZE * hScale, width: lw.wWidth, isCentered: true, anchor: {x:0.5, y:0.5}, rotation: 0 });
        hY += lw.b.height + 2;
      });
      currentY += Math.max(vH, hY - currentY) + 5;
    } else {
      // Justify horizontal
      const scale = 90 / totalWidth;
      let curX = isRtl ? 100 : 0;
      lineWords.forEach(lw => {
        const w = lw.wWidth * scale;
        geometricWords.push({ text: lw.text, x: isRtl ? curX - w/2 : curX + w/2, y: currentY + maxH/2 * scale, fontSize: REF_FONT_SIZE * scale, width: w, isCentered: true, anchor: {x:0.5, y:0.5}, rotation: 0 });
        curX += isRtl ? -(w + 5 * scale) : (w + 5 * scale);
      });
      currentY += maxH * scale + 5;
    }
    // Clamp
    if (currentY > 100) {
      const s = 100 / currentY;
      geometricWords.forEach(gw => { gw.y *= s; gw.fontSize *= s; gw.width *= s; });
      currentY = 100;
    }
  }
  return geometricWords;
};
