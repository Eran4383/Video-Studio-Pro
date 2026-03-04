import React, { useState, useRef, useEffect } from 'react';

interface ScrubbableInputProps {
  value: number;
  onChange: (value: number) => void;
  onFinalize?: () => void;
  label: string;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  className?: string;
}

export const ScrubbableInput: React.FC<ScrubbableInputProps> = ({
  value,
  onChange,
  onFinalize,
  label,
  step = 1,
  min,
  max,
  unit = '',
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef<number>(0);
  const startValue = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = e.clientX - startX.current;
      let newValue = startValue.current + delta * step;
      
      if (min !== undefined) newValue = Math.max(min, newValue);
      if (max !== undefined) newValue = Math.min(max, newValue);
      
      // Round to prevent floating point errors
      const precision = step < 1 ? Math.ceil(-Math.log10(step)) : 0;
      newValue = parseFloat(newValue.toFixed(precision));
      
      onChange(newValue);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.cursor = 'default';
        if (onFinalize) onFinalize();
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onChange, onFinalize, step, min, max]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.preventDefault();
    setIsDragging(true);
    startX.current = e.clientX;
    startValue.current = value;
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (onFinalize) onFinalize();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        setIsEditing(false);
        if (onFinalize) onFinalize();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) onChange(val);
  };

  return (
    <div className={`flex items-center justify-between group select-none ${className}`}>
      <span 
        className="text-[10px] text-zinc-500 font-mono uppercase cursor-ew-resize group-hover:text-zinc-300 transition-colors"
        onMouseDown={handleMouseDown}
      >
        {label}
      </span>
      
      {isEditing ? (
        <input
          autoFocus
          type="number"
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          step={step}
          className="w-16 bg-zinc-900 border border-indigo-500 rounded px-1 py-0.5 text-[10px] text-white font-mono text-right outline-none"
        />
      ) : (
        <span 
          className="text-[10px] text-indigo-400 font-mono cursor-ew-resize hover:text-white transition-colors"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          {value.toFixed(step < 0.1 ? 2 : (step < 1 ? 1 : 0))}{unit}
        </span>
      )}
    </div>
  );
};
