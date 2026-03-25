import { Clip } from '../../types';
import { KineticBlock, KineticSettings, KineticWord, KineticAnimationStyle, KineticLayoutStyle } from '../../types/kinetic';
import { generateDynamicCollage } from './layouts/DynamicCollage';
import { generatePopInPlace } from './layouts/PopInPlace';
import { generateKaraoke } from './layouts/Karaoke';
import { generateTetrisLayout } from './layouts/TetrisLayout';
import { assignColors } from './KineticColorEngine';

export interface ProcessedWord {
  originalText: string;
  text: string;
  fontFamily: string;
  fontWeight: string;
  textCase: 'uppercase' | 'lowercase' | 'original';
}

const ANIMATIONS: KineticAnimationStyle[] = ['pop', 'slide-up', 'scale', 'fade'];

const DEFAULT_LAYOUT_WEIGHTS: Record<string, number> = {
  'pop-in-place': 50,
  'dynamic-collage': 30,
  'karaoke': 10,
  'tetris': 10
};

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

const resolveRandomBoolean = (val: boolean | 'random' | undefined, defaultValue = false): boolean => {
  if (val === 'random') return Math.random() > 0.5;
  return val ?? defaultValue;
};

const resolveRandomColor = (val: string | 'random' | undefined, defaultValue = '#000000'): string => {
  if (val === 'random') {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }
  return val ?? defaultValue;
};

const resolveRandomNumber = (val: number | 'random' | undefined, min: number, max: number, defaultValue: number): number => {
  if (val === 'random') {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return val ?? defaultValue;
};

export const generateKineticLayout = (clipId: string, content: string, duration: number, settings: KineticSettings, fallbackFont: string, screenAR: number): KineticWord[] => {
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
      geometricWords = generatePopInPlace(processedWords, settings, screenAR);
      break;
    case 'karaoke':
      geometricWords = generateKaraoke(processedWords, settings, screenAR);
      break;
    case 'tetris':
      geometricWords = generateTetrisLayout(processedWords, settings, isRtl, screenAR);
      break;
    case 'dynamic-collage':
    default:
      geometricWords = generateDynamicCollage(processedWords, settings, isRtl, screenAR);
      break;
  }

  // 2. Timing
  const wordDuration = duration / processedWords.length;

    // 3. Construct KineticWords
  const currentSceneEndTime = duration;
  const kineticWords: KineticWord[] = geometricWords.map((gw, index) => ({
    id: `${clipId}-word-${index}`,
    text: gw.text,
    startTime: index * wordDuration, // Relative time 0-based
    endTime: (index + 1) * wordDuration,
    sourceClipId: clipId, // Will be set in block layout
    position: { x: gw.x / 100, y: gw.y / 100 }, // Normalize 0-100 to 0-1
    fontSize: gw.fontSize / 100, // Normalize 0-100 to 0-1
    width: gw.width / 100, // Normalize 0-100 to 0-1
    color: '#ffffff', // Placeholder, will be assigned
    fontFamily: processedWords[index].fontFamily,
    fontWeight: processedWords[index].fontWeight,
    textCase: processedWords[index].textCase,
    animation: getWordAnimation(settings.animationStyle, index),
    isCentered: gw.isCentered,
    layoutStyle: layoutStyle,
    sceneEndTime: currentSceneEndTime,
    rotation: gw.rotation,
    shadowEnabled: resolveRandomBoolean(settings.shadowEnabled),
    shadowColor: resolveRandomColor(settings.shadowColor),
    shadowBlur: resolveRandomNumber(settings.shadowBlur, 0, 20, 4),
    shadowOffsetX: resolveRandomNumber(settings.shadowOffsetX, -10, 10, 2),
    shadowOffsetY: resolveRandomNumber(settings.shadowOffsetY, -10, 10, 2),
  }));

  // 4. Assign Colors
  assignColors(kineticWords, settings.paletteId, settings.randomMode, settings.customColors);

  // Post-processing: Clamp word width to 90% of screen width and keep within bounds
  kineticWords.forEach(word => {
    if (word.width > 0.90) {
      const scaleFactor = 0.90 / word.width;
      word.fontSize *= scaleFactor;
      word.width = 0.90;
    }
    if (word.fontSize > 0.90) {
      const scaleFactor = 0.90 / word.fontSize;
      word.width *= scaleFactor;
      word.fontSize = 0.90;
    }

    const halfW = word.width / 2;
    const halfH = (word.fontSize || 0.1) / 2;

    if (word.isCentered) {
      word.position.x = Math.max(halfW + 0.05, Math.min(0.95 - halfW, word.position.x));
      word.position.y = Math.max(halfH + 0.05, Math.min(0.95 - halfH, word.position.y));
    } else {
      word.position.x = Math.max(0.05, Math.min(0.95 - word.width, word.position.x));
      word.position.y = Math.max(0.05, Math.min(0.95 - (word.fontSize || 0.1), word.position.y));
    }
  });

  return kineticWords;
};

