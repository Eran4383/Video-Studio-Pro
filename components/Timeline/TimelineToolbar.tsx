
import React from 'react';
import { Undo, Redo, Scissors, Trash2, Plus, Video, Music, ZoomOut, ZoomIn, Magnet, RotateCcw, Maximize2, MousePointer2, Anchor, Upload } from 'lucide-react';
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
  isAutoScroll: boolean;
  onToggleAutoScroll: () => void;
  zoom: number;
  setZoom: (z: number) => void;
  selectedClipCount: number;
  projectDuration: number;
  onSyncToAnchors: (onlySelected?: boolean) => void;
  onImportSubtitles: (file: File) => void;
  showAudioMonitor: boolean;
  onToggleAudioMonitor: () => void;
}

export const TimelineToolbar = ({ 
  canUndo, canRedo, onUndo, onRedo, onSplit, onDelete, onAddTrack, isMagnet, onToggleMagnet, isAutoScroll, onToggleAutoScroll, zoom, setZoom, selectedClipCount, projectDuration, onSyncToAnchors, onImportSubtitles, showAudioMonitor, onToggleAudioMonitor
}: TimelineToolbarProps) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const asideWidth = 56;
  const headerWidth = 150;
  const audioMonitorWidth = showAudioMonitor ? 40 : 0;
  const availableWidth = typeof window !== 'undefined' ? window.innerWidth - asideWidth - headerWidth - audioMonitorWidth : 1000;
  const minZoom = Math.max(0.1, availableWidth / (projectDuration * 10 || 1));
  const maxZoom = Math.min(1000, 30000000 / (projectDuration * 10 || 1));

  const handleFit = () => {
    // Use 0.99 factor to make the last clip cover 99% of the visible timeline
    const minZoomValue = (availableWidth * 0.99) / (projectDuration * 10 || 1);
    setZoom(Math.max(0.1, Math.min(maxZoom, minZoomValue)));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportSubtitles(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-10 bg-[#161616] border-b border-zinc-800 flex items-center px-4 justify-between shrink-0">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".srt" 
        className="hidden" 
      />
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 mr-2">
          <Tooltip text="Undo Action" shortcut="CTRL+Z">
            <button disabled={!canUndo} onClick={onUndo} className={`p-1.5 rounded ${canUndo ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-zinc-700'}`}><Undo size={14} /></button>
          </Tooltip>
          <Tooltip text="Redo Action" shortcut="CTRL+SHIFT+Z">
            <button disabled={!canRedo} onClick={onRedo} className={`p-1.5 rounded ${canRedo ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-zinc-700'}`}><Redo size={14} /></button>
          </Tooltip>
        </div>
        
        <Tooltip text={selectedClipCount > 0 ? `Split Selected Clip${selectedClipCount > 1 ? 's' : ''}` : "Split All Tracks"} shortcut="S / B">
          <button onClick={onSplit} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white" title={selectedClipCount > 0 ? "Split Clip (S/B)" : "Split All Tracks (S/B)"}><Scissors size={14} /></button>
        </Tooltip>
        
        <Tooltip text={`Delete Selected (${selectedClipCount})`} shortcut="DEL">
          <button onClick={onDelete} className="p-1.5 hover:bg-zinc-800 rounded text-red-500/70 hover:text-red-500"><Trash2 size={14} /></button>
        </Tooltip>
        
        <div className="w-px h-4 bg-zinc-800 mx-2" />
        
        <Tooltip text="Add Video Track">
          <button onClick={() => onAddTrack('video')} className="flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800 rounded text-[10px] text-zinc-400 font-bold transition-all"><Plus size={12}/><Video size={12}/></button>
        </Tooltip>
        
        <Tooltip text="Add Audio Track">
          <button onClick={() => onAddTrack('audio')} className="flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800 rounded text-[10px] text-zinc-400 font-bold transition-all"><Plus size={12}/><Music size={12}/></button>
        </Tooltip>

        <Tooltip text="Import Subtitles (SRT)">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800 rounded text-[10px] text-zinc-400 font-bold transition-all"><Upload size={12}/> SRT</button>
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

        <Tooltip text="Toggle Auto-Scroll during Playback">
          <button 
            onClick={onToggleAutoScroll} 
            className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold border transition-all ${isAutoScroll ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 shadow-sm' : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50'}`}
          >
            <MousePointer2 size={12} className={isAutoScroll ? 'animate-pulse' : ''} /> {isAutoScroll ? 'AUTO-SCROLL ON' : 'AUTO-SCROLL OFF'}
          </button>
        </Tooltip>

        <Tooltip text="Toggle Audio Level Monitor">
          <button 
            onClick={onToggleAudioMonitor} 
            className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold border transition-all ${showAudioMonitor ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-sm' : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50'}`}
          >
            <Music size={12} /> {showAudioMonitor ? 'AUDIO ON' : 'AUDIO OFF'}
          </button>
        </Tooltip>

        <div className="flex items-center bg-yellow-500/10 border border-yellow-500/20 rounded overflow-hidden">
          <Tooltip text="Sync All Subtitles to Audio Anchors">
            <button 
              onClick={() => onSyncToAnchors(false)} 
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-yellow-500 hover:bg-yellow-500/20 transition-all border-r border-yellow-500/20"
            >
              <Anchor size={12} /> SYNC ALL
            </button>
          </Tooltip>
          <Tooltip text="Sync Selected Subtitle to Nearest Anchor">
            <button 
              onClick={() => onSyncToAnchors(true)} 
              disabled={selectedClipCount === 0}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold transition-all ${selectedClipCount > 0 ? 'text-yellow-500 hover:bg-yellow-500/20' : 'text-zinc-600 cursor-not-allowed'}`}
            >
              SEL.
            </button>
          </Tooltip>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Tooltip text="Fit to Screen" position="top">
            <button onClick={handleFit} className="text-zinc-600 hover:text-white transition-colors"><Maximize2 size={12} /></button>
        </Tooltip>
        <Tooltip text="Reset Zoom" position="top">
          <button onClick={() => setZoom(10)} className="text-zinc-600 hover:text-indigo-400 transition-colors"><RotateCcw size={12} /></button>
        </Tooltip>

        <Tooltip text="Zoom Out" shortcut="CTRL + -">
          <button onClick={() => setZoom(Math.max(minZoom, zoom - 5))}><ZoomOut size={14} className="text-zinc-500 hover:text-white transition-colors" /></button>
        </Tooltip>
        
        <div className="w-32 flex items-center">
             <input 
                type="range" 
                min={minZoom} 
                max={maxZoom} 
                step="0.01"
                value={zoom} 
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
             />
        </div>
        
        <Tooltip text="Zoom In" shortcut="CTRL + =">
          <button onClick={() => setZoom(Math.min(maxZoom, zoom + 10))}><ZoomIn size={14} className="text-zinc-500 hover:text-white transition-colors" /></button>
        </Tooltip>
      </div>
    </div>
  );
};
