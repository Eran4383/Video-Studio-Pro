import { Clip } from '../../types';
import { KineticBlock, KineticSettings, KineticWord, KineticAnimationStyle, KineticLayoutStyle } from '../../types/kinetic';
import { generateDynamicCollage } from './layouts/DynamicCollage';
import { generatePopInPlace } from './layouts/PopInPlace';
import { generateKaraoke } from './layouts/Karaoke';
import { assignColors } from './KineticColorEngine';

export interface ProcessedWord {
  originalText: string;
  text: string;
  fontFamily: string;
  fontWeight: string;
  textCase: 'uppercase' | 'lowercase' | 'original';
}

const ANIMATIONS: KineticAnimationStyle[] = ['pop', 'slide-up', 'scale', 'fade'];

const applyCase = (text: string, textCase: 'uppercase' | 'lowercase' | 'original'): string => {
  if (textCase === 'uppercase') return text.toUpperCase();
  if (textCase === 'lowercase') return text.toLowerCase();
  return text;
};

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

const getWordWeight = (settings: KineticSettings): string => {
  if (settings.fontWeight === 'random') {
    const weights = ['100', '300', '400', '700', '900'];
    return weights[Math.floor(Math.random() * weights.length)];
  }
  return settings.fontWeight || '900';
};

const getWordTextCase = (settings: KineticSettings): 'uppercase' | 'lowercase' | 'original' => {
  if (settings.textCase === 'random') {
    const cases: ('uppercase' | 'lowercase' | 'original')[] = ['uppercase', 'lowercase', 'original'];
    return cases[Math.floor(Math.random() * cases.length)];
  }
  return settings.textCase || 'original';
};

export const generateKineticLayout = (content: string, duration: number, settings: KineticSettings, fallbackFont: string): KineticWord[] => {
  if (typeof content !== 'string') return [];
  const wordsText = content.split(/\s+/).filter(w => w.length > 0);
  
  if (wordsText.length === 0) return [];

  // Map to ProcessedWords first
  const processedWords: ProcessedWord[] = wordsText.map((text, i) => {
    const textCase = getWordTextCase(settings);
    return {
      originalText: text,
      text: applyCase(text, textCase),
      fontFamily: getWordFont(settings, i),
      fontWeight: getWordWeight(settings),
      textCase
    };
  });

  // RTL Detection
  const isRtl = settings.direction === 'rtl' || (settings.direction === 'auto' && /[\u0590-\u05FF]/.test(content));

  // 1. Layout Algorithm
  let geometricWords: any[] = [];
  
  // Router for layouts
  const layoutStyle = Array.isArray(settings.layoutStyle) ? settings.layoutStyle[0] : settings.layoutStyle;

  switch (layoutStyle) {
    case 'pop-in-place':
      geometricWords = generatePopInPlace(processedWords, settings);
      break;
    case 'karaoke':
      geometricWords = generateKaraoke(processedWords, settings);
      break;
    case 'dynamic-collage':
    default:
      geometricWords = generateDynamicCollage(processedWords, settings, isRtl);
      break;
  }

  // 2. Timing
  const wordDuration = duration / processedWords.length;

  // 3. Construct KineticWords
  const kineticWords: KineticWord[] = geometricWords.map((gw, index) => ({
    id: `kw-${index}-${Date.now()}`,
    text: gw.text,
    startTime: index * wordDuration, // Relative time 0-based
    endTime: (index + 1) * wordDuration,
    sourceClipId: '', // Will be set in block layout
    position: { x: gw.x / 100, y: gw.y / 100 }, // Normalize 0-100 to 0-1
    fontSize: gw.fontSize / 100, // Normalize 0-100 to 0-1
    width: gw.width / 100, // Normalize 0-100 to 0-1
    color: '#ffffff', // Placeholder, will be assigned
    fontFamily: processedWords[index].fontFamily,
    fontWeight: processedWords[index].fontWeight,
    textCase: processedWords[index].textCase,
    animation: getWordAnimation(settings.animationStyle, index),
    isCentered: gw.isCentered,
    layoutStyle: layoutStyle
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

  const allWords: { text: string, startTime: number, endTime: number, clipId: string }[] = [];
  clips.forEach(clip => {
    const words = (clip.content || '').split(/\s+/).filter(w => w.length > 0);
    const wordDuration = clip.duration / words.length;
    words.forEach((text, i) => {
      allWords.push({
        text,
        startTime: clip.startTime + (i * wordDuration),
        endTime: clip.startTime + ((i + 1) * wordDuration),
        clipId: clip.id
      });
    });
  });

  const maxWords = block.settings.maxWordsVisible || 8;
  const kineticWords: KineticWord[] = [];

  const layoutStyles = Array.isArray(block.settings.layoutStyle) 
    ? block.settings.layoutStyle 
    : [block.settings.layoutStyle];

  const chunks: typeof allWords[] = [];
  let currentChunk: typeof allWords = [];

  for (let i = 0; i < allWords.length; i++) {
    const currentWord = allWords[i];
    
    if (currentChunk.length > 0) {
      const previousWord = currentChunk[currentChunk.length - 1];
      const gap = currentWord.startTime - previousWord.endTime;
      
      if (currentChunk.length >= maxWords || gap > 1.0) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
    }
    
    currentChunk.push(currentWord);
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  let globalWordIndex = 0;
  let chunkIndex = 0;

  for (const chunk of chunks) {
    // Map to ProcessedWords
    const processedWords: ProcessedWord[] = chunk.map((w, j) => {
      const textCase = getWordTextCase(block.settings);
      return {
        originalText: w.text,
        text: applyCase(w.text, textCase),
        fontFamily: getWordFont(block.settings, globalWordIndex + j),
        fontWeight: getWordWeight(block.settings),
        textCase
      };
    });

    // Select layout style cyclically
    const layoutStyle = layoutStyles[chunkIndex % layoutStyles.length];
    
    // Generate layout for this scene
    let geometricWords: any[] = [];
    switch (layoutStyle) {
      case 'pop-in-place':
        geometricWords = generatePopInPlace(processedWords, block.settings);
        break;
      case 'karaoke':
        geometricWords = generateKaraoke(processedWords, block.settings);
        break;
      case 'dynamic-collage':
      default:
        geometricWords = generateDynamicCollage(processedWords, block.settings, false);
        break;
    }
    
    // Assign colors
    const sceneWords: KineticWord[] = geometricWords.map((gw, j) => ({
      id: `kw-${Date.now()}-${globalWordIndex + j}`,
      text: gw.text,
      startTime: chunk[j].startTime,
      endTime: chunk[j].endTime,
      sourceClipId: chunk[j].clipId,
      position: { x: gw.x / 100, y: gw.y / 100 },
      fontSize: gw.fontSize / 100,
      width: gw.width / 100,
      color: '#ffffff',
      fontFamily: processedWords[j].fontFamily,
      fontWeight: processedWords[j].fontWeight,
      textCase: processedWords[j].textCase,
      animation: getWordAnimation(block.settings.animationStyle, globalWordIndex + j),
      isCentered: gw.isCentered,
      layoutStyle: layoutStyle
    }));

    assignColors(sceneWords, block.settings.paletteId, block.settings.randomMode, block.settings.customColors);
    kineticWords.push(...sceneWords);

    globalWordIndex += chunk.length;
    chunkIndex++;
  }

  return kineticWords;
};
