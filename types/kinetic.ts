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
  // Absolute percentages relative to the bounding box
  position: {
    x: number;
    y: number;
  };
  fontSize: number; // in percentage relative to bounding box height
  width?: number; // optional pre-calculated width percentage
  color: string;
  fontFamily: string;
  animation: KineticAnimationStyle;
}

export interface KineticSettings {
  boundingBox: KineticBoundingBox;
  layoutStyle: KineticLayoutStyle;
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
  showBox?: boolean;
  customColors?: string[];
  
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
}
