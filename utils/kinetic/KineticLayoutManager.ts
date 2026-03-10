import { Clip } from '../../types';
import { KineticBlock, KineticSettings, KineticWord, KineticAnimationStyle } from '../../types/kinetic';
import { generateDynamicCollage } from './layouts/DynamicCollage';
import { generatePopInPlace } from './layouts/PopInPlace';
import { generateKaraoke } from './layouts/Karaoke';
import { assignColors } from './KineticColorEngine';

const ANIMATIONS: KineticAnimationStyle[] = ['pop', 'slide-up', 'scale', 'fade'];

const getWordAnimation = (style: any, index: number): KineticAnimationStyle => {
  if (style === 'random') {
    return ANIMATIONS[Math.floor(Math.random() * ANIMATIONS.length)];
  }
  if (Array.isArray(style)) {
    return style[index % style.length];
  }
  return style as KineticAnimationStyle;
};

const getWordFont = (settings: KineticSettings, index: number) => {
  if (settings.fontMultiSelect && settings.fonts?.length) {
    return settings.fonts[index % settings.fonts.length];
  }
  return settings.primaryFont || 'Inter, sans-serif';
};

export const generateKineticLayout = (content: string, duration: number, settings: KineticSettings, fallbackFont: string): KineticWord[] => {
  if (typeof content !== 'string') return [];
  const wordsText = content.split(/\s+/).filter(w => w.length > 0);
  
  if (wordsText.length === 0) return [];

  // RTL Detection
  const isRtl = settings.direction === 'rtl' || (settings.direction === 'auto' && /[\u0590-\u05FF]/.test(content));

  // 1. Layout Algorithm
  let geometricWords: any[] = [];
  
  // Router for layouts
  switch (settings.layoutStyle) {
    case 'pop-in-place':
      geometricWords = generatePopInPlace(wordsText, settings);
      break;
    case 'karaoke':
      geometricWords = generateKaraoke(wordsText, settings);
      break;
    case 'dynamic-collage':
    default:
      geometricWords = generateDynamicCollage(wordsText, settings, isRtl);
      break;
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
    fontFamily: getWordFont(settings, index),
    animation: getWordAnimation(settings.animationStyle, index)
  }));

  // 4. Assign Colors
  assignColors(kineticWords, settings.paletteId, settings.randomMode, settings.customColors);

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
    let geometricWords: any[] = [];
    switch (block.settings.layoutStyle) {
      case 'pop-in-place':
        geometricWords = generatePopInPlace(chunkWords, block.settings);
        break;
      case 'karaoke':
        geometricWords = generateKaraoke(chunkWords, block.settings);
        break;
      case 'dynamic-collage':
      default:
        geometricWords = generateDynamicCollage(chunkWords, block.settings, false);
        break;
    }
    
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
      fontFamily: getWordFont(block.settings, i + j),
      animation: getWordAnimation(block.settings.animationStyle, i + j)
    }));

    assignColors(sceneWords, block.settings.paletteId, block.settings.randomMode, block.settings.customColors);
    kineticWords.push(...sceneWords);
  }

  return kineticWords;
};
