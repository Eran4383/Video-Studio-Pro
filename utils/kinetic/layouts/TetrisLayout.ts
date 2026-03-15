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
  
  // 1. Group into Row-Blocks (1-3 words)
  const rows: any[][] = [];
  for (let i = 0; i < words.length; ) {
    const size = Math.min(3, Math.floor(Math.random() * 3) + 1);
    rows.push(words.slice(i, i + size));
    i += size;
  }

  // 2-4. Process Row-Blocks
  const processedRows = rows.map(row => {
    const rowData = row.map(w => {
      const b = calculateVisualBounds({ ...w, fontSize: REF_FONT_SIZE, rotation: 0 });
      return { ...w, b, wWidth: (b.width * (REF_FONT_SIZE / b.height)) / boxAR, h: b.height };
    });
    
    if (Math.random() < 0.15 && rowData.length > 1) {
      const vIdx = Math.floor(Math.random() * rowData.length);
      const vWord = rowData.splice(vIdx, 1)[0];
      const rotation = Math.random() > 0.5 ? 90 : -90;
      const vB = calculateVisualBounds({ ...vWord, fontSize: REF_FONT_SIZE, rotation });
      const vH = vB.height;
      const vW = vB.width / boxAR;
      const hScale = vH / REF_FONT_SIZE;
      rowData.forEach(lw => { lw.b.height *= hScale; lw.wWidth *= hScale; });
      const blockW = vW + MARGIN + Math.max(...rowData.map(lw => lw.wWidth), 0);
      return { type: 'vertical', vWord, vB, vH, vW, hWords: rowData, rotation, scale: 1 / blockW, blockW };
    }
    const totalW = rowData.reduce((sum, lw) => sum + lw.wWidth, 0) + (rowData.length - 1) * MARGIN;
    return { type: 'horizontal', words: rowData, scale: 1 / totalW, totalH: Math.max(...rowData.map(lw => lw.b.height)) };
  });

  // 5. Position and Scale
  let totalH = processedRows.reduce((sum, row) => sum + (row.type === 'vertical' ? row.vH * row.scale : row.totalH * row.scale), 0);
  const globalScale = totalH > 1 ? 1 / totalH : 1;
  let y = totalH * globalScale < 1 ? (1 - totalH * globalScale) / 2 : 0;

  processedRows.forEach(row => {
    if (row.type === 'vertical') {
      const startX = isRtl ? 1 - (row.blockW * row.scale * globalScale) : 0;
      geometricWords.push({ ...row.vWord, x: startX + (row.vW * row.scale * globalScale)/2, y: y + (row.vH * row.scale * globalScale)/2, fontSize: REF_FONT_SIZE * row.scale * globalScale, width: row.vW * row.scale * globalScale, isCentered: true, anchor: {x:0.5, y:0.5}, rotation: row.rotation });
      let hY = y;
      row.hWords.forEach((lw: any) => {
        geometricWords.push({ ...lw, x: startX + (row.vW * row.scale * globalScale) + MARGIN + (lw.wWidth * row.scale * globalScale)/2, y: hY + (lw.b.height * row.scale * globalScale)/2, fontSize: REF_FONT_SIZE * row.scale * globalScale, width: lw.wWidth * row.scale * globalScale, isCentered: true, anchor: {x:0.5, y:0.5}, rotation: 0 });
        hY += lw.b.height * row.scale * globalScale + MARGIN;
      });
      y += row.vH * row.scale * globalScale + MARGIN;
    } else {
      let curX = isRtl ? 1 : 0;
      row.words.forEach((lw: any) => {
        const w = lw.wWidth * row.scale * globalScale;
        geometricWords.push({ ...lw, x: isRtl ? curX - w/2 : curX + w/2, y: y + (lw.b.height * row.scale * globalScale)/2, fontSize: REF_FONT_SIZE * row.scale * globalScale, width: w, isCentered: true, anchor: {x:0.5, y:0.5}, rotation: 0 });
        curX += isRtl ? -(w + MARGIN) : (w + MARGIN);
      });
      y += row.totalH * row.scale * globalScale + MARGIN;
    }
  });
  return geometricWords;
};
