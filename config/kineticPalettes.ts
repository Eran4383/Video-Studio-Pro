export interface KineticPalette {
  id: string;
  name: string;
  colors: string[];
  background?: string;
}

export const KINETIC_PALETTES: KineticPalette[] = [
  {
    id: 'Hormozi',
    name: 'Hormozi Style',
    colors: ['#FFD700', '#FFFFFF', '#00FF00'], // Gold, White, Green
    background: '#000000'
  },
  {
    id: 'Corporate',
    name: 'Corporate Clean',
    colors: ['#3B82F6', '#9CA3AF', '#FFFFFF'], // Blue, Gray, White
  },
  {
    id: 'Neon',
    name: 'Cyberpunk Neon',
    colors: ['#F472B6', '#22D3EE', '#FFFF00'], // Pink, Cyan, Yellow
    background: '#111827'
  }
];

export const getPalette = (id: string) => KINETIC_PALETTES.find(p => p.id === id) || KINETIC_PALETTES[0];
