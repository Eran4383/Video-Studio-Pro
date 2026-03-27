
import React, { useState, useEffect } from 'react';

/**
 * ScrubSlider (Pure UI Component)
 * 
 * A dumb UI component for numeric input and range sliding.
 * It maintains local state for immediate feedback but delegates all logic
 * to props (onInteractionStart, onPreview, onCommit).
 */

interface ScrubSliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
  onInteractionStart: () => void;
  onPreview: (value: number) => void;
  onCommit: (value: number) => void;
}

export const ScrubSlider: React.FC<ScrubSliderProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  className = '',
  onInteractionStart,
  onPreview,
  onCommit,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isInteracting, setIsInteracting] = useState(false);

  // Sync local value with external value only when NOT interacting
  useEffect(() => {
    if (!isInteracting) {
      setLocalValue(value);
    }
  }, [value, isInteracting]);

  const handleStart = () => {
    setIsInteracting(true);
    onInteractionStart();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseFloat(e.target.value);
    if (!isNaN(newVal)) {
      setLocalValue(newVal);
      onPreview(newVal);
    }
  };

  const handleEnd = () => {
    if (!isInteracting) return;
    setIsInteracting(false);
    onCommit(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEnd();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 group ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider select-none">
          {label}
        </span>
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 w-[4.5rem] focus-within:border-indigo-500/50 transition-colors">
          <input
            type="number"
            value={localValue}
            onFocus={handleStart}
            onChange={handleInputChange}
            onBlur={handleEnd}
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
        onMouseDown={handleStart}
        onChange={handleInputChange}
        onMouseUp={handleEnd}
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 active:accent-indigo-600 transition-all"
      />
    </div>
  );
};
