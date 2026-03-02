
import { useState } from 'react';

export type ShortcutAction = 'play_pause' | 'split' | 'delete' | 'undo' | 'redo' | 'zoom_in' | 'zoom_out' | 'toggle_magnet';

export interface ShortcutMapping {
  action: ShortcutAction;
  key: string;
  label: string;
  ctrl?: boolean;
  shift?: boolean;
}

const DEFAULT_SHORTCUTS: ShortcutMapping[] = [
  { action: 'play_pause', key: 'Space', label: 'Play / Pause' },
  { action: 'split', key: 'KeyS', label: 'Split Clip' },
  { action: 'split', key: 'KeyB', label: 'Split Clip (Alternative)' },
  { action: 'delete', key: 'Delete', label: 'Delete Selected' },
  { action: 'delete', key: 'Backspace', label: 'Delete Selected (Alt)' },
  { action: 'undo', key: 'KeyZ', label: 'Undo', ctrl: true },
  { action: 'redo', key: 'KeyZ', label: 'Redo', ctrl: true, shift: true },
  { action: 'zoom_in', key: 'Equal', label: 'Zoom In', ctrl: true },
  { action: 'zoom_out', key: 'Minus', label: 'Zoom Out', ctrl: true },
  { action: 'toggle_magnet', key: 'KeyM', label: 'Toggle Magnetism' },
];

export const useShortcutStore = () => {
  const [shortcuts, setShortcuts] = useState<ShortcutMapping[]>(() => {
    const saved = localStorage.getItem('nexus_shortcuts');
    return saved ? JSON.parse(saved) : DEFAULT_SHORTCUTS;
  });

  const updateShortcut = (action: ShortcutAction, index: number, newKey: string, ctrl: boolean = false, shift: boolean = false) => {
    const updated = [...shortcuts];
    updated[index] = { ...updated[index], key: newKey, ctrl, shift };
    setShortcuts(updated);
    localStorage.setItem('nexus_shortcuts', JSON.stringify(updated));
  };

  const getAction = (e: KeyboardEvent): ShortcutAction | null => {
    const match = shortcuts.find(s => 
      s.key === e.code && 
      (s.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey)) &&
      (s.shift ? e.shiftKey : !e.shiftKey)
    );
    return match ? match.action : null;
  };

  return { shortcuts, updateShortcut, getAction };
};
