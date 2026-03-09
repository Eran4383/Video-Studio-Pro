import React from 'react';
import { KineticBlock } from '../../types/kinetic';
import { Project } from '../../types';

interface KineticBlocksOverlayProps {
  project: Project;
  pxPerSec: number;
  selectedClipIds: string[];
  onSelectBlock: (id: string) => void;
}

export const KineticBlocksOverlay: React.FC<KineticBlocksOverlayProps> = ({ project, pxPerSec, selectedClipIds, onSelectBlock }) => {
  const blocks = project.kineticBlocks || [];
  if (blocks.length === 0) return null;

  const HEADER_WIDTH = 150;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {blocks.map(block => {
        // Calculate dynamic start and end time based on clips
        const clips = project.tracks.flatMap(t => t.clips).filter(c => block.clipIds.includes(c.id));
        if (clips.length === 0) return null;

        const startTime = Math.min(...clips.map(c => c.startTime));
        const endTime = Math.max(...clips.map(c => c.startTime + c.duration));

        const left = HEADER_WIDTH + (startTime * pxPerSec);
        const width = (endTime - startTime) * pxPerSec;
        const isSelected = selectedClipIds.includes(block.id);

        return (
          <div
            key={block.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock(block.id);
            }}
            className={`absolute top-0 bottom-0 border-l-2 border-r-2 border-dashed flex items-start justify-center pt-2 pointer-events-auto cursor-pointer transition-all ${isSelected ? 'opacity-100 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]' : 'opacity-80 hover:opacity-100'}`}
            style={{
              left,
              width,
              backgroundColor: isSelected ? block.color.replace('0.3', '0.5') : block.color,
              borderColor: isSelected ? '#fff' : block.color.replace('0.3', '0.8')
            }}
          >
            <span 
              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded text-white transition-colors ${isSelected ? 'bg-indigo-500' : 'bg-black/50'}`}
              style={!isSelected ? { color: block.color.replace('0.3', '1') } : undefined}
            >
              {block.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
