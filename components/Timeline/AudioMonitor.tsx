
import React, { useMemo } from 'react';
import { Asset, Project } from '../../types';

interface AudioMonitorProps {
  project: Project;
  assets: Asset[];
  currentTime: number;
}

export const AudioMonitor: React.FC<AudioMonitorProps> = ({ project, assets, currentTime }) => {
  const currentLevel = useMemo(() => {
    // Find all audio clips playing at currentTime
    const audioClips = project.tracks
      .filter(t => t.type === 'audio' && t.isVisible && !t.isMuted)
      .flatMap(t => t.clips)
      .filter(c => currentTime >= c.startTime && currentTime <= c.startTime + c.duration);

    if (audioClips.length === 0) return 0;

    let totalAmp = 0;
    audioClips.forEach(clip => {
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

    return Math.min(1, totalAmp / audioClips.length);
  }, [project, assets, currentTime]);

  return (
    <div className="flex flex-col gap-1 w-32 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded p-2 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Audio Level</span>
        <span className="text-[9px] font-mono text-indigo-400">{(currentLevel * 100).toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-600 via-emerald-500 to-red-500 transition-all duration-75"
          style={{ width: `${currentLevel * 100}%` }}
        />
        {/* Peak markers */}
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
};
