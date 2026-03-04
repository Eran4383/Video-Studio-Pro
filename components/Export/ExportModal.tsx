
import React, { useState } from 'react';
import { X, Download, CheckCircle2, AlertCircle, Activity } from 'lucide-react';
import { Project, Asset } from '../../types';
import { ExportEngine } from '../../services/ExportEngine';

interface ExportModalProps {
  onClose: () => void;
  project: Project;
  assets: Asset[];
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose, project, assets }) => {
  const [step, setStep] = useState<'settings' | 'exporting' | 'finished'>('settings');
  const [progress, setProgress] = useState(0);
  const [filename, setFilename] = useState(project.name.toLowerCase().replace(/\s+/g, '_') || 'nexus_export');
  const [exportBlob, setExportBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startExport = async () => {
    setStep('exporting');
    setProgress(0);
    setError(null);

    try {
      const engine = new ExportEngine(project.resolution.width, project.resolution.height);
      const blob = await engine.render(project, assets, p => setProgress(p));
      
      if (blob.size < 1000) {
        throw new Error("Rendered file is too small. The recording might have failed due to system load.");
      }
      
      setExportBlob(blob);
      setStep('finished');
    } catch (err: any) {
      console.error("Export Error:", err);
      setError(err.message || "Export failed.");
      setStep('settings');
    }
  };

  const handleDownload = () => {
    if (!exportBlob) return;
    const url = URL.createObjectURL(exportBlob);
    const link = document.createElement('a');
    link.href = url;
    // We append .mp4, but the container depends on browser support. 
    // Most players (VLC, QuickTime, Chrome) handle this gracefully.
    link.download = `${filename}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-6 backdrop-blur-xl">
      <div className="bg-[#0a0a0a] border border-zinc-800/50 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-8 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
              <Activity size={20} className={step === 'exporting' ? 'animate-pulse' : ''} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest italic">MP4 Render</h2>
              <p className="text-[10px] text-zinc-500 font-bold">Project Architecture v2.2</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-all"><X size={20} /></button>
        </div>

        <div className="p-10">
          {step === 'settings' && (
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest ml-1">Export Label</label>
                <input 
                  type="text" 
                  value={filename} 
                  onChange={e => setFilename(e.target.value)} 
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:border-indigo-500 focus:bg-zinc-900 outline-none transition-all" 
                />
              </div>

              {error && (
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex gap-3 items-start">
                  <AlertCircle className="text-red-500 shrink-0" size={16} />
                  <p className="text-[10px] text-red-400 font-bold leading-relaxed uppercase">{error}</p>
                </div>
              )}

              <button 
                onClick={startExport} 
                className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-200 active:scale-95 transition-all shadow-xl shadow-white/5"
              >
                <Download size={18} /> Run Final Render
              </button>
            </div>
          )}

          {step === 'exporting' && (
            <div className="py-8 text-center space-y-8">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-zinc-800 rounded-full" />
                <div 
                  className="absolute inset-0 border-4 border-indigo-500 rounded-full transition-all duration-300" 
                  style={{ clipPath: `inset(0 0 0 0)`, transform: `rotate(${progress * 3.6}deg)`, borderTopColor: 'transparent', borderLeftColor: 'transparent' }} 
                />
                <div className="absolute inset-0 flex items-center justify-center text-lg font-black italic">
                  {Math.floor(progress)}%
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase italic tracking-[0.3em] animate-pulse">Encoding Sequence</p>
                <p className="text-[9px] text-zinc-600 font-bold mt-2">DO NOT CLOSE TAB • GPU ACCELERATED</p>
              </div>
            </div>
          )}

          {step === 'finished' && (
            <div className="text-center py-6 space-y-8">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter">Packaging Complete</h3>
                <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase">Ready for local storage</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={onClose} className="px-4 py-4 bg-zinc-900 hover:bg-zinc-800 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Dismiss</button>
                <button 
                  onClick={handleDownload} 
                  className="px-4 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <Download size={16} /> Save File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
