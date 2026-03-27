
export interface EffectDefinition {
  id: string;
  name: string;
  type: 'filter' | 'adjustment' | 'transition' | 'motion';
  category: 'Filters' | 'Transitions' | 'Motion' | 'Stylize';
  description: string;
  icon: string;
  defaultParams: Record<string, any>;
  controls: EffectControl[];
}

export interface EffectControl {
  id: string;
  name: string;
  type: 'slider' | 'toggle' | 'color';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export const EFFECTS_LIBRARY: EffectDefinition[] = [
  // --- FILTERS ---
  {
    id: 'blur',
    name: 'Gaussian Blur',
    type: 'filter',
    category: 'Filters',
    description: 'Softens the image with a Gaussian blur.',
    icon: 'Cloud',
    defaultParams: { amount: 5 },
    controls: [
      { id: 'amount', name: 'Amount', type: 'slider', min: 0, max: 50, step: 1, unit: 'px' }
    ]
  },
  {
    id: 'grayscale',
    name: 'Grayscale',
    type: 'filter',
    category: 'Filters',
    description: 'Converts the image to black and white.',
    icon: 'Circle',
    defaultParams: { amount: 100 },
    controls: [
      { id: 'amount', name: 'Intensity', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'sepia',
    name: 'Sepia',
    type: 'filter',
    category: 'Filters',
    description: 'Applies a vintage sepia tone.',
    icon: 'History',
    defaultParams: { amount: 100 },
    controls: [
      { id: 'amount', name: 'Intensity', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'invert',
    name: 'Invert',
    type: 'filter',
    category: 'Filters',
    description: 'Inverts the colors of the image.',
    icon: 'RefreshCw',
    defaultParams: { amount: 100 },
    controls: [
      { id: 'amount', name: 'Intensity', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }
    ]
  },

  // --- MOTION ---
  {
    id: 'zoom-in',
    name: 'Zoom In',
    type: 'motion',
    category: 'Motion',
    description: 'Gradually zooms into the center of the clip.',
    icon: 'Maximize',
    defaultParams: { speed: 1.2, ease: true },
    controls: [
      { id: 'speed', name: 'Zoom Speed', type: 'slider', min: 1, max: 5, step: 0.1, unit: 'x' },
      { id: 'ease', name: 'Easing', type: 'toggle' }
    ]
  },
  {
    id: 'zoom-out',
    name: 'Zoom Out',
    type: 'motion',
    category: 'Motion',
    description: 'Gradually zooms out from the center.',
    icon: 'Minimize',
    defaultParams: { speed: 0.8, ease: true },
    controls: [
      { id: 'speed', name: 'Zoom Speed', type: 'slider', min: 0.1, max: 1, step: 0.1, unit: 'x' },
      { id: 'ease', name: 'Easing', type: 'toggle' }
    ]
  },

  // --- TRANSITIONS ---
  {
    id: 'crossfade',
    name: 'Crossfade',
    type: 'transition',
    category: 'Transitions',
    description: 'Smoothly fades between two clips.',
    icon: 'Layers',
    defaultParams: { duration: 1 },
    controls: [
      { id: 'duration', name: 'Duration', type: 'slider', min: 0.1, max: 5, step: 0.1, unit: 's' }
    ]
  },
  {
    id: 'wipe-right',
    name: 'Wipe Right',
    type: 'transition',
    category: 'Transitions',
    description: 'Wipes from left to right.',
    icon: 'ArrowRight',
    defaultParams: { duration: 1 },
    controls: [
      { id: 'duration', name: 'Duration', type: 'slider', min: 0.1, max: 5, step: 0.1, unit: 's' }
    ]
  }
];
