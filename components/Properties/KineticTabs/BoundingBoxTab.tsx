import React from 'react';
import { Maximize2, Target } from 'lucide-react';
import { KineticSettings } from '../../../types/kinetic';
import { useProjectStore } from '../../../store/useProjectStore';
import { Clip } from '../../../types';

interface BoundingBoxTabProps {
  settings: KineticSettings;
  onChange: (updates: Partial<KineticSettings>) => void;
}

export const BoundingBoxTab = ({ settings, onChange }: BoundingBoxTabProps) => {
  const { project, currentTime } = useProjectStore();

  const snapToScreen = () => {
    onChange({
      boundingBox: { x: 0, y: 0, width: 1, height: 1 }
    });
  };

  const snapToClip = () => {
    const visualTracks = project.tracks.filter(t => t.type === 'video');
    let targetClip: Clip | null = null;
    
    for (let i = visualTracks.length - 1; i >= 0; i--) {
      const track = visualTracks[i];
      if (!track.isVisible) continue;
      const clip = track.clips.find(c => currentTime >= c.startTime && currentTime < c.startTime + c.duration);
      if (clip) {
        targetClip = clip;
        break;
      }
    }

    if (targetClip) {
      const pos = targetClip.position || { x: 0.5, y: 0.5 };
      const scaleX = targetClip.scaleX ?? targetClip.scale ?? 1;
      const scaleY = targetClip.scaleY ?? targetClip.scale ?? 1;
      
      const width = scaleX;
      const height = scaleY;
      const x = pos.x - (width / 2);
      const y = pos.y - (height / 2);
      
      onChange({
        boundingBox: { x, y, width, height }
      });
    }
  };

  return (
    <div className="p-3 flex flex-col gap-5 bg-black/20">
      <div className="flex gap-2">
        <button 
          onClick={snapToScreen}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[9px] font-bold uppercase rounded border border-zinc-700 transition-colors"
        >
          <Maximize2 size={12} /> Snap to Screen
        </button>
        <button 
          onClick={snapToClip}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[9px] font-bold uppercase rounded border border-zinc-700 transition-colors"
        >
          <Target size={12} /> Snap to Clip
        </button>
      </div>
      <div className="flex items-center justify-between bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800">
        <span className="text-[10px] font-black text-zinc-300 uppercase tracking-tighter">Show Bounding Box</span>
        <button 
          onClick={() => onChange({ showBox: !settings.showBox })}
          className={`w-9 h-5 rounded-full transition-all relative ${settings.showBox ? 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'bg-zinc-700'}`}
        >
          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.showBox ? 'left-5' : 'left-1'}`} />
        </button>
      </div>
    </div>
  );
};
