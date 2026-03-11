import React, { useRef, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';

export const KineticDrawOverlay: React.FC<{ store: any }> = ({ store }) => {
  const { kineticDrawMode, setKineticDrawMode, updateKineticData, updateKineticBlock, selectedClipIds, project } = store;
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  
  const primaryClipId = selectedClipIds[0];
  const isKineticBlock = primaryClipId?.startsWith('kb-');
  const selectedKineticBlock = isKineticBlock ? project.kineticBlocks?.find((b: any) => b.id === primaryClipId) : null;
  const selectedClip = project.tracks.flatMap((t: any) => t.clips).find((c: any) => selectedClipIds.includes(c.id));

  const targetId = isKineticBlock ? selectedKineticBlock?.id : selectedClip?.id;

  if (!kineticDrawMode || !targetId) return null;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setCurrentPos({ x, y });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    e.stopPropagation();
    setIsDrawing(false);
    setKineticDrawMode(false);

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    if (width > 0.05 && height > 0.05) { // Minimum size threshold
       const updateData = isKineticBlock ? updateKineticBlock : updateKineticData;
       updateData(targetId, {
         settings: {
           boundingBox: { x, y, width, height }
         }
       });
    }
  };

  return (
    <div 
      className="absolute inset-0 z-50 cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute inset-0 bg-black/20" /> {/* Dim background */}
      
      {isDrawing && (
        <div 
          className="absolute border-2 border-purple-500 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
          style={{
            left: `${Math.min(startPos.x, currentPos.x) * 100}%`,
            top: `${Math.min(startPos.y, currentPos.y) * 100}%`,
            width: `${Math.abs(currentPos.x - startPos.x) * 100}%`,
            height: `${Math.abs(currentPos.y - startPos.y) * 100}%`,
          }}
        />
      )}
      
      {!isDrawing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded-full text-xs font-bold pointer-events-none border border-white/10 shadow-xl backdrop-blur-sm animate-pulse">
          Draw Animation Area
        </div>
      )}
    </div>
  );
};
