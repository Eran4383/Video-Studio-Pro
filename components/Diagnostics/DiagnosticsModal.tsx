import React, { useEffect, useState } from 'react';
import { Activity, X, Cpu, HardDrive, Box, PlayCircle, AlertTriangle, FileText, Download, Clock, ArrowRightLeft } from 'lucide-react';
import { DiagnosticsService, SystemStats } from '../../services/DiagnosticsService';
import { ErrorReportingService } from '../../services/ErrorReportingService';
import { useProjectStore } from '../../store/useProjectStore';
import { Clip } from '../../types';

interface DiagnosticsModalProps {
  onClose: () => void;
  project: any;
  assets: any[];
}

export const DiagnosticsModal = ({ onClose, project, assets }: DiagnosticsModalProps) => {
  const store = useProjectStore();
  const [activeTab, setActiveTab] = useState<'system' | 'subtitles' | 'logs'>('system');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<{ avgFps: number, minFps: number, maxFps: number } | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [shiftAmount, setShiftAmount] = useState<string>('0');
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'system') {
      const service = DiagnosticsService.getInstance();
      service.startMonitoring();
      
      const interval = setInterval(() => {
        setStats(service.getStats());
      }, 500);

      return () => {
        service.stopMonitoring();
        clearInterval(interval);
      };
    } else if (activeTab === 'logs') {
      const service = DiagnosticsService.getInstance();
      setLogs([...service.getLogs()]);
      const interval = setInterval(() => {
        setLogs([...service.getLogs()]);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const runBenchmark = async () => {
    setIsBenchmarking(true);
    setBenchmarkResult(null);
    const result = await DiagnosticsService.getInstance().runBenchmark(5000);
    setBenchmarkResult(result);
    setIsBenchmarking(false);
  };

  const subtitleClips = project.tracks
    .filter(t => t.type === 'subtitle')
    .flatMap(t => t.clips)
    .sort((a, b) => a.startTime - b.startTime);

  const handleExportReport = () => {
    ErrorReportingService.generateFullReport(project, assets, {});
  };

  const handleShiftSubtitles = () => {
    const offset = parseFloat(shiftAmount);
    if (isNaN(offset) || offset === 0) return;

    // We need to update all subtitle clips
    // This is a bit hacky, ideally we'd have a batch update method in the store
    // But for now we can iterate and update. 
    // Actually, store.moveClip might trigger too many updates.
    // Let's assume we can just implement a batch update or iterate carefully.
    // Since we don't have batch update, we'll just use a loop but it might be slow for many clips.
    // Better approach: Add a specific action to store? 
    // For now, let's just iterate. The store update might be fast enough.
    
    // Actually, let's just update the store state directly via a custom action if possible, 
    // but we are limited to the exposed methods.
    // Let's use `moveClip` for each.
    
    subtitleClips.forEach(clip => {
      store.moveClip(clip.id, clip.startTime + offset, clip.layer);
    });
    
    alert(`Shifted ${subtitleClips.length} subtitles by ${offset}s`);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[400] flex items-center justify-center backdrop-blur-md">
      <div className="bg-[#0a0a0a] border border-zinc-800 w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/30 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                <Activity size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-widest italic text-white">Diagnostics</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">System & Content Analysis</p>
              </div>
            </div>
            
            <div className="h-8 w-px bg-zinc-800 mx-2" />
            
            <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
              <button 
                onClick={() => setActiveTab('system')}
                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'system' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                System Stats
              </button>
              <button 
                onClick={() => setActiveTab('subtitles')}
                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'subtitles' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Subtitle Inspector
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Logs
              </button>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'system' ? (
            <div className="p-8 grid grid-cols-2 gap-6 h-full overflow-y-auto">
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
                    <Box className="text-blue-500" size={18} />
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
          ) : activeTab === 'subtitles' ? (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-zinc-800 bg-zinc-900/20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-zinc-800/50 p-1.5 rounded-lg border border-zinc-700">
                    <Clock size={14} className="text-zinc-400 ml-2" />
                    <input 
                      type="number" 
                      step="0.1" 
                      value={shiftAmount}
                      onChange={(e) => setShiftAmount(e.target.value)}
                      className="bg-transparent w-16 text-xs font-mono font-bold text-white focus:outline-none text-right"
                    />
                    <span className="text-[10px] text-zinc-500 font-bold pr-2">SEC</span>
                  </div>
                  <button 
                    onClick={handleShiftSubtitles}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2"
                  >
                    <ArrowRightLeft size={14} /> Shift All
                  </button>
                </div>

                <button 
                  onClick={handleExportReport}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 border border-zinc-700"
                >
                  <Download size={14} /> Export JSON Report
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {subtitleClips.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                    <FileText size={48} className="mb-4 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">No Subtitles Found</p>
                  </div>
                ) : (
                  <div className="border border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-900/50 border-b border-zinc-800">
                          <th className="p-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 w-16">ID</th>
                          <th className="p-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">Content</th>
                          <th className="p-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 w-24 text-right">Start</th>
                          <th className="p-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 w-24 text-right">End</th>
                          <th className="p-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 w-24 text-right">Dur</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {subtitleClips.map((clip, i) => (
                          <tr key={clip.id} className="hover:bg-zinc-900/30 transition-colors group">
                            <td className="p-3 text-[10px] font-mono text-zinc-600">#{i + 1}</td>
                            <td className="p-3 text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">"{clip.content}"</td>
                            <td className="p-3 text-[10px] font-mono text-zinc-400 text-right">{clip.startTime.toFixed(3)}s</td>
                            <td className="p-3 text-[10px] font-mono text-zinc-400 text-right">{(clip.startTime + clip.duration).toFixed(3)}s</td>
                            <td className="p-3 text-[10px] font-mono text-zinc-500 text-right">{clip.duration.toFixed(3)}s</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-zinc-800 bg-zinc-900/20 flex justify-end">
                <button 
                  onClick={() => { DiagnosticsService.getInstance().clearLogs(); setLogs([]); }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                >
                  Clear Logs
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="text-zinc-500 text-center py-10">No logs recorded</div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="p-2 rounded bg-zinc-900/50 border border-zinc-800 flex gap-3">
                      <span className="text-zinc-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={`shrink-0 font-bold w-16 uppercase text-[10px] ${
                        log.level === 'error' ? 'text-red-500' : 
                        log.level === 'warn' ? 'text-orange-500' : 
                        log.level === 'debug' ? 'text-zinc-500' : 'text-cyan-500'
                      }`}>{log.level}</span>
                      <span className="text-zinc-400 shrink-0 font-bold w-24 truncate">[{log.category}]</span>
                      <span className="text-zinc-300 break-all">{log.message}</span>
                      {log.details && (
                        <details className="w-full mt-1">
                          <summary className="cursor-pointer text-zinc-600 hover:text-zinc-400 text-[10px]">Details</summary>
                          <pre className="mt-1 p-2 bg-black rounded text-[10px] text-zinc-400 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