export const generateBlockLayout = (block: KineticBlock, projectClips: Clip[], screenAR: number): KineticWord[] => {
  const clips = projectClips
    .filter(c => block.clipIds.includes(c.id))
    .sort((a, b) => a.startTime - b.startTime);

  if (clips.length === 0) return [];

  const allWords: { text: string, startTime: number, endTime: number, clipId: string, wordIndexInClip: number }[] = [];
  clips.forEach(clip => {
    const words = (clip.content || '').split(/\s+/).filter(w => w.length > 0);
    const wordDuration = clip.duration / words.length;
    words.forEach((text, i) => {
      allWords.push({
        text,
        startTime: clip.startTime + (i * wordDuration),
        endTime: clip.startTime + ((i + 1) * wordDuration),
        clipId: clip.id,
        wordIndexInClip: i
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
      const maxGap = block.settings.maxTimeGap ?? 0.4;
      
      let shouldBreak = false;
      if (gap > maxGap) {
        shouldBreak = true;
      } else if (currentChunk.length >= maxWords) {
        // Look ahead to see if only 1 or 2 words remain until next natural gap
        let wordsInSequence = 0;
        let lastWord = previousWord;
        for (let j = i; j < allWords.length; j++) {
          const nextW = allWords[j];
          const g = nextW.startTime - lastWord.endTime;
          if (g > maxGap) break;
          wordsInSequence++;
          lastWord = nextW;
          if (wordsInSequence > 2) break;
        }
        
        if (wordsInSequence > 2) {
          shouldBreak = true;
        }
      }

      if (shouldBreak) {
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

  // Create weighted pool for layout selection
  const weightedPool: KineticLayoutStyle[] = [];
  
  // If user hasn't set weights, or if they want the "Balanced Random" weights
  const activeWeights = { ...DEFAULT_LAYOUT_WEIGHTS };
  // Filter weights to only include selected layout styles
  const selectedStyles = new Set(layoutStyles);
  
  let totalWeight = 0;
  layoutStyles.forEach(style => {
    const weight = block.settings.layoutWeights?.[style] ?? activeWeights[style] ?? 1;
    totalWeight += weight;
  });

  layoutStyles.forEach(style => {
    const weight = block.settings.layoutWeights?.[style] ?? activeWeights[style] ?? 1;
    // Normalize weights if needed, but here we just use them as counts in the pool
    for (let i = 0; i < weight; i++) {
      weightedPool.push(style as KineticLayoutStyle);
    }
  });

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

    // Select layout style from weighted pool
    const layoutStyle = weightedPool.length > 0 
      ? weightedPool[Math.floor(Math.random() * weightedPool.length)]
      : layoutStyles[chunkIndex % layoutStyles.length];
    
    // Generate layout for this scene
    let geometricWords: any[] = [];
    switch (layoutStyle) {
      case 'pop-in-place':
        geometricWords = generatePopInPlace(processedWords, block.settings, screenAR);
        break;
      case 'karaoke':
        geometricWords = generateKaraoke(processedWords, block.settings, screenAR);
        break;
      case 'tetris':
        geometricWords = generateTetrisLayout(processedWords, block.settings, false, screenAR);
        break;
      case 'dynamic-collage':
      default:
        geometricWords = generateDynamicCollage(processedWords, block.settings, false, screenAR);
        break;
    }
    
    // Assign colors
    const currentSceneEndTime = chunk[chunk.length - 1].endTime;
    const chunkId = `chunk-${block.id}-${chunkIndex}`;
    const sceneWords: KineticWord[] = geometricWords.map((gw, j) => ({
      id: `${chunk[j].clipId}-word-${chunk[j].wordIndexInClip}`,
      text: gw.text,
      startTime: chunk[j].startTime,
      endTime: chunk[j].endTime,
      sourceClipId: chunk[j].clipId,
      chunkId: chunkId,
      position: { x: gw.x / 100, y: gw.y / 100 },
      fontSize: gw.fontSize / 100,
      width: gw.width / 100,
      color: '#ffffff',
      fontFamily: processedWords[j].fontFamily,
      fontWeight: processedWords[j].fontWeight,
      textCase: processedWords[j].textCase,
      animation: getWordAnimation(block.settings.animationStyle, globalWordIndex + j),
      isCentered: gw.isCentered,
      layoutStyle: layoutStyle,
      sceneEndTime: currentSceneEndTime,
      rotation: gw.rotation,
      shadowEnabled: resolveRandomBoolean(block.settings.shadowEnabled),
      shadowColor: resolveRandomColor(block.settings.shadowColor),
      shadowBlur: resolveRandomNumber(block.settings.shadowBlur, 0, 20, 4),
      shadowOffsetX: resolveRandomNumber(block.settings.shadowOffsetX, -10, 10, 2),
      shadowOffsetY: resolveRandomNumber(block.settings.shadowOffsetY, -10, 10, 2),
    }));

    assignColors(sceneWords, block.settings.paletteId, block.settings.randomMode, block.settings.customColors);
    kineticWords.push(...sceneWords);

    globalWordIndex += chunk.length;
    chunkIndex++;
  }

  // Post-processing: Clamp word width to 90% of screen width and keep within bounds
  kineticWords.forEach(word => {
    if (word.width > 0.90) {
      const scaleFactor = 0.90 / word.width;
      word.fontSize *= scaleFactor;
      word.width = 0.90;
    }
    if (word.fontSize > 0.90) {
      const scaleFactor = 0.90 / word.fontSize;
      word.width *= scaleFactor;
      word.fontSize = 0.90;
    }

    const halfW = word.width / 2;
    const halfH = (word.fontSize || 0.1) / 2;

    if (word.isCentered) {
      word.position.x = Math.max(halfW + 0.05, Math.min(0.95 - halfW, word.position.x));
      word.position.y = Math.max(halfH + 0.05, Math.min(0.95 - halfH, word.position.y));
    } else {
      word.position.x = Math.max(0.05, Math.min(0.95 - word.width, word.position.x));
      word.position.y = Math.max(0.05, Math.min(0.95 - (word.fontSize || 0.1), word.position.y));
    }
  });

  return kineticWords;
};
