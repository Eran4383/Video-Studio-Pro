
import React, { useMemo } from 'react';
import { Asset, Clip } from '../../types';

interface WaveformProps {
  asset: Asset | undefined;
  clip: Clip;
  isExpanded?: boolean;
  waveformStyle?: 'solid' | 'lines';
}

export const Waveform: React.FC<WaveformProps> = ({ asset, clip, isExpanded, waveformStyle = 'solid' }) => {
  const pathData = useMemo(() => {
    const rawData = asset?.waveform || [];
    if (rawData.length === 0) {
      const seed = clip.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const fakeData: number[] = [];
      for (let i = 0; i < 300; i++) {
        const val = Math.max(0.01, Math.abs(Math.sin(seed + i * 0.1)) * 0.4);
        fakeData.push(-val, val);
      }
      return fakeData;
    }
    const sampleCount = rawData.length / 2;
    const startIdx = Math.floor((clip.offset / asset!.duration) * sampleCount) * 2;
    const endIdx = Math.floor(((clip.offset + clip.duration) / asset!.duration) * sampleCount) * 2;
    return rawData.slice(startIdx, endIdx);
  }, [asset, clip.id, clip.offset, clip.duration]);

  const svgPath = useMemo(() => {
    if (pathData.length === 0) return "";
    const width = 1000;
    const height = 100;
    const mid = height / 2;
    const step = width / ((pathData.length / 2) - 1);
    
    // Aggressive vertical scaling for "surgical" visibility
    const gain = isExpanded ? 1.5 : 1.0;

    if (waveformStyle === 'lines') {
      // We don't generate a single path for lines, we'll render individual lines
      return "";
    }

    let upper = `M 0 ${mid}`;
    let lower = ``;
    for (let i = 0; i < pathData.length; i += 2) {
      const minVal = pathData[i];
      const maxVal = pathData[i+1];
      const x = (i / 2) * step;
      const yMin = mid - (maxVal * (height / 2) * gain);
      const yMax = mid - (minVal * (height / 2) * gain);
      upper += ` L ${x} ${Math.max(0, yMin)}`;
      lower = ` L ${x} ${Math.min(height, yMax)}` + lower;
    }
    return upper + lower + " Z";
  }, [pathData, isExpanded, waveformStyle]);

  const renderLines = () => {
    if (pathData.length === 0 || waveformStyle !== 'lines') return null;
    const width = 1000;
    const height = 100;
    const mid = height / 2;
    const step = width / ((pathData.length / 2) - 1);
    const gain = isExpanded ? 1.5 : 1.0;
    
    const lines = [];
    for (let i = 0; i < pathData.length; i += 2) {
      const minVal = pathData[i];
      const maxVal = pathData[i+1];
      const x = (i / 2) * step;
      
      const amplitude = Math.max(Math.abs(minVal), Math.abs(maxVal));
      
      const yMin = mid - (maxVal * (height / 2) * gain);
      const yMax = mid - (minVal * (height / 2) * gain);
      
      // Color based on amplitude
      let color = "#4f46e5"; // default indigo
      if (amplitude > 0.8) color = "#ef4444"; // red for high
      else if (amplitude > 0.5) color = "#f59e0b"; // amber for medium
      else if (amplitude > 0.2) color = "#10b981"; // emerald for low-mid
      
      lines.push(
        <line 
          key={i} 
          x1={x} 
          y1={Math.max(0, yMin)} 
          x2={x} 
          y2={Math.min(height, yMax)} 
          stroke={color} 
          strokeWidth={Math.max(0.5, step * 0.8)} 
          strokeLinecap="round"
        />
      );
    }
    return lines;
  };

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
        {waveformStyle === 'solid' && (
          <path 
            d={svgPath} 
            fill={`url(#grad-${clip.id})`} 
            stroke={isExpanded ? "#6366f1" : "transparent"} 
            strokeWidth={isExpanded ? "0.3" : "0"} 
          />
        )}
        {waveformStyle === 'lines' && renderLines()}
        <line x1="0" y1="50" x2="1000" y2="50" stroke="#4338ca" strokeWidth="0.1" strokeDasharray="2,2" className="opacity-20" />
      </svg>
    </div>
  );
};
