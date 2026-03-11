import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize, Repeat, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Tooltip } from '../UI/Tooltip';

interface PreviewControlsProps {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isLooping: boolean;
  setIsLooping: (looping: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  resetView: () => void;
  toggleFullscreen: () => void;
}

export const PreviewControls: React.FC<PreviewControlsProps> = ({
  isPlaying,
  setIsPlaying,
  isLooping,
  setIsLooping,
  currentTime,
  setCurrentTime,
  scale,
  setScale,
  resetView,
  toggleFullscreen
}) => {
  return (
    <div className="h-14 bg-[#121212] border-t border-zinc-800 flex items-center justify-between px-6 z-20 flex-none">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <button 
            className="text-zinc-500 hover:text-white transition-colors" 
            onClick={() => setCurrentTime(0)}
          >
            <SkipBack size={16} />
          </button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)} 
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            {isPlaying ? (
              <Pause className="text-black fill-black" size={16} />
            ) : (
              <Play className="text-black fill-black translate-x-0.5" size={16} />
            )}
          </button>
          <button className="text-zinc-500 hover:text-white transition-colors">
            <SkipForward size={16} />
          </button>
        </div>
        <div className="font-mono text-[13px] text-indigo-400 tabular-nums bg-indigo-500/5 px-3 py-1 rounded border border-indigo-500/10">
          {new Date(currentTime * 1000).toISOString().substr(11, 8)}
          <span className="opacity-40">:{Math.floor((currentTime % 1) * 30).toString().padStart(2, '0')}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3 text-zinc-500">
        <Tooltip text="Reset View" position="top">
          <button onClick={resetView} className="hover:text-indigo-400 transition-colors">
            <RotateCcw size={14} />
          </button>
        </Tooltip>
        <div className="w-px h-4 bg-zinc-800" />
        <button 
          onClick={() => setScale((s: number) => Math.max(0.1, s - 0.2))} 
          className="hover:text-white transition-colors"
        >
          <ZoomOut size={14} />
        </button>
        <span className="text-[10px] font-mono w-8 text-center select-none">
          {Math.round(scale * 100)}%
        </span>
        <button 
          onClick={() => setScale((s: number) => Math.min(5, s + 0.2))} 
          className="hover:text-white transition-colors"
        >
          <ZoomIn size={14} />
        </button>
        <div className="w-px h-4 bg-zinc-800" />
        <Tooltip text={isLooping ? "Loop On" : "Loop Off"} position="top">
          <button 
            onClick={() => setIsLooping(!isLooping)} 
            className={`transition-colors ${isLooping ? 'text-indigo-400' : 'hover:text-white'}`}
          >
            <Repeat size={16} />
          </button>
        </Tooltip>
        <div className="w-px h-4 bg-zinc-800" />
        <Tooltip text="Fullscreen" position="top">
          <button onClick={toggleFullscreen} className="hover:text-white transition-colors">
            <Maximize size={16} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
