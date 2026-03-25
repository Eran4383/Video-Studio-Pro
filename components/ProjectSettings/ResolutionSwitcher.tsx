import React from 'react';

const RATIOS = [
    { label: '16:9', width: 1920, height: 1080, class: 'w-8 h-4.5' },
    { label: '9:16', width: 1080, height: 1920, class: 'w-4.5 h-8' },
    { label: '1:1', width: 1080, height: 1080, class: 'w-6 h-6' },
    { label: '4:3', width: 1440, height: 1080, class: 'w-6 h-4.5' },
];

export const ResolutionSwitcher = ({ store }: { store: any }) => {
    const { project, setProjectResolution } = store;
    const currentRatio = RATIOS.find(r => r.width === project.resolution.width && r.height === project.resolution.height) || RATIOS[0];

    return (
        <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
            {RATIOS.map((ratio) => {
                const isActive = project.resolution.width === ratio.width && project.resolution.height === ratio.height;
                return (
                    <button
                        key={ratio.label}
                        onClick={() => setProjectResolution(ratio.width, ratio.height)}
                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded-md transition-all ${
                            isActive ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                        title={`${ratio.width}x${ratio.height}`}
                    >
                        <div className={`border-2 rounded-sm ${isActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-current'} ${ratio.class}`} />
                        <span className="text-[9px] font-mono font-bold">{ratio.label}</span>
                    </button>
                );
            })}
        </div>
    );
};
