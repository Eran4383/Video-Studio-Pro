import { KineticSettings } from '../../../types/kinetic';
import { ProcessedWord } from '../KineticLayoutManager';
import { calculateVisualBounds } from '../visualBoundsCalculator';

export const generateTetrisLayout = (
  words: ProcessedWord[],
  settings: KineticSettings,
  isRtl: boolean,
  screenAR: number
): any[] => {
  if (words.length === 0) return [];
  const { boundingBox } = settings;
  const boxAR = (boundingBox.width * screenAR) / boundingBox.height;
  const REF_FONT_SIZE = 100;
  const MARGIN = 0.02; // 2% relative margin
  const geometricWords: any[] = [];
  
  let i = 0;
  const rows: any[] = [];
  while (i < words.length) {
    const size = Math.min(3, Math.floor(Math.random() * 3) + 1);
    const rowWords = words.slice(i, i + size);
    i += size;
    
    const rowData = rowWords.map(w => {
      const b = calculateVisualBounds({ ...w, fontSize: REF_FONT_SIZE, rotation: 0 });
      return { ...w, b, wWidth: (b.width * (REF_FONT_SIZE / b.height)) / boxAR, h: b.height };
    });
    
    if (Math.random() < 0.15 && rowData.length > 1) {
      const vIdx = Math.floor(Math.random() * rowData.length);
      const vWord = rowData.splice(vIdx, 1)[0];
      const rotation = Math.random() > 0.5 ? 90 : -90;
      const vB = calculateVisualBounds({ ...vWord, fontSize: REF_FONT_SIZE, rotation });
      const vW = vB.width / boxAR;
      const maxHW = Math.max(...rowData.map(lw => lw.wWidth), 0);
      const textW = vW + MARGIN + maxHW;
      const scale = (1 - MARGIN) / textW;
      rows.push({ type: 'vertical', vWord, vW, hWords: rowData, rotation, scale });
    } else {
      const textW = rowData.reduce((sum, lw) => sum + lw.wWidth, 0);
      const scale = (1 - (rowData.length - 1) * MARGIN) / textW;
      rows.push({ type: 'horizontal', words: rowData, scale });
    }
  }

  let y = 0;
  rows.forEach(row => {
    if (row.type === 'vertical') {
      const vW = row.vW * row.scale;
      geometricWords.push({ ...row.vWord, x: vW/2, y: y + 0.15, fontSize: REF_FONT_SIZE * row.scale, width: vW, isCentered: true, anchor: {x:0.5, y:0.5}, rotation: row.rotation });
      row.hWords.forEach((lw: any, idx: number) => {
        geometricWords.push({ ...lw, x: vW + MARGIN + (lw.wWidth * row.scale)/2, y: y + idx * 0.15, fontSize: REF_FONT_SIZE * row.scale, width: lw.wWidth * row.scale, isCentered: true, anchor: {x:0.5, y:0.5}, rotation: 0 });
      });
      y += 0.35;
    } else {
      let curX = 0;
      row.words.forEach((lw: any) => {
        const w = lw.wWidth * row.scale;
        geometricWords.push({ ...lw, x: curX + w/2, y: y + 0.15, fontSize: REF_FONT_SIZE * row.scale, width: w, isCentered: true, anchor: {x:0.5, y:0.5}, rotation: 0 });
        curX += w + MARGIN;
      });
      y += 0.35;
    }
  });

  const globalScale = y > 1 ? 1 / y : 1;
  const xOffset = (1 - globalScale) / 2;
  const yOffset = (1 - y * globalScale) / 2;

  return geometricWords.map(gw => ({
    ...gw,
    x: (gw.x * globalScale + xOffset) * 100,
    y: (gw.y * globalScale + yOffset) * 100,
    width: gw.width * globalScale * 100,
    fontSize: gw.fontSize * globalScale * 100
  }));
};
