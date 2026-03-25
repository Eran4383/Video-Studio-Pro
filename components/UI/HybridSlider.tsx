import React, { useState, useEffect, useRef, useCallback } from 'react';

interface HybridSliderProps {
  value: number;
  onChange: (value: number) => void;
  onFinalize?: () => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
}

export const HybridSlider = ({
  value,
  onChange,
  onFinalize,
  label,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  className = ''
}: HybridSliderProps) => {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const requestRef = useRef<number>();
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (!isDragging) setLocalValue(value);
  }, [value, isDragging]);

  const updateParent = useCallback((newValue: number) => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(() => {
      if (newValue !== lastValueRef.current) {
        onChange(newValue);
        lastValueRef.current = newValue;
      }
    });
  }, [onChange]);

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseFloat(e.target.value);
    setLocalValue(newVal);
    setIsDragging(true);
    updateParent(newVal);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const newVal = parseFloat(raw);
    if (!isNaN(newVal)) {
      setLocalValue(newVal);
      updateParent(newVal);
    } else {
      setLocalValue(raw as any); // Allow typing empty string or minus sign temporarily
    }
  };

  const handleFinalize = () => {
    setIsDragging(false);
    if (onFinalize) onFinalize();
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinalize();
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
                onBlur={handleFinalize}
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
        value={typeof localValue === 'number' ? localValue : 0}
        onChange={handleRangeChange}
        onMouseUp={handleFinalize}
        onTouchEnd={handleFinalize}
        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 active:accent-indigo-600 transition-all"
      />
    </div>
  );
};
