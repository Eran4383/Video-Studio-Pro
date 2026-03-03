
import React from 'react';
import { Asset, Clip } from '../../types';

interface MagneticMarkersProps {
  asset: Asset | undefined;
  clip: Clip;
  pxPerSec: number;
}

export const MagneticMarkers: React.FC<MagneticMarkersProps> = ({ asset, clip, pxPerSec }) => {
  if (!asset || !asset.anchors || asset.anchors.length === 0) return null;

  // Filter anchors that are within the current clip's view (offset to offset + duration)
  const visibleAnchors = asset.anchors.filter(
    anchor => anchor >= clip.offset && anchor <= clip.offset + clip.duration
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {visibleAnchors.map((anchor, idx) => {
        const x = (anchor - clip.offset) * pxPerSec;
        return (
          <div 
            key={idx} 
            className="absolute top-0 bottom-0 w-px bg-indigo-400/40 shadow-[0_0_4px_rgba(129,140,248,0.3)]"
            style={{ left: x }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full" />
          </div>
        );
      })}
    </div>
  );
};
