
export interface EffectDefinition {
  id: string;
  name: string;
  type: 'filter' | 'adjustment' | 'transition' | 'motion';
  category: 'Filters' | 'Transitions' | 'Motion' | 'Stylize' | 'Adjustment Layers';
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
    id: 'crop',
    name: 'Crop',
    type: 'filter',
    category: 'Filters',
    description: 'Crops the edges of the video.',
    icon: 'Crop',
    defaultParams: { top: 0, bottom: 0, left: 0, right: 0 },
    controls: [
      { id: 'top', name: 'Top', type: 'slider', min: 0, max: 50, step: 1, unit: '%' },
      { id: 'bottom', name: 'Bottom', type: 'slider', min: 0, max: 50, step: 1, unit: '%' },
      { id: 'left', name: 'Left', type: 'slider', min: 0, max: 50, step: 1, unit: '%' },
      { id: 'right', name: 'Right', type: 'slider', min: 0, max: 50, step: 1, unit: '%' }
    ]
  },
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
  {
    id: 'brightness',
    name: 'Brightness',
    type: 'filter',
    category: 'Filters',
    description: 'Adjusts the brightness of the image.',
    icon: 'Sun',
    defaultParams: { amount: 100 },
    controls: [
      { id: 'amount', name: 'Amount', type: 'slider', min: 0, max: 200, step: 1, unit: '%' }
    ]
  },
  {
    id: 'contrast',
    name: 'Contrast',
    type: 'filter',
    category: 'Filters',
    description: 'Adjusts the contrast of the image.',
    icon: 'Contrast',
    defaultParams: { amount: 100 },
    controls: [
      { id: 'amount', name: 'Amount', type: 'slider', min: 0, max: 200, step: 1, unit: '%' }
    ]
  },
  {
    id: 'hue-rotate',
    name: 'Hue Rotate',
    type: 'filter',
    category: 'Filters',
    description: 'Rotates the hue of the image.',
    icon: 'RotateCw',
    defaultParams: { amount: 0 },
    controls: [
      { id: 'amount', name: 'Angle', type: 'slider', min: 0, max: 360, step: 1, unit: '°' }
    ]
  },
  {
    id: 'saturate',
    name: 'Saturate',
    type: 'filter',
    category: 'Filters',
    description: 'Adjusts the saturation of the image.',
    icon: 'Droplets',
    defaultParams: { amount: 100 },
    controls: [
      { id: 'amount', name: 'Amount', type: 'slider', min: 0, max: 200, step: 1, unit: '%' }
    ]
  },

  // --- STYLIZE ---
  {
    id: 'flicker',
    name: 'Flicker',
    type: 'filter',
    category: 'Stylize',
    description: 'Adds a rapid brightness flicker effect.',
    icon: 'Zap',
    defaultParams: { intensity: 50, speed: 50 },
    controls: [
      { id: 'intensity', name: 'Intensity', type: 'slider', min: 0, max: 100, step: 1, unit: '%' },
      { id: 'speed', name: 'Speed', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'flash',
    name: 'Flash Strobe',
    type: 'filter',
    category: 'Stylize',
    description: 'Intense, rhythmic white flashes popular in edits.',
    icon: 'Sun',
    defaultParams: { speed: 80, brightness: 100 },
    controls: [
      { id: 'speed', name: 'Speed', type: 'slider', min: 0, max: 100, step: 1, unit: '%' },
      { id: 'brightness', name: 'Brightness', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'rgb-split',
    name: 'RGB Split',
    type: 'filter',
    category: 'Stylize',
    description: 'Separates color channels for a chromatic aberration effect.',
    icon: 'Layers',
    defaultParams: { distance: 10, angle: 45 },
    controls: [
      { id: 'distance', name: 'Distance', type: 'slider', min: 0, max: 100, step: 1, unit: 'px' },
      { id: 'angle', name: 'Angle', type: 'slider', min: 0, max: 360, step: 1, unit: '°' }
    ]
  },
  {
    id: 'glitch',
    name: 'Glitch',
    type: 'filter',
    category: 'Stylize',
    description: 'Digital distortion and color splitting.',
    icon: 'Activity',
    defaultParams: { intensity: 50 },
    controls: [
      { id: 'intensity', name: 'Intensity', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'vhs',
    name: 'VHS Retro',
    type: 'filter',
    category: 'Stylize',
    description: 'Vintage VHS tape effect with scanlines.',
    icon: 'Tv',
    defaultParams: { noise: 30, colorBleed: 50 },
    controls: [
      { id: 'noise', name: 'Noise', type: 'slider', min: 0, max: 100, step: 1, unit: '%' },
      { id: 'colorBleed', name: 'Color Bleed', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'film-grain',
    name: 'Film Grain',
    type: 'filter',
    category: 'Stylize',
    description: 'Cinematic 8mm/16mm film grain overlay.',
    icon: 'Film',
    defaultParams: { amount: 40, size: 1.5 },
    controls: [
      { id: 'amount', name: 'Amount', type: 'slider', min: 0, max: 100, step: 1, unit: '%' },
      { id: 'size', name: 'Size', type: 'slider', min: 0.1, max: 5, step: 0.1, unit: 'x' }
    ]
  },

  // --- ADJUSTMENT LAYERS ---
  {
    id: 'color-grade',
    name: 'Color Grade',
    type: 'adjustment',
    category: 'Adjustment Layers',
    description: 'Global color adjustments for the entire scene.',
    icon: 'Palette',
    defaultParams: { brightness: 100, contrast: 100, saturation: 100, hue: 0 },
    controls: [
      { id: 'brightness', name: 'Brightness', type: 'slider', min: 0, max: 200, step: 1, unit: '%' },
      { id: 'contrast', name: 'Contrast', type: 'slider', min: 0, max: 200, step: 1, unit: '%' },
      { id: 'saturation', name: 'Saturation', type: 'slider', min: 0, max: 200, step: 1, unit: '%' },
      { id: 'hue', name: 'Hue', type: 'slider', min: 0, max: 360, step: 1, unit: '°' }
    ]
  },
  {
    id: 'vignette',
    name: 'Vignette',
    type: 'adjustment',
    category: 'Adjustment Layers',
    description: 'Adds a dark border around the edges.',
    icon: 'Circle',
    defaultParams: { amount: 50, size: 70 },
    controls: [
      { id: 'amount', name: 'Intensity', type: 'slider', min: 0, max: 100, step: 1, unit: '%' },
      { id: 'size', name: 'Size', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'cinematic-look',
    name: 'Cinematic Look',
    type: 'adjustment',
    category: 'Adjustment Layers',
    description: 'Applies a cinematic blue-teal color grade.',
    icon: 'Film',
    defaultParams: { intensity: 70 },
    controls: [
      { id: 'intensity', name: 'Intensity', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }
    ]
  },

  // --- MOTION ---
  {
    id: 'shake',
    name: 'Camera Shake',
    type: 'motion',
    category: 'Motion',
    description: 'Simulates handheld camera movement.',
    icon: 'Activity',
    defaultParams: { intensity: 50, speed: 50 },
    controls: [
      { id: 'intensity', name: 'Intensity', type: 'slider', min: 0, max: 100, step: 1, unit: '%' },
      { id: 'speed', name: 'Speed', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'jitter',
    name: 'Nervous Jitter',
    type: 'motion',
    category: 'Motion',
    description: 'Rapid, chaotic position jumping.',
    icon: 'Zap',
    defaultParams: { amount: 20, speed: 90 },
    controls: [
      { id: 'amount', name: 'Amount', type: 'slider', min: 0, max: 100, step: 1, unit: 'px' },
      { id: 'speed', name: 'Speed', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'pulse',
    name: 'Heartbeat Pulse',
    type: 'motion',
    category: 'Motion',
    description: 'Rhythmic scaling effect like a heartbeat.',
    icon: 'Heart',
    defaultParams: { scale: 1.1, speed: 60 },
    controls: [
      { id: 'scale', name: 'Scale', type: 'slider', min: 1, max: 2, step: 0.05, unit: 'x' },
      { id: 'speed', name: 'Speed', type: 'slider', min: 0, max: 100, step: 1, unit: 'bpm' }
    ]
  },
  {
    id: 'spin',
    name: 'Spin',
    type: 'motion',
    category: 'Motion',
    description: 'Rotates the clip continuously.',
    icon: 'RotateCw',
    defaultParams: { speed: 50, direction: 1 },
    controls: [
      { id: 'speed', name: 'Speed', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'zoom-blur',
    name: 'Zoom Blur',
    type: 'motion',
    category: 'Motion',
    description: 'Dynamic zoom with directional blur.',
    icon: 'Focus',
    defaultParams: { amount: 50, center: 50 },
    controls: [
      { id: 'amount', name: 'Blur Amount', type: 'slider', min: 0, max: 100, step: 1, unit: '%' },
      { id: 'center', name: 'Center Focus', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
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
    id: 'whip-pan',
    name: 'Whip Pan',
    type: 'transition',
    category: 'Transitions',
    description: 'Fast, blurry camera pan transition.',
    icon: 'FastForward',
    defaultParams: { duration: 0.5, direction: 1 },
    controls: [
      { id: 'duration', name: 'Duration', type: 'slider', min: 0.1, max: 2, step: 0.1, unit: 's' }
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
  },
  {
    id: 'zoom-transition',
    name: 'Zoom Transition',
    type: 'transition',
    category: 'Transitions',
    description: 'Dynamic zoom effect between clips.',
    icon: 'Maximize',
    defaultParams: { duration: 0.8, intensity: 50 },
    controls: [
      { id: 'duration', name: 'Duration', type: 'slider', min: 0.1, max: 5, step: 0.1, unit: 's' },
      { id: 'intensity', name: 'Intensity', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'glitch-transition',
    name: 'Glitch Transition',
    type: 'transition',
    category: 'Transitions',
    description: 'Digital glitch distortion transition.',
    icon: 'Activity',
    defaultParams: { duration: 0.4, intensity: 70 },
    controls: [
      { id: 'duration', name: 'Duration', type: 'slider', min: 0.1, max: 2, step: 0.1, unit: 's' },
      { id: 'intensity', name: 'Intensity', type: 'slider', min: 0, max: 100, step: 1, unit: '%' }
    ]
  },
  {
    id: 'blur-transition',
    name: 'Blur Transition',
    type: 'transition',
    category: 'Transitions',
    description: 'Smooth blur fade transition.',
    icon: 'Cloud',
    defaultParams: { duration: 1, blurAmount: 20 },
    controls: [
      { id: 'duration', name: 'Duration', type: 'slider', min: 0.1, max: 5, step: 0.1, unit: 's' },
      { id: 'blurAmount', name: 'Blur Amount', type: 'slider', min: 0, max: 100, step: 1, unit: 'px' }
    ]
  },
  {
    id: 'slide-up',
    name: 'Slide Up',
    type: 'transition',
    category: 'Transitions',
    description: 'Vertical slide transition.',
    icon: 'ArrowUp',
    defaultParams: { duration: 0.6 },
    controls: [
      { id: 'duration', name: 'Duration', type: 'slider', min: 0.1, max: 5, step: 0.1, unit: 's' }
    ]
  },
  {
    id: 'spin-transition',
    name: 'Spin Transition',
    type: 'transition',
    category: 'Transitions',
    description: 'Rotating transition effect.',
    icon: 'RotateCw',
    defaultParams: { duration: 0.8, rotations: 1 },
    controls: [
      { id: 'duration', name: 'Duration', type: 'slider', min: 0.1, max: 5, step: 0.1, unit: 's' },
      { id: 'rotations', name: 'Rotations', type: 'slider', min: 0.5, max: 3, step: 0.5, unit: 'x' }
    ]
  }
];
