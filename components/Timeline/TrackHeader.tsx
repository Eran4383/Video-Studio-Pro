
import React, { useRef, useState, useEffect } from 'react';
import { Video, Music, Eye, EyeOff, Volume2, VolumeX, Lock, Unlock, ChevronDown, ChevronUp, Type } from 'lucide-react';
import { Track } from '../../types';
import { Tooltip } from '../UI/Tooltip';

interface TrackHeaderProps {
  track: Track;
  onToggle: (trackId: string, prop: 'isVisible' | 'isMuted' | 'isLocked') => void;
  onSetHeight: (trackId: string, height: number) => void;
}

export const TrackHeader: React.FC<TrackHeaderProps> = ({ track, onToggle, onSetHeight }) => {
  const isExpanded = (track.height || 72) > 80;
  const [isResizing, setIsResizing] = useState(false);

  const toggleExpand = () => {
    onSetHeight(track.id, isExpanded ? 72 : 160);
  };

  useEffect(() => {
      const handleMove = (e: MouseEvent) => {
          if (!isResizing) return;
          onSetHeight(track.id, Math.max(40, e.movementY + (track.height || 72)));
      };
      const handleUp = () => setIsResizing(false);
      if (isResizing) {
          window.addEventListener('mousemove', handleMove);
          window.addEventListener('mouseup', handleUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMove);
          window.removeEventListener('mouseup', handleUp);
      };
  }, [isResizing, track.height, onSetHeight, track.id]);

  return (
    <div 
      className="w-[150px] sticky left-0 bg-[#121212] z-20 border-r border-zinc-800 p-2 flex flex-col justify-between shadow-lg relative group"
      style={{ height: track.height || 72 }}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {track.type === 'video' ? <Video size={10} className="text-zinc-500" /> : track.type === 'audio' ? <Music size={10} className="text-zinc-500" /> : <Type size={10} className="text-zinc-500" />}
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest truncate max-w-[80px]">{track.name}</span>
          </div>
          <Tooltip text={isExpanded ? "Collapse Track" : "Expand Track for Waveforms"} position="right">
            <button 
              onClick={toggleExpand}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-600 hover:text-white transition-colors"
            >
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </Tooltip>
        </div>
        
        <div className="flex items-center gap-1 mt-1">
          <Tooltip text={track.isVisible ? "Hide Track" : "Show Track"} position="bottom">
            <button onClick={() => onToggle(track.id, 'isVisible')} className={`p-1 rounded hover:bg-zinc-800 transition-colors ${track.isVisible ? 'text-zinc-400' : 'text-indigo-500'}`}>{track.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}</button>
          </Tooltip>
          <Tooltip text={track.isMuted ? "Unmute Track" : "Mute Track"} position="bottom">
            <button onClick={() => onToggle(track.id, 'isMuted')} className={`p-1 rounded hover:bg-zinc-800 transition-colors ${track.isMuted ? 'text-red-500' : 'text-zinc-400'}`}>{track.isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}</button>
          </Tooltip>
          <Tooltip text={track.isLocked ? "Unlock Track" : "Lock Track"} position="bottom">
            <button onClick={() => onToggle(track.id, 'isLocked')} className={`p-1 rounded hover:bg-zinc-800 transition-colors ${track.isLocked ? 'text-orange-500' : 'text-zinc-400'}`}>{track.isLocked ? <Lock size={12} /> : <Unlock size={12} />}</button>
          </Tooltip>
        </div>
      </div>

      {isExpanded && (
        <div className="h-4 bg-zinc-900/50 rounded flex items-center px-1.5 overflow-hidden">
          <div className="h-1 bg-indigo-500/20 w-full rounded-full overflow-hidden">
             <div className="h-full bg-indigo-500 w-1/2 opacity-50" />
          </div>
        </div>
      )}

      {/* Resize Handle */}
      <div 
        onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
        className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-indigo-500/50 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
};
