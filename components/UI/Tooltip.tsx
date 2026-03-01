
import React, { useState } from 'react';

interface TooltipProps {
  text: string;
  shortcut?: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, shortcut, children, position = 'top' }) => {
  const [show, setShow] = useState(false);

  const posClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={`absolute z-[1000] px-2.5 py-1.5 bg-zinc-800 text-white text-[10px] font-bold rounded-lg shadow-xl border border-zinc-700 whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-150 ${posClasses[position]}`}>
          <div className="flex items-center gap-2">
            <span>{text}</span>
            {shortcut && <span className="text-zinc-400 bg-zinc-900 px-1 rounded border border-zinc-700 font-mono">{shortcut}</span>}
          </div>
          {/* Arrow */}
          <div className={`absolute w-2 h-2 bg-zinc-800 border-zinc-700 transform rotate-45 ${
            position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2 border-r border-b' :
            position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2 border-l border-t' :
            position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2 border-r border-t' :
            'left-[-4px] top-1/2 -translate-y-1/2 border-l border-b'
          }`} />
        </div>
      )}
    </div>
  );
};
