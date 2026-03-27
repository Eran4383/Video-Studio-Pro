import React, { useState, useEffect } from 'react';
import { Settings, Maximize2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const RATIOS = [
    { label: '16:9', width: 1920, height: 1080, class: 'w-6 h-3.5' },
    { label: '9:16', width: 1080, height: 1920, class: 'w-3.5 h-6' },
    { label: '1:1', width: 1080, height: 1080, class: 'w-4.5 h-4.5' },
    { label: '4:3', width: 1440, height: 1080, class: 'w-5 h-4' },
];

export const ResolutionSwitcher = ({ store, headless }: { store: any, headless?: boolean }) => {
    const { project, setProjectResolution } = store;
    const [isHovered, setIsHovered] = useState(false);
    const [isManual, setIsManual] = useState(false);
    const [manualWidth, setManualWidth] = useState(project.resolution.width);
    const [manualHeight, setManualHeight] = useState(project.resolution.height);

    const currentRatio = RATIOS.find(r => r.width === project.resolution.width && r.height === project.resolution.height);

    useEffect(() => {
        setManualWidth(project.resolution.width);
        setManualHeight(project.resolution.height);
    }, [project.resolution]);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProjectResolution(Number(manualWidth), Number(manualHeight));
        setIsManual(false);
    };

    if (headless) {
        return (
            <div className="p-1">
                {!isManual ? (
                    <div className="grid grid-cols-2 gap-1">
                        {RATIOS.map((ratio) => {
                            const isActive = project.resolution.width === ratio.width && project.resolution.height === ratio.height;
                            return (
                                <button
                                    key={ratio.label}
                                    onClick={() => setProjectResolution(ratio.width, ratio.height)}
                                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all ${
                                        isActive ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                                    }`}
                                >
                                    <div className={`border-2 rounded-sm ${isActive ? 'border-white' : 'border-current'} ${ratio.class}`} />
                                    <span className="text-[9px] font-bold">{ratio.label}</span>
                                </button>
                            );
                        })}
                        <button 
                            onClick={() => setIsManual(true)}
                            className="col-span-2 flex items-center justify-center gap-2 p-2 mt-1 text-[10px] font-bold text-zinc-500 hover:text-indigo-400 hover:bg-zinc-800 rounded-xl transition-all"
                        >
                            <Settings size={14} /> CUSTOM DIMENSIONS
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleManualSubmit} className="p-2 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Manual Set</span>
                            <button type="button" onClick={() => setIsManual(false)} className="text-[10px] text-zinc-600 hover:text-zinc-400">Presets</button>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="text-[8px] font-bold text-zinc-600 uppercase block mb-1">Width</label>
                                <input 
                                    type="number" 
                                    value={manualWidth} 
                                    onChange={(e) => setManualWidth(Number(e.target.value))}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <span className="text-zinc-700 mt-4">×</span>
                            <div className="flex-1">
                                <label className="text-[8px] font-bold text-zinc-600 uppercase block mb-1">Height</label>
                                <input 
                                    type="number" 
                                    value={manualHeight} 
                                    onChange={(e) => setManualHeight(Number(e.target.value))}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-xl font-bold text-[10px] hover:bg-indigo-500 transition-all">
                            <Maximize2 size={12} /> APPLY DIMENSIONS
                        </button>
                    </form>
                )}
            </div>
        );
    }

    return (
        <div 
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setIsManual(false);
            }}
        >
            {/* Compact Trigger */}
            <div className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer
                ${isHovered ? 'bg-zinc-800 border-zinc-700 shadow-xl' : 'bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm'}
            `}>
                <div className={`border border-zinc-500 rounded-sm ${currentRatio?.class || 'w-4 h-4'}`} />
                <span className="text-[10px] font-black tracking-tighter uppercase text-zinc-400">
                    {currentRatio ? currentRatio.label : `${project.resolution.width}×${project.resolution.height}`}
                </span>
                <ChevronDown size={12} className={`text-zinc-600 transition-transform ${isHovered ? 'rotate-180' : ''}`} />
            </div>

            {/* Expanded Menu */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-0 mt-2 p-2 bg-[#1a1a1a] border border-zinc-800 rounded-2xl shadow-2xl z-[100] min-w-[200px]"
                    >
                        {!isManual ? (
                            <div className="grid grid-cols-2 gap-1">
                                {RATIOS.map((ratio) => {
                                    const isActive = project.resolution.width === ratio.width && project.resolution.height === ratio.height;
                                    return (
                                        <button
                                            key={ratio.label}
                                            onClick={() => setProjectResolution(ratio.width, ratio.height)}
                                            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all ${
                                                isActive ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                                            }`}
                                        >
                                            <div className={`border-2 rounded-sm ${isActive ? 'border-white' : 'border-current'} ${ratio.class}`} />
                                            <span className="text-[9px] font-bold">{ratio.label}</span>
                                        </button>
                                    );
                                })}
                                <button 
                                    onClick={() => setIsManual(true)}
                                    className="col-span-2 flex items-center justify-center gap-2 p-2 mt-1 text-[10px] font-bold text-zinc-500 hover:text-indigo-400 hover:bg-zinc-800 rounded-xl transition-all"
                                >
                                    <Settings size={14} /> CUSTOM DIMENSIONS
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleManualSubmit} className="p-2 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Manual Set</span>
                                    <button type="button" onClick={() => setIsManual(false)} className="text-[10px] text-zinc-600 hover:text-zinc-400">Presets</button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <label className="text-[8px] font-bold text-zinc-600 uppercase block mb-1">Width</label>
                                        <input 
                                            type="number" 
                                            value={manualWidth} 
                                            onChange={(e) => setManualWidth(Number(e.target.value))}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <span className="text-zinc-700 mt-4">×</span>
                                    <div className="flex-1">
                                        <label className="text-[8px] font-bold text-zinc-600 uppercase block mb-1">Height</label>
                                        <input 
                                            type="number" 
                                            value={manualHeight} 
                                            onChange={(e) => setManualHeight(Number(e.target.value))}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-xl font-bold text-[10px] hover:bg-indigo-500 transition-all">
                                    <Maximize2 size={12} /> APPLY DIMENSIONS
                                </button>
                            </form>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
