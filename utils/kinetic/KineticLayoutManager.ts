import { Clip } from '../../types';
import { KineticBlock, KineticSettings, KineticWord } from '../../types/kinetic';
import { generateDynamicCollage } from './layouts/DynamicCollage';
import { assignColors } from './KineticColorEngine';

export const generateKineticLayout = (content: string, duration: number, settings: KineticSettings, fallbackFont: string): KineticWord[] => {
  const wordsText = content.split(/\s+/).filter(w => w.length > 0);
  
  if (wordsText.length === 0) return [];

  // RTL Detection
  const isRtl = settings.direction === 'rtl' || (settings.direction === 'auto' && /[\u0590-\u05FF]/.test(content));

  // Font Protection
  const fontToUse = (settings.primaryFont && settings.primaryFont !== 'Original' && settings.primaryFont !== 'default') 
    ? settings.primaryFont 
    : fallbackFont;

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
  const wordDuration = duration / wordsText.length;

  // 3. Construct KineticWords
  const kineticWords: KineticWord[] = geometricWords.map((gw, index) => ({
    id: `kw-${index}-${Date.now()}`,
    text: gw.text,
    startTime: index * wordDuration, // Relative time 0-based
    endTime: (index + 1) * wordDuration,
    position: { x: gw.x / 100, y: gw.y / 100 }, // Normalize 0-100 to 0-1
    fontSize: gw.fontSize / 100, // Normalize 0-100 to 0-1
    width: gw.width / 100, // Normalize 0-100 to 0-1
    color: '#ffffff', // Placeholder, will be assigned
    fontFamily: fontToUse,
    animation: settings.animationStyle
  }));

  // 4. Assign Colors
  assignColors(kineticWords, settings.paletteId, settings.randomMode);

  return kineticWords;
};

export const generateBlockLayout = (block: KineticBlock, projectClips: Clip[]): KineticWord[] => {
  const clips = projectClips
    .filter(c => block.clipIds.includes(c.id))
    .sort((a, b) => a.startTime - b.startTime);

  if (clips.length === 0) return [];

  const allWords: { text: string, startTime: number, endTime: number }[] = [];
  clips.forEach(clip => {
    const words = (clip.content || '').split(/\s+/).filter(w => w.length > 0);
    const wordDuration = clip.duration / words.length;
    words.forEach((text, i) => {
      allWords.push({
        text,
        startTime: clip.startTime + (i * wordDuration),
        endTime: clip.startTime + ((i + 1) * wordDuration)
      });
    });
  });

  const maxWords = block.settings.maxWordsVisible || 8;
  const kineticWords: KineticWord[] = [];

  for (let i = 0; i < allWords.length; i += maxWords) {
    const chunk = allWords.slice(i, i + maxWords);
    const chunkWords = chunk.map(w => w.text);
    
    // Generate layout for this scene
    const geometricWords = generateDynamicCollage(chunkWords, block.settings, false);
    
    // Assign colors
    const sceneWords: KineticWord[] = geometricWords.map((gw, j) => ({
      id: `kw-${Date.now()}-${i + j}`,
      text: gw.text,
      startTime: chunk[j].startTime,
      endTime: chunk[j].endTime,
      position: { x: gw.x / 100, y: gw.y / 100 },
      fontSize: gw.fontSize / 100,
      width: gw.width / 100,
      color: '#ffffff',
      fontFamily: block.settings.primaryFont || 'Inter, sans-serif',
      animation: block.settings.animationStyle || 'pop'
    }));

    assignColors(sceneWords, block.settings.paletteId, block.settings.randomMode);
    kineticWords.push(...sceneWords);
  }

  return kineticWords;
};
