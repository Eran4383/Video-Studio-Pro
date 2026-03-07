import { getPalette } from '../../config/kineticPalettes';
import { KineticWord } from '../../types/kinetic';

export const assignColors = (words: Partial<KineticWord>[], paletteId: string, randomMode: boolean): void => {
  const palette = getPalette(paletteId);
  const colors = palette.colors;
  
  if (!colors || colors.length === 0) return;

  let lastColorIndex = -1;

  words.forEach((word, index) => {
    let colorIndex;
    
    if (randomMode) {
      colorIndex = Math.floor(Math.random() * colors.length);
    } else {
      // Cycle logic
      colorIndex = index % colors.length;
      
      // Avoid adjacent duplicates if possible (only if we have >1 color)
      if (colorIndex === lastColorIndex && colors.length > 1) {
        colorIndex = (colorIndex + 1) % colors.length;
      }
    }
    
    word.color = colors[colorIndex];
    lastColorIndex = colorIndex;
  });
};
