import React from 'react';
import { KineticBlock } from '../../types/kinetic';
import { Project } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';

interface KineticBlocksOverlayProps {
  project: Project;
  pxPerSec: number;
  selectedClipIds: string[];
  kineticCutMode: boolean;
  onSelectBlock: (id: string) => void;
}

export const KineticBlocksOverlay = ({ project, pxPerSec, selectedClipIds, kineticCutMode, onSelectBlock }: KineticBlocksOverlayProps) => {
  const blocks = project.kineticBlocks || [];
  const { splitKineticChunk } = useProjectStore();
  if (blocks.length === 0) return null;

  return (
    <div className={`absolute inset-0 z-10 overflow-hidden ${kineticCutMode ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {blocks.map(block => {
        // Calculate dynamic start and end time based on clips
        const clips = project.tracks.flatMap(t => t.clips).filter(c => block.clipIds.includes(c.id));
        if (clips.length === 0) return null;

        const startTime = Math.min(...clips.map(c => c.startTime));
        const endTime = Math.max(...clips.map(c => c.startTime + c.duration));

        const left = Math.round(startTime * pxPerSec);
        const right = Math.round(endTime * pxPerSec);
        const width = right - left;
        const isSelected = selectedClipIds.includes(block.id);

        const children = blocks.filter(b => b.parentId === block.id);
        const isParent = children.length > 0;
        const isChild = !!block.parentId;

        if (isParent) {
          return (
            <div
              key={block.id}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                if (kineticCutMode) return;
                e.stopPropagation();
                onSelectBlock(block.id);
              }}
              className={`absolute top-0 bottom-0 border-l-2 border-r-2 border-t-2 border-dashed pointer-events-auto cursor-pointer transition-all z-10 will-change-transform ${isSelected ? 'opacity-100 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]' : 'opacity-80 hover:opacity-100'}`}
              style={{
                transform: `translateX(${left}px)`,
                width,
                backgroundColor: isSelected ? block.color.replace('0.3', '0.5') : block.color,
                borderColor: isSelected ? '#fff' : block.color.replace('0.3', '0.8')
              }}
            >
              <div 
                className="sticky top-0 h-6 flex items-center justify-center border-b-2 border-dashed z-20 backdrop-blur-sm"
                style={{ 
                  borderColor: isSelected ? '#fff' : block.color.replace('0.3', '0.8'),
                  backgroundColor: isSelected ? block.color.replace('0.3', '0.8') : block.color.replace('0.3', '0.6')
                }}
              >
                <span 
                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded text-white transition-colors ${isSelected ? 'bg-indigo-500' : 'bg-black/50'}`}
                  style={!isSelected ? { color: block.color.replace('0.3', '1') } : undefined}
                >
                  {block.name} (Group)
                </span>
              </div>
            </div>
          );
        }

        // Group words by chunkId (for child or standalone blocks)
        const chunks = (block.words || []).reduce((acc: Record<string, any[]>, word) => {
          const cid = word.chunkId || 'default';
          if (!acc[cid]) acc[cid] = [];
          acc[cid].push(word);
          return acc;
        }, {});

        return (
          <div
            key={block.id}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              if (kineticCutMode) return;
              e.stopPropagation();
              onSelectBlock(block.id);
            }}
            className={`absolute ${isChild ? 'top-6' : 'top-0'} bottom-0 border-l-2 border-r-2 border-dashed flex items-start justify-center pt-2 pointer-events-auto cursor-pointer transition-all z-20 will-change-transform ${isSelected ? 'opacity-100 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]' : 'opacity-80 hover:opacity-100'}`}
            style={{
              transform: `translateX(${left}px)`,
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
            
            {/* Render chunks */}
            <div className="absolute inset-0 flex">
              {Object.entries(chunks).map(([cid, words]: [string, any[]], index) => {
                const cStart = Math.min(...words.map(w => w.startTime));
                const cEnd = Math.max(...words.map(w => w.endTime));
                const cLeft = Math.round((cStart - startTime) * pxPerSec);
                const cRight = Math.round((cEnd - startTime) * pxPerSec);
                const cWidth = cRight - cLeft;
                
                const colors = [
                  'rgba(239, 68, 68, 0.2)', // red
                  'rgba(59, 130, 246, 0.2)', // blue
                  'rgba(16, 185, 129, 0.2)', // green
                  'rgba(245, 158, 11, 0.2)', // amber
                  'rgba(139, 92, 246, 0.2)', // violet
                  'rgba(236, 72, 153, 0.2)', // pink
                ];
                const storedColor = block.chunkColors?.[cid];
                const chunkColor = storedColor ? storedColor.replace('0.3', '0.2') : colors[index % colors.length];
                
                return (
                  <div 
                    key={cid}
                    className={`absolute top-0 bottom-0 border-r border-white/20 will-change-transform ${kineticCutMode ? 'cursor-crosshair' : ''}`}
                    style={{
                      transform: `translateX(${cLeft}px)`,
                      width: cWidth,
                      backgroundColor: chunkColor
                    }}
                    onClick={(e) => {
                      if (!kineticCutMode) return;
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const splitTime = (x / pxPerSec) + cStart;
                      splitKineticChunk(block.id, cid, splitTime);
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
