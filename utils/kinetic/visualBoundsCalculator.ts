import { measureText } from './kineticTextMeasure';

export interface VisualBoundsOptions {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight?: string;
  textCase?: 'uppercase' | 'lowercase' | 'original';
  strokeWidth?: number;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  backgroundPadding?: number;
  rotation?: number; // in degrees
}

export interface VisualBounds {
  width: number;
  height: number;
  rawWidth: number;
  rawHeight: number;
  offsetX: number;
  offsetY: number;
}

export function calculateVisualBounds(
  options: VisualBoundsOptions
): VisualBounds {
  const {
    text,
    fontFamily,
    fontSize,
    fontWeight = 'normal',
    textCase = 'original',
    strokeWidth = 0,
    shadowBlur = 0,
    shadowOffsetX = 0,
    shadowOffsetY = 0,
    backgroundPadding = 0,
    rotation = 0,
  } = options;

  let processedText = text;
  if (textCase === 'uppercase') processedText = processedText.toUpperCase();
  else if (textCase === 'lowercase') processedText = processedText.toLowerCase();

  const fontString = `${fontWeight} ${fontSize}px ${fontFamily}`;

  // 1. Get raw text dimensions
  const rawMetrics = measureText(processedText, fontString, fontSize);
  const rawWidth = rawMetrics.width;
  const rawHeight = rawMetrics.height;

  // 2. Add padding, stroke, and shadow to get the unrotated visual bounds
  const expandLeft = Math.max(0, -shadowOffsetX) + shadowBlur + strokeWidth + backgroundPadding;
  const expandRight = Math.max(0, shadowOffsetX) + shadowBlur + strokeWidth + backgroundPadding;
  const expandTop = Math.max(0, -shadowOffsetY) + shadowBlur + strokeWidth + backgroundPadding;
  const expandBottom = Math.max(0, shadowOffsetY) + shadowBlur + strokeWidth + backgroundPadding;

  const unrotatedWidth = rawWidth + expandLeft + expandRight;
  const unrotatedHeight = rawHeight + expandTop + expandBottom;

  // 3. Apply rotation
  const rad = (rotation * Math.PI) / 180;
  
  const rotatedWidth = Math.abs(unrotatedWidth * Math.cos(rad)) + Math.abs(unrotatedHeight * Math.sin(rad));
  const rotatedHeight = Math.abs(unrotatedWidth * Math.sin(rad)) + Math.abs(unrotatedHeight * Math.cos(rad));

  return {
    width: rotatedWidth,
    height: rotatedHeight,
    rawWidth,
    rawHeight,
    offsetX: expandLeft,
    offsetY: expandTop,
  };
}
