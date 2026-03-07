import { Clip } from '../../types';
import { KineticSettings, KineticWord } from '../../types/kinetic';
import { generateDynamicCollage } from './layouts/DynamicCollage';
import { assignColors } from './KineticColorEngine';

export const generateKineticLayout = (clip: Clip, settings: KineticSettings): KineticWord[] => {
  const content = clip.content || '';
  const wordsText = content.split(/\s+/).filter(w => w.length > 0);
  
  if (wordsText.length === 0) return [];

  // RTL Detection
  const isRtl = settings.direction === 'auto' 
    ? /[\u0590-\u05FF]/.test(content) 
    : settings.direction === 'rtl';

  // 1. Layout Algorithm
  let geometricWords: any[] = [];
  
  // Router for layouts
  if (settings.layoutStyle === 'dynamic-collage') {
    geometricWords = generateDynamicCollage(wordsText, settings, isRtl);
  } else {
    // Fallback or other layouts
    geometricWords = generateDynamicCollage(wordsText, settings, isRtl);
  }

  // 2. Timing
  const duration = clip.duration; // in seconds
  const wordDuration = duration / wordsText.length;

  // 3. Construct KineticWords
  const kineticWords: KineticWord[] = geometricWords.map((gw, index) => ({
    id: `kw-${index}-${Date.now()}`,
    text: gw.text,
    startTime: index * wordDuration, // Relative time 0-based
    endTime: (index + 1) * wordDuration,
    position: { x: gw.x, y: gw.y },
    fontSize: gw.fontSize,
    width: gw.width,
    color: '#ffffff', // Placeholder, will be assigned
    fontFamily: settings.primaryFont || clip.font || 'Inter, sans-serif',
    animation: settings.animationStyle
  }));

  // 4. Assign Colors
  assignColors(kineticWords, settings.paletteId, settings.randomMode);

  return kineticWords;
};
