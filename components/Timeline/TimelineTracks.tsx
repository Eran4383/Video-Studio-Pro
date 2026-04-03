import React, { memo } from 'react';
import { Project, Clip, Asset, MediaType, Track } from '../../types';
import { Link as LinkIcon, Layers, Eye, EyeOff, Sparkles } from 'lucide-react';
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
  onClipDoubleClick: (e: React.MouseEvent, clip: Clip) => void;
  onEffectDoubleClick: (e: React.MouseEvent, clipId: string, effectId: string, edge: 'L' | 'R') => void;
  onToggleEffect: (clipId: string, effectId: string) => void;
  onDeleteEffect: (clipId: string, effectId: string) => void;
  onDragOver: (e: React.DragEvent, trackId: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  dragOverTransition: { clipId: string, position: 'start' | 'end' } | null;
  selectedEffect: { clipId: string, effectId: string } | null;
  onSelectEffect: (clipId: string, effectId: string) => void;
}

export const TimelineTracks = memo(({
  project, displayTracks, assets, zoom, selectedClipIds, onToggleTrack, onSetTrackHeight, onDrop, onSelectClip, onSelectAllTrack, onDeleteTrack, onContextMenu, onClipMouseDown, onClipMouseMove, onClipDoubleClick, onEffectDoubleClick, onToggleEffect, onDeleteEffect, onDragOver, onDragLeave, dragOverTransition, selectedEffect, onSelectEffect
}: TimelineTracksProps) => {
  console.log('[TimelineTracks] Render. onDeleteTrack exists:', !!onDeleteTrack);
  const pxPerSec = zoom * 10;

  return (
    <div className="flex flex-col">
      {displayTracks.map(track => (
        <div 
          key={track.id} 
          onDragOver={(e) => onDragOver(e, track.id)} 
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, track.id)} 
          className={`border-b border-zinc-800 group/track relative bg-[#0a0a0a] w-full shrink-0 ${track.isVisible ? '' : 'opacity-60'}`}
          style={{ height: track.height || 72 }}
          onMouseDown={(e) => { if (e.button === 0 && e.target === e.currentTarget) { onSelectClip(null); onSelectEffect('', ''); } }}
        >
          {track.clips.map(clip => {
              console.warn('Rendering clip:', clip.id, 'type:', clip.type, 'startTime:', clip.startTime, 'duration:', clip.duration);
              const isSelected = selectedClipIds.includes(clip.id);
              const isLinked = selectedClipIds.length > 0 && selectedClipIds.some(id => project.tracks.flatMap(t=>t.clips).find(c=>c.id === id)?.linkedClipId === clip.id);
              const asset = assets.find(a => a.id === clip.assetId);
              const isEffectClip = clip.type === MediaType.EFFECT;
              const effectName = isEffectClip && clip.effects?.[0]?.name;
              const hasDisabledEffect = clip.effects?.some(eff => eff.isEnabled === false);
              
              const isDragOver = dragOverTransition?.clipId === clip.id;
              const dragOverPos = isDragOver ? dragOverTransition?.position : null;
              
              const baseStyle = `absolute top-2 bottom-2 rounded-lg flex flex-col justify-center overflow-hidden transition-colors ${track.isLocked ? 'cursor-not-allowed grayscale' : ''} ${isSelected ? 'bg-indigo-600/50 ring-2 ring-inset ring-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)] z-30' : isLinked ? 'bg-indigo-900/40 ring-2 ring-inset ring-indigo-500/50 z-20' : isEffectClip ? 'bg-purple-900/60 ring-1 ring-inset ring-purple-500/50 z-20' : track.type === 'audio' ? 'bg-zinc-900/60 ring-1 ring-inset ring-zinc-800/60 z-10' : track.type === 'subtitle' ? 'bg-yellow-900/40 ring-1 ring-inset ring-yellow-600/40 z-20' : 'bg-zinc-800/80 ring-1 ring-inset ring-zinc-700 hover:ring-zinc-500 z-10'}`;
              const finalStyle = hasDisabledEffect ? `${baseStyle} opacity-50 grayscale` : baseStyle;
              
              return (
                <div
                  key={clip.id} 
                  onContextMenu={(e) => onContextMenu(e, clip.id, track.type)}
                  onMouseDown={(e) => onClipMouseDown(e, clip, track.id)}
                  onMouseMove={(e) => onClipMouseMove(e, clip)}
                  onDoubleClick={(e) => onClipDoubleClick(e, clip)}
                  onDragOver={(e) => onDragOver(e, track.id)}
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
                    <div className="absolute top-0 right-0 bottom-0 w-6 z-20 flex flex-col pointer-events-auto border-l border-white/5 bg-black/20">
                      {clip.effects.map((eff, idx) => (
                         <button 
                           key={eff.id}
                           onClick={(e) => { 
                             e.stopPropagation(); 
                             e.preventDefault(); 
                             onSelectEffect(clip.id, eff.id);
                             onSelectClip(null);
                           }}
                           className={`flex-1 flex items-center justify-center border-b border-white/5 last:border-b-0 hover:bg-white/10 transition-colors ${eff.isEnabled === false ? 'opacity-30 grayscale' : ''} ${selectedEffect?.effectId === eff.id ? 'bg-indigo-500/40' : ''}`}
                           title={eff.name}
                         >
                            <Sparkles size={8} className={eff.isEnabled !== false ? 'text-purple-300' : 'text-zinc-600'} />
                         </button>
                      ))}
                    </div>
                  )}
                  {/* Drag Over Preview */}
                  {isDragOver && dragOverPos && (
                    <div 
                      className={`absolute top-0 bottom-0 bg-purple-500/20 border-2 border-dashed border-purple-400 z-50 pointer-events-none`}
                      style={{ 
                        width: `${1 * pxPerSec}px`, // Default 1s preview
                        [dragOverPos === 'start' ? 'left' : 'right']: 0 
                      }}
                    />
                  )}

                  {/* Transition Visuals */}
                  {clip.effects?.filter(e => e.type === 'transition').map((transition, idx, arr) => {
                    const duration = transition.params?.duration || 1;
                    const position = transition.params?.position || 'start';
                    const widthPx = duration * pxPerSec;
                    const isEffectSelected = selectedEffect?.clipId === clip.id && selectedEffect?.effectId === transition.id;
                    
                    const samePosTransitions = arr.filter(t => (t.params?.position || 'start') === position);
                    const posIdx = samePosTransitions.indexOf(transition);
                    const heightPercent = 100 / samePosTransitions.length;
                    const topPercent = posIdx * heightPercent;

                    return (
                      <div 
                        key={transition.id}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          onSelectEffect(clip.id, transition.id);
                          onSelectClip(null); // Deselect clip when selecting transition
                        }}
                        onDoubleClick={(e) => {
                          onEffectDoubleClick(e, clip.id, transition.id, position === 'start' ? 'R' : 'L');
                        }}
                        className={`absolute bg-gradient-to-${position === 'start' ? 'r' : 'l'} from-purple-500/60 to-transparent z-40 border-${position === 'start' ? 'l' : 'r'}-4 ${isEffectSelected ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'border-purple-400'} group/transition shadow-[inset_0_0_10px_rgba(168,85,247,0.4)] transition-all cursor-pointer`}
                        style={{ 
                          width: `${widthPx}px`, 
                          height: `${heightPercent}%`,
                          top: `${topPercent}%`,
                          [position === 'start' ? 'left' : 'right']: 0 
                        }}
                      >
                         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/transition:opacity-100 transition-opacity bg-black/40 backdrop-blur-[1px]">
                            <span className="text-[9px] font-black text-white drop-shadow-md">{duration.toFixed(1)}s</span>
                         </div>
                         {/* Handle Visual & Resize Area */}
                         <div 
                           className={`absolute top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center ${position === 'start' ? 'right-0' : 'left-0'} z-50`}
                           onMouseDown={(e) => {
                             e.stopPropagation();
                             onSelectEffect(clip.id, transition.id);
                             // Trigger transition resize
                             const event = new CustomEvent('transition-resize-start', {
                               detail: { clipId: clip.id, effectId: transition.id, startX: e.clientX, originalDuration: duration, position }
                             });
                             window.dispatchEvent(event);
                           }}
                         >
                            <div className="w-1 h-4 bg-purple-300 rounded-full opacity-50 group-hover/transition:opacity-100" />
                         </div>
                      </div>
                    );
                  })}

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
    prev.selectedEffect === next.selectedEffect &&
    prev.onDeleteTrack === next.onDeleteTrack &&
    prev.onToggleEffect === next.onToggleEffect
  );
});
