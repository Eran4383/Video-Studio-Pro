
import React from 'react';
import { Undo, Redo, Scissors, Trash2, Plus, Video, Music, ZoomOut, ZoomIn, Magnet, RotateCcw, Maximize2 } from 'lucide-react';
import { Tooltip } from '../UI/Tooltip';

interface TimelineToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSplit: () => void;
  onDelete: () => void;
  onAddTrack: (type: 'video' | 'audio') => void;
  isMagnet: boolean;
  onToggleMagnet: () => void;
  zoom: number;
  setZoom: (z: number) => void;
  selectedClipId: string | null;
  projectDuration: number;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({ 
  canUndo, canRedo, onUndo, onRedo, onSplit, onDelete, onAddTrack, isMagnet, onToggleMagnet, zoom, setZoom, selectedClipId, projectDuration
}) => {
  const handleFit = () => {
    // Approx available width is screen width - library width - track header width
    const availableWidth = window.innerWidth - 300 - 150;
    const requiredPxPerSec = availableWidth / (projectDuration * 1.1); // Add 10% padding
    setZoom(Math.max(1, Math.min(100, requiredPxPerSec / 10)));
  };

  return (
    <div className="h-10 bg-[#161616] border-b border-zinc-800 flex items-center px-4 justify-between shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 mr-2">
          <Tooltip text="Undo Action" shortcut="CTRL+Z">
            <button disabled={!canUndo} onClick={onUndo} className={`p-1.5 rounded ${canUndo ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-zinc-700'}`}><Undo size={14} /></button>
          </Tooltip>
          <Tooltip text="Redo Action" shortcut="CTRL+SHIFT+Z">
            <button disabled={!canRedo} onClick={onRedo} className={`p-1.5 rounded ${canRedo ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-zinc-700'}`}><Redo size={14} /></button>
          </Tooltip>
        </div>
        
        <Tooltip text={selectedClipId ? "Split Selected Clip" : "Split All Tracks"} shortcut="S / B">
          <button onClick={onSplit} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title={selectedClipId ? "Split Clip (S/B)" : "Split All Tracks (S/B)"}><Scissors size={14} /></button>
        </Tooltip>
        
        <Tooltip text="Delete Selected" shortcut="DEL">
          <button onClick={onDelete} className="p-1.5 hover:bg-zinc-800 rounded text-red-500/70 hover:text-red-500"><Trash2 size={14} /></button>
        </Tooltip>
        
        <div className="w-px h-4 bg-zinc-800 mx-2" />
        
        <Tooltip text="Add Video Track">
          <button onClick={() => onAddTrack('video')} className="flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800 rounded text-[10px] text-zinc-400 font-bold transition-all"><Plus size={12}/><Video size={12}/></button>
        </Tooltip>
        
        <Tooltip text="Add Audio Track">
          <button onClick={() => onAddTrack('audio')} className="flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800 rounded text-[10px] text-zinc-400 font-bold transition-all"><Plus size={12}/><Music size={12}/></button>
        </Tooltip>
        
        <div className="w-px h-4 bg-zinc-800 mx-2" />
        
        <Tooltip text="Toggle Magnetic Snapping" shortcut="M">
          <button 
            onClick={onToggleMagnet} 
            className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold border transition-all ${isMagnet ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 shadow-sm' : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50'}`}
          >
            <Magnet size={12} /> {isMagnet ? 'MAGNET ON' : 'MAGNET OFF'}
          </button>
        </Tooltip>
      </div>
      
      <div className="flex items-center gap-3">
        <Tooltip text="Fit to Screen" position="top">
            <button onClick={handleFit} className="text-zinc-600 hover:text-white transition-colors"><Maximize2 size={12} /></button>
        </Tooltip>
        <Tooltip text="Reset Zoom" position="top">
          <button onClick={() => setZoom(10)} className="text-zinc-600 hover:text-indigo-400 transition-colors"><RotateCcw size={12} /></button>
        </Tooltip>

        <Tooltip text="Zoom Out" shortcut="CTRL + -">
          <button onClick={() => setZoom(Math.max(1, zoom - 5))}><ZoomOut size={14} className="text-zinc-500 hover:text-white transition-colors" /></button>
        </Tooltip>
        
        <div className="w-32 flex items-center">
             <input 
                type="range" 
                min="1" 
                max="100" 
                value={zoom} 
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
             />
        </div>
        
        <Tooltip text="Zoom In" shortcut="CTRL + =">
          <button onClick={() => setZoom(Math.min(100, zoom + 5))}><ZoomIn size={14} className="text-zinc-500 hover:text-white transition-colors" /></button>
        </Tooltip>
      </div>
    </div>
  );
};
