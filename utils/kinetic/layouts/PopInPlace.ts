import { KineticSettings } from '../../../types/kinetic';

export const generatePopInPlace = (words: string[], settings: KineticSettings) => {
  return words.map((text) => ({
    text,
    x: 50,
    y: 50,
    fontSize: 80, // Max font size as requested
    width: 100,
    transform: 'translate(-50%, -50%)'
  }));
};
