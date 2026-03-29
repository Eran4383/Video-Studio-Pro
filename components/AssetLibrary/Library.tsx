import React, { useRef, useState } from 'react';
import { Upload, Film, Music, Sparkles, Search, Trash2 } from 'lucide-react';
import { Asset, MediaType } from '../../types';
import { AssetService } from '../../services/AssetService';
import { Tooltip } from '../UI/Tooltip';

interface LibraryProps {
  assets: Asset[];
  onAddAsset: (asset: Asset) => void;
  onDeleteAsset: (assetId: string) => void;
  onGenerateAI: () => void;
  onDragAssetToTimeline: (asset: Asset) => void;
}

export const Library = ({ assets, onAddAsset, onDeleteAsset, onGenerateAI, onDragAssetToTimeline }: LibraryProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wasFullscreenRef = useRef(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File input changed");
    const files = e.target.files;
    if (!files) return;
    
    for (const file of Array.from(files) as File[]) {
      try {
        console.log("Processing file in Library:", file.name);
        const asset = await AssetService.processFile(file);
        console.log("Adding asset to store:", asset);
        onAddAsset(asset);
      } catch (err) {
        console.error("Failed to import file", file.name, err);
      }
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Attempt to restore fullscreen if it was active before import
    if (wasFullscreenRef.current && !document.fullscreenElement) {
        try {
            await document.documentElement.requestFullscreen();
        } catch (e) {
            console.warn("Failed to restore fullscreen", e);
        }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (const file of Array.from(e.dataTransfer.files) as File[]) {
        const asset = await AssetService.processFile(file);
        onAddAsset(asset);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData('assetId', asset.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div 
      className={`w-[300px] bg-[#1a1a1a] border-r border-[#333] flex flex-col shadow-xl transition-colors ${isDraggingOver ? 'bg-zinc-800 border-indigo-500' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        multiple 
        accept="video/*,audio/*,image/*,.mkv,.ts,.mov,.avi,.mp4,.webm,.mp3,.wav,.aac,.m4a,.ogg,.flac,.jpg,.jpeg,.png,.gif,.webp,.svg" 
        onChange={handleFileChange}
      />
      
      <div className="p-4 border-b border-[#333] bg-[#1c1c1c]">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Master Media Library</h2>
        <div className="flex gap-2 mb-4">
          <Tooltip text="Import Local Media" position="bottom">
            <button 
              onClick={() => {
                wasFullscreenRef.current = !!document.fullscreenElement;
                fileInputRef.current?.click();
              }}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg px-3 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-zinc-700 active:scale-95 shadow-sm"
            >
              <Upload size={14} /> IMPORT
            </button>
          </Tooltip>
          <Tooltip text="Generate AI Video Asset" position="bottom">
            <button 
              onClick={onGenerateAI}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Sparkles size={14} /> AI BUILD
            </button>
          </Tooltip>
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" size={12} />
          <input 
            type="text" 
            placeholder="Search assets..." 
            className="w-full bg-[#111] border border-[#333] rounded-lg px-8 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700 font-bold"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
        {assets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20 px-10 pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4 border border-zinc-700">
               <Film size={32} />
            </div>
            <p className="text-[11px] font-black uppercase tracking-tighter">Library Standby</p>
            <p className="text-[9px] mt-1 font-medium">Drop files here or import to begin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {assets.map(asset => (
              <Tooltip key={asset.id} text={`Click to add ${asset.name} to sequence`} position="right">
                <div 
                  draggable
                  onDragStart={(e) => handleDragStart(e, asset)}
                  onClick={() => onDragAssetToTimeline(asset)}
                  className="group flex gap-3 p-2.5 bg-[#111] rounded-xl border border-[#333] hover:border-indigo-500/50 transition-all cursor-pointer hover:bg-[#161616] relative"
                >
                  <div className="w-20 aspect-video bg-black rounded-lg overflow-hidden flex-shrink-0 relative border border-white/5">
                    {asset.thumbnail ? (
                      <img src={asset.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-40">
                        {asset.type === MediaType.VIDEO ? <Film size={20} /> : <Music size={20} />}
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1 bg-black/80 text-[8px] px-1 rounded font-mono text-zinc-300 backdrop-blur-sm font-bold">
                      {asset.duration.toFixed(1)}s
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-[11px] font-black truncate text-zinc-300 tracking-tight leading-none mb-1 group-hover:text-white transition-colors">{asset.name}</p>
                    <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.1em]">{asset.type}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAsset(asset.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/10 text-red-500 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                    title="Delete Asset"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </Tooltip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};