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
  const SCREEN_AR = screenAR;
  const boxAR = (boundingBox.width * SCREEN_AR) / boundingBox.height;

  const REF_FONT_SIZE = 100; // Reference font size for calculations
  const SPACING = 5; // Spacing between words in a block

  const geometricWords: any[] = [];
  
  // Group words into blocks of 2 or 3
  const blocks: ProcessedWord[][] = [];
  let i = 0;
  while (i < words.length) {
    const blockSize = Math.random() > 0.5 ? 3 : 2;
    blocks.push(words.slice(i, i + blockSize));
    i += blockSize;
  }

  let currentX = isRtl ? 100 : 0; // 0 to 100 relative to bounding box
  let currentY = 0;
  let maxLineHeight = 0;

  blocks.forEach((blockWords, blockIndex) => {
    if (blockWords.length === 1) {
      // Single word block (can happen at the end)
      const w = blockWords[0];
      const bounds = calculateVisualBounds({
        text: w.text,
        fontFamily: w.fontFamily,
        fontSize: REF_FONT_SIZE,
        fontWeight: w.fontWeight,
        textCase: w.textCase,
        strokeWidth: settings.strokeWidth,
        shadowBlur: settings.shadowBlur,
        shadowOffsetX: settings.shadowOffsetX,
        shadowOffsetY: settings.shadowOffsetY,
        backgroundPadding: settings.backgroundPadding,
      });

      // Scale to a reasonable size, e.g., 20% of box height
      const targetHeight = 20;
      const scale = targetHeight / bounds.height;
      const scaledWidth = bounds.width * scale * (1 / boxAR);
      const SPACING_X = SPACING / boxAR;

      if ((!isRtl && currentX + scaledWidth > 100) || (isRtl && currentX - scaledWidth < 0)) {
        currentX = isRtl ? 100 : 0;
        currentY += maxLineHeight + SPACING;
        maxLineHeight = 0;
      }

      const xPos = isRtl ? currentX - scaledWidth : currentX;
      const finalX = xPos + (bounds.offsetX * scale) / boxAR;
      const finalY = currentY + (bounds.offsetY * scale);

      geometricWords.push({
        text: w.text,
        x: finalX,
        y: finalY,
        fontSize: REF_FONT_SIZE * scale,
        width: scaledWidth,
        isCentered: false,
        rotation: 0,
      });

      currentX = isRtl ? currentX - scaledWidth - SPACING_X : currentX + scaledWidth + SPACING_X;
      maxLineHeight = Math.max(maxLineHeight, targetHeight);
      return;
    }

    // Multi-word block
    // Choose the first word to be vertical
    const verticalWord = blockWords[0];
    const horizontalWords = blockWords.slice(1);

    const rotation = Math.random() > 0.5 ? 90 : -90;

    const vBounds = calculateVisualBounds({
      text: verticalWord.text,
      fontFamily: verticalWord.fontFamily,
      fontSize: REF_FONT_SIZE,
      fontWeight: verticalWord.fontWeight,
      textCase: verticalWord.textCase,
      strokeWidth: settings.strokeWidth,
      shadowBlur: settings.shadowBlur,
      shadowOffsetX: settings.shadowOffsetX,
      shadowOffsetY: settings.shadowOffsetY,
      backgroundPadding: settings.backgroundPadding,
      rotation,
    });

    // We want the horizontal words to stack and match the height of the vertical word
    // Let's assume they all have the same font size for simplicity
    // Total height of horizontal words = (numWords * hBounds.height) + (numWords - 1) * SPACING
    // We want this to equal vBounds.height
    
    let totalHRawHeight = 0;
    const hBoundsList = horizontalWords.map(hw => {
      const b = calculateVisualBounds({
        text: hw.text,
        fontFamily: hw.fontFamily,
        fontSize: REF_FONT_SIZE,
        fontWeight: hw.fontWeight,
        textCase: hw.textCase,
        strokeWidth: settings.strokeWidth,
        shadowBlur: settings.shadowBlur,
        shadowOffsetX: settings.shadowOffsetX,
        shadowOffsetY: settings.shadowOffsetY,
        backgroundPadding: settings.backgroundPadding,
      });
      totalHRawHeight += b.height;
      return b;
    });

    // We need to scale the horizontal words so their total height + spacing matches vBounds.height
    // Wait, let's just scale the whole block to a target height
    const targetBlockHeight = 30; // 30% of box height
    const vScale = targetBlockHeight / vBounds.height;
    
    const scaledVWidth = vBounds.width * vScale * (1 / boxAR);
    const scaledVHeight = targetBlockHeight;

    const SPACING_X = SPACING / boxAR;

    // Now scale horizontal words to match scaledVHeight
    const hScale = Math.max(0.1, (scaledVHeight - (horizontalWords.length - 1) * SPACING) / totalHRawHeight);

    let maxHWidth = 0;
    hBoundsList.forEach(b => {
      const w = b.width * hScale * (1 / boxAR);
      if (w > maxHWidth) maxHWidth = w;
    });

    const blockWidth = scaledVWidth + SPACING_X + maxHWidth;

    // Check if block fits on current line
    if ((!isRtl && currentX + blockWidth > 100) || (isRtl && currentX - blockWidth < 0)) {
      currentX = isRtl ? 100 : 0;
      currentY += maxLineHeight + SPACING;
      maxLineHeight = 0;
    }

    const blockStartX = isRtl ? currentX - blockWidth : currentX;

    // Place vertical word
    const vWordX = isRtl ? blockStartX + maxHWidth + SPACING_X : blockStartX;
    const finalVX = vWordX + (vBounds.offsetX * vScale) / boxAR;
    const finalVY = currentY + (vBounds.offsetY * vScale);
    
    geometricWords.push({
      text: verticalWord.text,
      x: finalVX,
      y: finalVY,
      fontSize: REF_FONT_SIZE * vScale,
      width: scaledVWidth,
      isCentered: false,
      rotation,
    });

    // Place horizontal words
    let currentHY = currentY;
    const hWordStartX = isRtl ? blockStartX : blockStartX + scaledVWidth + SPACING_X;

    horizontalWords.forEach((hw, idx) => {
      const b = hBoundsList[idx];
      const w = b.width * hScale * (1 / boxAR);
      const finalHX = hWordStartX + (b.offsetX * hScale) / boxAR;
      const finalHY = currentHY + (b.offsetY * hScale);
      
      geometricWords.push({
        text: hw.text,
        x: finalHX,
        y: finalHY,
        fontSize: REF_FONT_SIZE * hScale,
        width: w,
        isCentered: false,
        rotation: 0,
      });

      currentHY += (b.height * hScale) + SPACING;
    });

    currentX = isRtl ? currentX - blockWidth - SPACING_X : currentX + blockWidth + SPACING_X;
    maxLineHeight = Math.max(maxLineHeight, targetBlockHeight);
  });

  return geometricWords;
};
