
import React, { useState } from 'react';
import ReactDOM from 'react-dom';

interface TooltipProps {
  text: string;
  shortcut?: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  key?: React.Key;
  className?: string;
  mouseFollow?: boolean;
}

export const Tooltip = ({ text, shortcut, children, position = 'top', className = '', mouseFollow = false }: TooltipProps) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (mouseFollow) {
      setCoords({ x: e.clientX, y: e.clientY });
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      
      let x = rect.left + rect.width / 2;
      let y = rect.top + rect.height / 2;

      if (position === 'top') {
        y = rect.top;
      } else if (position === 'bottom') {
        y = rect.bottom;
      } else if (position === 'left') {
        x = rect.left;
      } else if (position === 'right') {
        x = rect.right;
      }

      setCoords({ x, y });
    }
    setShow(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseFollow && show) {
      setCoords({ x: e.clientX, y: e.clientY });
    }
  };

  const tooltipContent = (
    <div 
      className="fixed z-[99999] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: coords.x,
        top: coords.y,
        transform: mouseFollow 
          ? 'translate(12px, 12px)' 
          : position === 'top' ? 'translate(-50%, -100%) translateY(-8px)' :
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
      {!mouseFollow && (
        <div className={`absolute w-2 h-2 bg-zinc-800 border-zinc-700 transform rotate-45 ${
          position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2 border-r border-b' :
          position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2 border-l border-t' :
          position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2 border-r border-t' :
          'left-[-4px] top-1/2 -translate-y-1/2 border-l border-b'
        }`} />
      )}
    </div>
  );

  return (
    <div 
      className={`relative flex items-center ${className}`} 
      onMouseEnter={handleMouseEnter} 
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && ReactDOM.createPortal(tooltipContent, document.body)}
    </div>
  );
};
