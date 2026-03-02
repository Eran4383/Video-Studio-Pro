import React, { useEffect, useState } from 'react';
import { Activity, X, Cpu, HardDrive, Layers, PlayCircle, AlertTriangle } from 'lucide-react';
import { DiagnosticsService, SystemStats } from '../../services/DiagnosticsService';

interface DiagnosticsModalProps {
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ onClose }) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<{ avgFps: number, minFps: number, maxFps: number } | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  useEffect(() => {
    const service = DiagnosticsService.getInstance();
    service.startMonitoring();
    
    const interval = setInterval(() => {
      setStats(service.getStats());
    }, 500);

    return () => {
      service.stopMonitoring();
      clearInterval(interval);
    };
  }, []);

  const runBenchmark = async () => {
    setIsBenchmarking(true);
    setBenchmarkResult(null);
    const result = await DiagnosticsService.getInstance().runBenchmark(5000);
    setBenchmarkResult(result);
    setIsBenchmarking(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[400] flex items-center justify-center backdrop-blur-md">
      <div className="bg-[#0a0a0a] border border-zinc-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/30">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest italic text-white">System Diagnostics</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Real-time Performance Analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all"><X size={18} /></button>
        </div>

        <div className="p-8 grid grid-cols-2 gap-6">
          {/* Real-time Stats */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase text-zinc-600 tracking-widest mb-4">Live Metrics</h3>
            
            <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cpu className="text-indigo-500" size={18} />
                <span className="text-xs font-bold text-zinc-400">FPS (Render Loop)</span>
              </div>
              <span className={`text-xl font-black font-mono ${stats && stats.fps < 30 ? 'text-red-500' : 'text-green-500'}`}>
                {stats?.fps || 0}
              </span>
            </div>

            <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HardDrive className="text-orange-500" size={18} />
                <span className="text-xs font-bold text-zinc-400">Memory Usage</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black font-mono text-white">{stats?.memoryUsed || 0} MB</span>
                <span className="text-[9px] text-zinc-600 block">of {stats?.memoryLimit || 0} MB Limit</span>
              </div>
            </div>

            <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="text-blue-500" size={18} />
                <span className="text-xs font-bold text-zinc-400">DOM Nodes</span>
              </div>
              <span className="text-xl font-black font-mono text-white">{stats?.domNodes || 0}</span>
            </div>
          </div>

          {/* Benchmark & Advice */}
          <div className="space-y-6">
             <h3 className="text-xs font-black uppercase text-zinc-600 tracking-widest mb-4">Health Check</h3>
             
             <div className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800 h-full flex flex-col justify-between">
               {!benchmarkResult ? (
                 <div className="text-center space-y-4 my-auto">
                   <p className="text-xs text-zinc-400 leading-relaxed">
                     Run a 5-second stress test to evaluate playback performance on this device.
                   </p>
                   <button 
                     onClick={runBenchmark}
                     disabled={isBenchmarking}
                     className="w-full py-3 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                   >
                     {isBenchmarking ? <Activity className="animate-spin" size={16} /> : <PlayCircle size={16} />}
                     {isBenchmarking ? 'Analyzing...' : 'Start Benchmark'}
                   </button>
                 </div>
               ) : (
                 <div className="space-y-4 animate-in fade-in">
                   <div className="grid grid-cols-3 gap-2 text-center">
                     <div className="p-2 bg-zinc-800 rounded-lg">
                       <span className="block text-[9px] text-zinc-500 font-bold">MIN</span>
                       <span className="text-lg font-mono font-black text-red-400">{benchmarkResult.minFps}</span>
                     </div>
                     <div className="p-2 bg-zinc-800 rounded-lg">
                       <span className="block text-[9px] text-zinc-500 font-bold">AVG</span>
                       <span className="text-lg font-mono font-black text-white">{benchmarkResult.avgFps}</span>
                     </div>
                     <div className="p-2 bg-zinc-800 rounded-lg">
                       <span className="block text-[9px] text-zinc-500 font-bold">MAX</span>
                       <span className="text-lg font-mono font-black text-green-400">{benchmarkResult.maxFps}</span>
                     </div>
                   </div>
                   
                   <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex gap-3 items-start">
                     <AlertTriangle className="text-indigo-400 shrink-0 mt-0.5" size={14} />
                     <p className="text-[10px] text-indigo-200 leading-relaxed">
                       {benchmarkResult.avgFps < 24 
                         ? "Performance is low. Try closing other tabs, reducing project resolution, or using 'Proxy Mode' if available."
                         : "System performance is optimal for playback."}
                     </p>
                   </div>

                   <button 
                     onClick={() => setBenchmarkResult(null)}
                     className="w-full py-2 bg-zinc-800 text-zinc-400 font-bold text-xs uppercase rounded-lg hover:bg-zinc-700 transition-all"
                   >
                     Reset Test
                   </button>
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
