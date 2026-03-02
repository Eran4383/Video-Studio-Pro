
import React, { useMemo } from 'react';
import { Asset, Clip } from '../../types';

interface WaveformProps {
  asset: Asset | undefined;
  clip: Clip;
  isExpanded?: boolean;
}

export const Waveform: React.FC<WaveformProps> = ({ asset, clip, isExpanded }) => {
  const pathData = useMemo(() => {
    const rawData = asset?.waveform || [];
    if (rawData.length === 0) {
      const seed = clip.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return Array.from({ length: 300 }, (_, i) => Math.max(0.01, Math.abs(Math.sin(seed + i * 0.1)) * 0.4));
    }
    const sampleCount = rawData.length;
    const startIdx = Math.floor((clip.offset / asset!.duration) * sampleCount);
    const endIdx = Math.floor(((clip.offset + clip.duration) / asset!.duration) * sampleCount);
    return rawData.slice(startIdx, endIdx);
  }, [asset, clip.id, clip.offset, clip.duration]);

  const svgPath = useMemo(() => {
    if (pathData.length === 0) return "";
    const width = 1000;
    const height = 100;
    const mid = height / 2;
    const step = width / (pathData.length - 1);
    
    // Aggressive vertical scaling for "surgical" visibility
    const gain = isExpanded ? 2.5 : 1.2;

    let upper = `M 0 ${mid}`;
    let lower = `L ${width} ${mid}`;
    pathData.forEach((val, i) => {
      const x = i * step;
      const amp = val * (height / 2) * gain;
      const cappedAmp = Math.min(mid - 1, amp);
      upper += ` L ${x} ${mid - cappedAmp}`;
      lower = ` L ${x} ${mid + cappedAmp}` + lower;
    });
    return upper + lower + " Z";
  }, [pathData, isExpanded]);

  return (
    <div className={`absolute inset-0 pointer-events-none transition-all duration-500 ${isExpanded ? 'opacity-100 bg-indigo-500/5' : 'opacity-60'}`}>
      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="w-full h-full shape-rendering-auto">
        <defs>
          <linearGradient id={`grad-${clip.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isExpanded ? "#818cf8" : "#4f46e5"} />
            <stop offset="50%" stopColor={isExpanded ? "#e0e7ff" : "#818cf8"} />
            <stop offset="100%" stopColor={isExpanded ? "#818cf8" : "#4f46e5"} />
          </linearGradient>
        </defs>
        <path 
          d={svgPath} 
          fill={`url(#grad-${clip.id})`} 
          stroke={isExpanded ? "#6366f1" : "transparent"} 
          strokeWidth={isExpanded ? "0.3" : "0"} 
        />
        <line x1="0" y1="50" x2="1000" y2="50" stroke="#4338ca" strokeWidth="0.1" strokeDasharray="2,2" className="opacity-20" />
      </svg>
    </div>
  );
};
