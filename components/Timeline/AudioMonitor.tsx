
import React, { useMemo, useState, useEffect } from 'react';
import { Asset, Project } from '../../types';

interface AudioMonitorProps {
  project: Project;
  assets: Asset[];
  currentTime: number;
  orientation?: 'horizontal' | 'vertical';
}

export const AudioMonitor: React.FC<AudioMonitorProps> = ({ project, assets, currentTime, orientation = 'vertical' }) => {
  const [peak, setPeak] = useState(0);

  const currentLevel = useMemo(() => {
    // Find all clips playing at currentTime from all visible and unmuted tracks
    const activeClips = project.tracks
      .filter(t => t.isVisible && !t.isMuted)
      .flatMap(t => t.clips)
      .filter(c => currentTime >= c.startTime && currentTime <= c.startTime + c.duration);

    if (activeClips.length === 0) return 0;

    let totalAmp = 0;
    activeClips.forEach(clip => {
      const asset = assets.find(a => a.id === clip.assetId);
      if (!asset || !asset.waveform || asset.waveform.length === 0) return;

      const sampleCount = asset.waveform.length / 2;
      const timeInAsset = (currentTime - clip.startTime) + clip.offset;
      const sampleIdx = Math.floor((timeInAsset / asset.duration) * sampleCount) * 2;
      
      if (sampleIdx >= 0 && sampleIdx < asset.waveform.length) {
        const minVal = asset.waveform[sampleIdx];
        const maxVal = asset.waveform[sampleIdx + 1];
        totalAmp += Math.max(Math.abs(minVal), Math.abs(maxVal));
      }
    });

    const level = Math.min(1, totalAmp / activeClips.length);
    return level;
  }, [project, assets, currentTime]);

  useEffect(() => {
    if (currentLevel > peak) {
      setPeak(currentLevel);
    } else {
      const timer = setTimeout(() => {
        setPeak(prev => Math.max(0, prev - 0.05));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentLevel, peak]);

  if (orientation === 'horizontal') {
    return (
      <div className="flex flex-col gap-1 w-32 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded p-2 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Audio Level</span>
          <span className="text-[9px] font-mono text-indigo-400">{(currentLevel * 100).toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 transition-all duration-75"
            style={{ width: `${currentLevel * 100}%` }}
          />
          {/* Peak hold marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-20 transition-all duration-300"
            style={{ left: `${peak * 100}%` }}
          />
          <div className="absolute inset-y-0 left-[80%] w-px bg-zinc-700" />
          <div className="absolute inset-y-0 left-[95%] w-px bg-zinc-700" />
        </div>
        <div className="flex justify-between text-[7px] font-mono text-zinc-600 uppercase">
          <span>-inf</span>
          <span>-6db</span>
          <span>0db</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full h-full bg-[#121212] p-1.5 py-4 relative select-none">
      <div className="flex-1 w-2 bg-zinc-900 rounded-full overflow-hidden relative flex flex-col justify-end border border-white/5">
        <div 
          className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 transition-all duration-75"
          style={{ height: `${currentLevel * 100}%` }}
        />
        
        {/* Peak hold marker */}
        <div 
          className="absolute left-0 right-0 h-0.5 bg-white/60 z-20 transition-all duration-300"
          style={{ bottom: `${peak * 100}%` }}
        />

        {/* Reference lines */}
        <div className="absolute inset-x-0 bottom-[80%] h-px bg-white/20 z-10" />
        <div className="absolute inset-x-0 bottom-[95%] h-px bg-white/20 z-10" />
      </div>

      <div className="flex flex-col justify-between h-[calc(100%-60px)] py-1 text-[7px] font-mono text-zinc-500 uppercase absolute right-1 top-12 pointer-events-none">
        <span className="text-red-500/80">0</span>
        <span className="text-yellow-500/80">-6</span>
        <span>-12</span>
        <span>-24</span>
        <span>-48</span>
      </div>

      <div className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-tighter">LR</div>
    </div>
  );
};
