import React, { useState, useEffect, useRef } from 'react';

interface ProSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  previewId: string; // Property name for live override (e.g., 'scale', 'rotation')
  clipId: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
}

export const ProSlider: React.FC<ProSliderProps> = ({
  label,
  value,
  onChange,
  previewId,
  clipId,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  className = ''
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);

  // Sync local value when external value changes (unless dragging)
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const newVal = parseFloat((e.target as HTMLInputElement).value);
    setLocalValue(newVal);
    
    // Dispatch visual override event - bypasses React/Store
    window.dispatchEvent(new CustomEvent('gfx-override', { 
      detail: { 
        clipId, 
        property: previewId, 
        value: newVal 
      } 
    }));
  };

  const handleCommit = () => {
    setIsDragging(false);
    onChange(localValue);
    
    // Clear override so the store value takes over
    window.dispatchEvent(new CustomEvent('gfx-override-clear'));
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setLocalValue(val);
      // Also dispatch override for number input
      window.dispatchEvent(new CustomEvent('gfx-override', { 
        detail: { 
          clipId, 
          property: previewId, 
          value: val 
        } 
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommit();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 w-[4.5rem] focus-within:border-indigo-500/50 transition-colors">
            <input
                type="number"
                value={localValue}
                onChange={handleNumberChange}
                onBlur={handleCommit}
                onKeyDown={handleKeyDown}
                step={step}
                className="w-full bg-transparent text-[10px] text-white font-mono text-right outline-none appearance-none p-0"
            />
            {unit && <span className="text-[10px] text-zinc-600 font-mono select-none">{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onInput={handleInput}
        onMouseDown={handleMouseDown}
        onMouseUp={handleCommit}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleCommit}
        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 active:accent-indigo-600 transition-all"
      />
    </div>
  );
};
