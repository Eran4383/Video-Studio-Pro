
import React, { useState } from 'react';
import ReactDOM from 'react-dom';

interface TooltipProps {
  text: string;
  shortcut?: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, shortcut, children, position = 'top' }) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    });
    setShow(true);
  };

  const tooltipContent = (
    <div 
      className="fixed z-[99999] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: coords.x,
        top: coords.y,
        transform: position === 'top' ? 'translate(-50%, -100%) translateY(-8px)' :
                   position === 'bottom' ? 'translate(-50%, 0) translateY(8px)' :
                   position === 'left' ? 'translate(-100%, -50%) translateX(-8px)' :
                   'translate(0, -50%) translateX(8px)'
      }}
    >
      <div className="px-2.5 py-1.5 bg-zinc-800 text-white text-[10px] font-bold rounded-lg shadow-xl border border-zinc-700 whitespace-nowrap flex items-center gap-2">
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
  );

  return (
    <div className="relative flex items-center" onMouseEnter={handleMouseEnter} onMouseLeave={() => setShow(false)}>
      {children}
      {show && ReactDOM.createPortal(tooltipContent, document.body)}
    </div>
  );
};
