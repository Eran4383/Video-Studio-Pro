
import React, { useMemo } from 'react';
import { Asset, Clip, WAVEFORM_SAMPLES_PER_SECOND } from '../../types';

interface WaveformProps {
  asset: Asset | undefined;
  clip: Clip;
  isExpanded?: boolean;
  waveformStyle?: 'solid' | 'lines';
  pxPerSec: number;
  fps?: number;
}

export const Waveform = ({ asset, clip, isExpanded, waveformStyle = 'solid', pxPerSec, fps = 30 }: WaveformProps) => {
  const svgWidth = clip.duration * pxPerSec;
  const svgHeight = 100;
  const mid = svgHeight / 2;
  const frameWidth = pxPerSec / WAVEFORM_SAMPLES_PER_SECOND;

  const pathData = useMemo(() => {
    const rawData = asset?.waveform || [];
    if (rawData.length === 0) {
      // Generate deterministic fake data if no real data exists
      const seed = clip.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const fakeData: number[] = [];
      // At least 1 sample per frame for fake data
      const samplesNeeded = Math.ceil(clip.duration * WAVEFORM_SAMPLES_PER_SECOND);
      for (let i = 0; i < samplesNeeded; i++) {
        const val = Math.max(0.01, Math.abs(Math.sin(seed + i * 0.1)) * 0.4);
        fakeData.push(-val, val);
      }
      return fakeData;
    }

    const totalSamples = rawData.length / 2;
    // Align startIdx to waveform sample boundaries
    const startIdx = Math.floor((clip.offset * WAVEFORM_SAMPLES_PER_SECOND)) * 2;
    const endIdx = Math.ceil(((clip.offset + clip.duration) * WAVEFORM_SAMPLES_PER_SECOND)) * 2;
    
    return rawData.slice(startIdx, endIdx);
  }, [asset, clip.id, clip.offset, clip.duration]);

  const svgPath = useMemo(() => {
    if (pathData.length === 0 || waveformStyle === 'lines') return "";
    
    const gain = isExpanded ? 1.5 : 1.0;
    let upper = `M 0 ${mid}`;
    let lower = ``;
    
    for (let i = 0; i < pathData.length; i += 2) {
      const minVal = pathData[i];
      const maxVal = pathData[i+1];
      const x = (i / 2) * frameWidth;
      const yMin = mid - (maxVal * mid * gain);
      const yMax = mid - (minVal * mid * gain);
      
      upper += ` L ${x} ${Math.max(0, yMin)}`;
      lower = ` L ${x} ${Math.min(svgHeight, yMax)}` + lower;
    }
    
    return upper + lower + " Z";
  }, [pathData, frameWidth, isExpanded, waveformStyle, mid, svgHeight]);

  const renderLines = () => {
    if (pathData.length === 0 || waveformStyle !== 'lines') return null;
    const gain = isExpanded ? 1.5 : 1.0;
    
    const lines = [];
    const segmentHeight = 2;
    const gap = 1;
    const segmentTotal = segmentHeight + gap;
    
    for (let i = 0; i < pathData.length; i += 2) {
      const minVal = pathData[i];
      const maxVal = pathData[i+1];
      const x = (i / 2) * frameWidth;
      
      const amplitude = Math.max(Math.abs(minVal), Math.abs(maxVal)) * gain;
      const barHeight = amplitude * (isExpanded ? svgHeight / 2 : svgHeight);
      const segments = Math.floor(barHeight / segmentTotal);
      
      const centerY = isExpanded ? svgHeight / 2 : svgHeight;
      
      for (let s = 0; s < segments; s++) {
        let color = '#ef4444'; // Default Red
        if (s < 2) color = '#ef4444'; // Bottom 2: Red
        else if (s < 6) color = '#4ade80'; // Next 4: Green
        else if (s < 12) color = '#fbbf24'; // Next 6: Yellow
        else if (s < 16) color = '#f97316'; // Next 4: Orange
        else color = '#ef4444'; // Top: Red
        
        // Draw upwards
        const syUp = centerY - (s + 1) * segmentTotal;
        lines.push(
          <rect 
            key={`${i}-${s}-up`} 
            x={x} 
            y={syUp} 
            width={Math.max(2, frameWidth * 0.8)} 
            height={segmentHeight} 
            fill={color} 
            rx={0.5}
          />
        );
        
        // Draw downwards if expanded (mirrored)
        if (isExpanded) {
          const syDown = centerY + s * segmentTotal;
          lines.push(
            <rect 
              key={`${i}-${s}-down`} 
              x={x} 
              y={syDown} 
              width={Math.max(2, frameWidth * 0.8)} 
              height={segmentHeight} 
              fill={color} 
              rx={0.5}
            />
          );
        }
      }
    }
    return lines;
  };

  return (
    <div className={`absolute inset-0 pointer-events-none transition-all duration-500 ${isExpanded ? 'opacity-100 bg-indigo-500/5' : 'opacity-60'}`}>
      <svg 
        width={svgWidth} 
        height={svgHeight} 
        className="w-full h-full shape-rendering-auto"
      >
        <defs>
          <linearGradient id={`grad-${clip.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isExpanded ? "#818cf8" : "#4f46e5"} />
            <stop offset="50%" stopColor={isExpanded ? "#e0e7ff" : "#818cf8"} />
            <stop offset="100%" stopColor={isExpanded ? "#818cf8" : "#4f46e5"} />
          </linearGradient>
        </defs>
        {waveformStyle === 'solid' && (
          <path 
            d={svgPath} 
            fill={`url(#grad-${clip.id})`} 
            stroke={isExpanded ? "#6366f1" : "transparent"} 
            strokeWidth={isExpanded ? "0.3" : "0"} 
          />
        )}
        {waveformStyle === 'lines' && renderLines()}
        <line x1="0" y1={mid} x2={svgWidth} y2={mid} stroke="#4338ca" strokeWidth="0.1" strokeDasharray="2,2" className="opacity-20" />
      </svg>
    </div>
  );
};
