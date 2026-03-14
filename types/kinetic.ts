import { Clip } from '../types';

export type KineticLayoutStyle = 'pop-in-place' | 'dynamic-collage' | 'karaoke';
export type KineticAnimationStyle = 'pop' | 'slide-up' | 'scale' | 'fade';

export interface KineticBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface KineticWord {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  sourceClipId: string;
  // Absolute percentages relative to the bounding box
  position: {
    x: number;
    y: number;
  };
  fontSize: number; // in percentage relative to bounding box height
  scale?: number;
  anchor?: { x: number; y: number };
  width?: number; // optional pre-calculated width percentage
  color: string;
  fontFamily: string;
  fontWeight?: string;
  textCase?: 'uppercase' | 'lowercase' | 'original';
  animation: KineticAnimationStyle;
  stretchX?: boolean;
  stretchY?: boolean;
  isCentered?: boolean;
  layoutStyle?: KineticLayoutStyle;
  sceneEndTime: number;
  // Advanced styling
  strokeWidth?: number;
  strokeColor?: string;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  backgroundColor?: string;
  backgroundPadding?: number;
  rotation?: number;
}

export interface KineticSettings {
  boundingBox: KineticBoundingBox;
  layoutStyle: KineticLayoutStyle | KineticLayoutStyle[];
  layoutMultiSelect?: boolean;
  layoutWeights?: Record<string, number>;
  animationStyle: KineticAnimationStyle | KineticAnimationStyle[] | 'random';
  animationOrder: 'reading' | 'random';
  direction: 'ltr' | 'rtl' | 'auto';
  paletteId: string;
  primaryFont: string;
  secondaryFont: string;
  randomMode: boolean; // if true, randomize colors/fonts from palette
  gap: number; // gap between rows/words in percentage
  blockHandling: 'separate' | 'combined';
  maxWordsVisible?: number; // 0 means unlimited
  maxTimeGap?: number; // max gap between words in seconds to split scenes
  showBox?: boolean;
  customColors?: string[];
  savedCustomPalettes?: string[][];
  keepPastInCollage?: boolean;
  keepPastInKaraoke?: boolean;
  keepPastInPop?: boolean;
  karaokeMode?: 'single-line' | 'multi-line';
  karaokeSizePattern?: 'uniform' | 'random' | 'ascending' | 'descending';
  animationMultiSelect?: boolean;
  fontMultiSelect?: boolean;
  fonts?: string[]; // Array of selected fonts
  pastWordsOpacity?: number; // 0-100, default 40
  pastWordsFadeDuration?: number; // seconds, default 0.5
  fontWeight?: string; // default '900', can be 'random'
  textCase?: 'uppercase' | 'lowercase' | 'original' | 'random';
  lineHeight?: number; // default 1
  
  // Advanced styling
  strokeWidth?: number;
  strokeColor?: string;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  backgroundColor?: string;
  backgroundPadding?: number;
  rotation?: number;

  // Legacy compatibility (optional, to be removed after full refactor)
  preset?: string;
}

export interface KineticBlock {
  id: string;
  name: string;
  color: string;
  startTime: number;
  endTime: number;
  clipIds: string[];
  settings: KineticSettings;
  words: KineticWord[];
  wordOverrides?: Record<string, Partial<KineticWord>>;
}
