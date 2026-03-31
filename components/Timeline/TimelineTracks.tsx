import React, { memo } from 'react';
import { Project, Clip, Asset, MediaType, Track } from '../../types';
import { Link as LinkIcon, Layers, Eye, EyeOff } from 'lucide-react';
import { WaveformCanvas } from './WaveformCanvas';
import { MagneticMarkers } from './MagneticMarkers';
import { stripRichText } from '../../utils/timelineUtils';

interface TimelineTracksProps {
  project: Project;
  displayTracks: Track[];
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
  onToggleEffect: (clipId: string, effectId: string) => void;
}

export const TimelineTracks = memo(({
  project, displayTracks, assets, zoom, selectedClipIds, onToggleTrack, onSetTrackHeight, onDrop, onSelectClip, onSelectAllTrack, onDeleteTrack, onContextMenu, onClipMouseDown, onClipMouseMove, onToggleEffect
}: TimelineTracksProps) => {
  console.log('[TimelineTracks] Render. onDeleteTrack exists:', !!onDeleteTrack);
  const pxPerSec = zoom * 10;

  return (
    <div className="flex flex-col">
      {displayTracks.map(track => (
        <div 
          key={track.id} 
          onDragOver={(e) => e.preventDefault()} 
          onDragEnter={(e) => e.preventDefault()}
          onDrop={(e) => onDrop(e, track.id)} 
          className={`border-b border-zinc-800 group/track relative bg-[#0a0a0a] w-full shrink-0 ${track.isVisible ? '' : 'opacity-60'}`}
          style={{ height: track.height || 72 }}
          onMouseDown={(e) => { if (e.button === 0 && e.target === e.currentTarget) { onSelectClip(null); } }}
        >
          {track.clips.map(clip => {
              console.warn('Rendering clip:', clip.id, 'type:', clip.type, 'startTime:', clip.startTime, 'duration:', clip.duration);
              const isSelected = selectedClipIds.includes(clip.id);
              const isLinked = selectedClipIds.length > 0 && selectedClipIds.some(id => project.tracks.flatMap(t=>t.clips).find(c=>c.id === id)?.linkedClipId === clip.id);
              const asset = assets.find(a => a.id === clip.assetId);
              const isEffectClip = clip.type === MediaType.EFFECT;
              const effectName = isEffectClip && clip.effects?.[0]?.name;
              const hasDisabledEffect = clip.effects?.some(eff => eff.isEnabled === false);
              
              const baseStyle = `absolute top-2 bottom-2 rounded-lg flex flex-col justify-center overflow-hidden transition-colors ${track.isLocked ? 'cursor-not-allowed grayscale' : ''} ${isSelected ? 'bg-indigo-600/50 ring-2 ring-inset ring-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)] z-30' : isLinked ? 'bg-indigo-900/40 ring-2 ring-inset ring-indigo-500/50 z-20' : isEffectClip ? 'bg-purple-900/60 ring-1 ring-inset ring-purple-500/50 z-20' : track.type === 'audio' ? 'bg-zinc-900/60 ring-1 ring-inset ring-zinc-800/60 z-10' : track.type === 'subtitle' ? 'bg-yellow-900/40 ring-1 ring-inset ring-yellow-600/40 z-20' : 'bg-zinc-800/80 ring-1 ring-inset ring-zinc-700 hover:ring-zinc-500 z-10'}`;
              const finalStyle = hasDisabledEffect ? `${baseStyle} opacity-50 grayscale` : baseStyle;
              
              return (
                <div
                  key={clip.id} 
                  onContextMenu={(e) => onContextMenu(e, clip.id, track.type)}
                  onMouseDown={(e) => onClipMouseDown(e, clip, track.id)}
                  onMouseMove={(e) => onClipMouseMove(e, clip)}
                  className={finalStyle}
                  style={{ left: `${clip.startTime * pxPerSec}px`, width: `${clip.duration * pxPerSec}px` }}
                >
                  {track.type === 'audio' && (
                    <>
                      <WaveformCanvas 
                        assetId={asset?.id || clip.assetId} 
                        duration={asset?.duration || clip.duration}
                        buffer={asset?.audioBuffer} 
                        waveform={asset?.waveform}
                        clipOffset={clip.offset} 
                        clipDuration={clip.duration} 
                        pxPerSec={pxPerSec} 
                        fps={project.fps} 
                        isExpanded={track.height ? track.height > 60 : false}
                        waveformStyle={project.waveformStyle}
                        waveformScale={project.waveformScale}
                      />
                      {asset && <MagneticMarkers asset={asset} clip={clip} pxPerSec={pxPerSec} />}
                    </>
                  )}
                  {track.type === 'subtitle' && (
                    <div className="w-full h-full flex items-center justify-center text-center absolute inset-0">
                      <span className="text-[10px] font-black text-yellow-200 leading-tight truncate px-1">{stripRichText(clip.content || '')}</span>
                    </div>
                  )}
                  {track.type !== 'subtitle' && (
                    <div className="flex items-center gap-1 z-10 pointer-events-none absolute inset-0 px-1 min-w-0">
                      {clip.linkedClipId && <LinkIcon size={8} className="text-indigo-400 shrink-0" />}
                      {isEffectClip && <Layers size={10} className="text-purple-300 shrink-0" />}
                      <span className="text-[10px] font-bold text-white truncate uppercase">
                        {isEffectClip ? (effectName || 'Adjustment Layer') : (clip.content ? stripRichText(clip.content) : clip.id.split('-')[1])}
                      </span>
                    </div>
                  )}
                  {clip.effects && clip.effects.length > 0 && (
                    <div className="absolute top-1 right-1 z-20 flex items-center gap-1 pointer-events-auto">
                      {clip.effects.map(eff => (
                         <button 
                           key={eff.id}
                           onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleEffect(clip.id, eff.id); }}
                           className={`p-0.5 rounded-full ${eff.isEnabled ? 'bg-white/20' : 'bg-red-500/50'}`}
                         >
                           {eff.isEnabled ? <Eye size={8} /> : <EyeOff size={8} />}
                         </button>
                      ))}
                      {!isEffectClip && <span className="text-[8px] font-bold bg-black/50 px-1 rounded text-white">FX</span>}
                    </div>
                  )}
                  <span className="text-[8px] text-zinc-400 font-mono font-bold tracking-tighter z-10 pointer-events-none absolute bottom-0.5 right-1 bg-black/40 px-0.5 rounded">{clip.duration.toFixed(2)}s</span>
                  <div className="absolute left-0 top-0 bottom-0 w-2.5 hover:bg-white/20 cursor-col-resize z-50 transition-colors" />
                  <div className="absolute right-0 top-0 bottom-0 w-2.5 hover:bg-white/20 cursor-col-resize z-50 transition-colors" />
                  {isLinked && !isSelected && (
                    <div className="absolute inset-0 border-2 border-dashed border-indigo-500/50 rounded-lg pointer-events-none" />
                  )}
                </div>
              );
            })}
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
    prev.onDeleteTrack === next.onDeleteTrack &&
    prev.onToggleEffect === next.onToggleEffect
  );
});
