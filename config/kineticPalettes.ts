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
    colors: ['#FFD700', '#FFFFFF', '#00FF00', '#FF3366', '#00E5FF'], // Gold, White, Green, Pink, Cyan
    background: '#000000'
  },
  {
    id: 'Corporate',
    name: 'Corporate Clean',
    colors: ['#3B82F6', '#9CA3AF', '#FFFFFF', '#1E40AF', '#F3F4F6'], // Blue, Gray, White, Dark Blue, Light Gray
  },
  {
    id: 'Neon',
    name: 'Cyberpunk Neon',
    colors: ['#F472B6', '#22D3EE', '#FFFF00', '#FF003C', '#00FF9D'], // Pink, Cyan, Yellow, Red, Mint
    background: '#111827'
  },
  {
    id: 'Ocean',
    name: 'Ocean Blue',
    colors: ['#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8', '#03045E'], // Various blues
  },
  {
    id: 'Sunset',
    name: 'Sunset Vibes',
    colors: ['#FF7B54', '#FFB26B', '#FFD56F', '#939B62', '#E25E3E'], // Orange, Yellow, Greenish, Reddish
  },
  {
    id: 'Synthwave',
    name: 'Synthwave',
    colors: ['#FF007F', '#7928CA', '#00D4FF', '#FFD700', '#FF4500'], // Hot Pink, Purple, Cyan, Gold, Orange Red
  },
  {
    id: 'Custom',
    name: 'Custom Palette',
    colors: [], // Will be filled from settings.customColors
  },
  {
    id: 'Random',
    name: 'Random Palette',
    colors: ['#ffffff', '#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'], // Placeholder colors for UI
  }
];

export const getPalette = (id: string) => {
  if (id === 'Random') {
    const realPalettes = KINETIC_PALETTES.filter(p => p.id !== 'Random' && p.id !== 'Custom');
    return realPalettes[Math.floor(Math.random() * realPalettes.length)];
  }
  return KINETIC_PALETTES.find(p => p.id === id) || KINETIC_PALETTES[0];
};
