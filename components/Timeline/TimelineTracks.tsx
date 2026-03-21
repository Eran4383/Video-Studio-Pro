import React, { memo } from 'react';
import { Project, Clip, Asset } from '../../types';
import { TrackHeader } from './TrackHeader';
import { Link as LinkIcon } from 'lucide-react';
import { WaveformCanvas } from './WaveformCanvas';
import { MagneticMarkers } from './MagneticMarkers';

interface TimelineTracksProps {
  project: Project;
  assets: Asset[];
  zoom: number;
  selectedClipIds: string[];
  onToggleTrack: (trackId: string, prop: 'isVisible' | 'isMuted' | 'isLocked') => void;
  onSetTrackHeight: (trackId: string, height: number) => void;
  onDrop: (e: React.DragEvent, trackId: string) => void;
  onSelectClip: (id: string | null) => void;
  onSelectAllTrack: (trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
  onContextMenu: (e: React.MouseEvent, clipId: string, assetType: string) => void;
  onClipMouseDown: (e: React.MouseEvent, clip: Clip, trackId: string) => void;
  onClipMouseMove: (e: React.MouseEvent, clip: Clip) => void;
}

export const TimelineTracks = memo(({
  project, assets, zoom, selectedClipIds, onToggleTrack, onSetTrackHeight, onDrop, onSelectClip, onSelectAllTrack, onDeleteTrack, onContextMenu, onClipMouseDown, onClipMouseMove
}: TimelineTracksProps) => {
  console.log('[TimelineTracks] Render. onDeleteTrack exists:', !!onDeleteTrack);
  const pxPerSec = zoom * 10;

  return (
    <div className="flex flex-col">
      {project.tracks.map(track => (
        <div 
          key={track.id} 
          onDragOver={(e) => e.preventDefault()} 
          onDrop={(e) => onDrop(e, track.id)} 
          className={`flex border-b border-zinc-800 group/track relative ${track.isVisible ? '' : 'opacity-60'}`}
          style={{ height: track.height || 72 }}
        >
          <TrackHeader 
            track={track} 
            onToggle={onToggleTrack} 
            onSetHeight={onSetTrackHeight} 
            onSelectAll={() => onSelectAllTrack(track.id)} 
            onDelete={() => onDeleteTrack(track.id)}
          />
          <div className="flex-1 relative bg-[#0a0a0a] min-w-[5000px]" onMouseDown={(e) => { if (e.button === 0 && e.target === e.currentTarget) { onSelectClip(null); } }}>
            {track.clips.map(clip => {
              const isSelected = selectedClipIds.includes(clip.id);
              const isLinked = selectedClipIds.length > 0 && selectedClipIds.some(id => project.tracks.flatMap(t=>t.clips).find(c=>c.id === id)?.linkedClipId === clip.id);
              const asset = assets.find(a => a.id === clip.assetId);
              return (
                <div
                  key={clip.id} 
                  onContextMenu={(e) => onContextMenu(e, clip.id, track.type)}
                  onMouseDown={(e) => onClipMouseDown(e, clip, track.id)}
                  onMouseMove={(e) => onClipMouseMove(e, clip)}
                  className={`absolute top-2 bottom-2 rounded-lg border-2 flex flex-col justify-center px-3 overflow-hidden transition-colors ${track.isLocked ? 'cursor-not-allowed grayscale' : ''} ${isSelected ? 'bg-indigo-600/50 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)] z-30' : isLinked ? 'bg-indigo-900/40 border-indigo-500/50 z-20 border-dashed' : track.type === 'audio' ? 'bg-zinc-900/60 border-zinc-800/60 z-10' : track.type === 'subtitle' ? 'bg-yellow-900/40 border-yellow-600/40 z-20' : 'bg-zinc-800/80 border-zinc-700 hover:border-zinc-500 z-10'}`}
                  style={{ left: clip.startTime * pxPerSec, width: clip.duration * pxPerSec }}
                >
                  {track.type === 'audio' && asset?.audioBuffer && (
                    <>
                      <WaveformCanvas 
                        assetId={asset.id} 
                        buffer={asset.audioBuffer} 
                        clipOffset={clip.offset} 
                        clipDuration={clip.duration} 
                        pxPerSec={pxPerSec} 
                        fps={project.fps} 
                        isExpanded={track.height ? track.height > 60 : false}
                        waveformStyle={project.waveformStyle}
                        waveformScale={project.waveformScale}
                      />
                      <MagneticMarkers asset={asset} clip={clip} pxPerSec={pxPerSec} />
                    </>
                  )}
                  {track.type === 'subtitle' && (
                    <div className="w-full h-full flex items-center justify-center text-center">
                      <span className="text-[10px] font-black text-yellow-200 leading-tight truncate px-1">{clip.content}</span>
                    </div>
                  )}
                  {track.type !== 'subtitle' && (
                    <div className="flex items-center gap-1 z-10 pointer-events-none">
                      {clip.linkedClipId && <LinkIcon size={8} className="text-indigo-400" />}
                      <span className="text-[10px] font-bold text-white truncate uppercase">{clip.id.split('-')[1]}</span>
                    </div>
                  )}
                  <span className="text-[8px] text-zinc-400 font-mono font-bold tracking-tighter z-10 pointer-events-none absolute bottom-0.5 right-1">{clip.duration.toFixed(2)}s</span>
                  <div className="absolute left-0 top-0 bottom-0 w-2.5 hover:bg-white/20 cursor-col-resize z-50 transition-colors" />
                  <div className="absolute right-0 top-0 bottom-0 w-2.5 hover:bg-white/20 cursor-col-resize z-50 transition-colors" />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}, (prev, next) => {
  // Custom comparison to prevent re-renders when currentTime changes
  // We only care about project structure, assets, zoom, and selection
  return (
    prev.project === next.project &&
    prev.assets === next.assets &&
    prev.zoom === next.zoom &&
    prev.selectedClipIds === next.selectedClipIds &&
    prev.onDeleteTrack === next.onDeleteTrack
  );
});
