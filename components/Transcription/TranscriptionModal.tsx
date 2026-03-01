import React, { useState } from 'react';
import { Asset, Clip, Project } from '../../types';
import { TranscriptionService } from '../../services/TranscriptionService';
import { Type, Loader2, FileAudio, AlignLeft, Minimize2 } from 'lucide-react';

interface TranscriptionModalProps {
  assets: Asset[];
  project: Project;
  selectedClipId: string | null;
  onClose: () => void;
  onMinimize: () => void;
  onAddTrack: (type: 'video' | 'audio' | 'subtitle', trackId?: string) => void;
  onAddClips: (trackId: string, clips: Clip[]) => void;
  onUpdateClip: (clipId: string, updates: Partial<Clip>) => void;
  onStart: () => void;
  onUpdate: (status: string) => void;
  onComplete: () => void;
}

export const TranscriptionModal: React.FC<TranscriptionModalProps> = ({ 
  assets, project, selectedClipId, onClose, onMinimize, onAddTrack, onAddClips, onUpdateClip,
  onStart, onUpdate, onComplete
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    selectedClipId ? (project.tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId)?.assetId || '') : ''
  );
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');

  const updateStatus = (msg: string) => {
    setStatus(msg);
    onUpdate(msg);
  };

  const process = async () => {
    const asset = assets.find(a => a.id === selectedAssetId);
    if (!asset) return;
    
    setIsProcessing(true);
    onStart();
    updateStatus('Preparing audio...');
    
    try {
      updateStatus('Analyzing audio with Gemini AI...');
      const results = await TranscriptionService.processAsset(asset, transcript);
      
      updateStatus('Creating subtitle track...');
      
      // Check if subtitle track exists in current project prop
      let targetTrackId = project.tracks.find(t => t.type === 'subtitle')?.id;
      
      if (!targetTrackId) {
        // Generate ID upfront to avoid stale state issues
        targetTrackId = `track-s-${Date.now()}`;
        onAddTrack('subtitle', targetTrackId); // Pass the ID we just generated
        
        // Small delay to ensure store update processes (though we already have the ID)
        await new Promise(r => setTimeout(r, 50));
      }
      
      updateStatus('Generating clips...');
      
      // Calculate offset based on the selected clip on the timeline
      let timelineOffset = 0;
      if (selectedClipId) {
        const selectedClip = project.tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId);
        if (selectedClip && selectedClip.assetId === selectedAssetId) {
          timelineOffset = selectedClip.startTime - selectedClip.offset;
        }
      }

      const clips = TranscriptionService.convertToClips(results, asset.id, targetTrackId, timelineOffset);
      onAddClips(targetTrackId, clips);
      
      // Add markers to the source audio clip
      updateStatus('Adding markers to audio...');
      const markers = TranscriptionService.convertToMarkers(results);
      
      // Find the clip to add markers to
      let sourceClipId: string | null = null;
      
      // Check if the currently selected clip matches the asset we just transcribed
      if (selectedClipId) {
         const clip = project.tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId);
         if (clip && clip.assetId === selectedAssetId) {
            sourceClipId = clip.id;
         }
      }

      if (!sourceClipId) {
        // If not, find the first clip that uses this asset
        const foundClip = project.tracks.flatMap(t => t.clips).find(c => c.assetId === selectedAssetId);
        if (foundClip) sourceClipId = foundClip.id;
      }

      if (sourceClipId) {
        onUpdateClip(sourceClipId, { markers });
      }

      updateStatus('Complete');
      onComplete();
    } catch (e: any) {
      console.error(e);
      alert(`Transcription failed: ${e.message}`);
      setIsProcessing(false);
      updateStatus('Failed');
      onUpdate('Failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl w-[500px] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400">
              <Type size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Captioning</h2>
              <p className="text-xs text-zinc-500">Generate subtitles from audio</p>
            </div>
          </div>
          <div className="flex gap-2">
             {isProcessing && (
               <button onClick={onMinimize} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors">
                 <Minimize2 size={18} />
               </button>
             )}
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Source Asset</label>
            <div className="relative">
              <select 
                value={selectedAssetId} 
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-indigo-500 outline-none appearance-none"
              >
                <option value="">Select an asset...</option>
                {assets.filter(a => a.type === 'AUDIO' || a.type === 'VIDEO').map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <FileAudio className="absolute right-3 top-3 text-zinc-600 pointer-events-none" size={16} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Transcript (Optional)</span>
              <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">Forced Alignment</span>
            </label>
            <div className="relative">
              <textarea 
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste script here to align perfectly with audio..."
                className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-indigo-500 outline-none resize-none"
              />
              <AlignLeft className="absolute right-3 top-3 text-zinc-700 pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between gap-3">
          <span className="text-[10px] font-mono text-indigo-400 animate-pulse">{status}</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors">CANCEL</button>
            <button 
              onClick={process} 
              disabled={!selectedAssetId || isProcessing}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Type size={14} />}
              {isProcessing ? 'PROCESSING...' : 'GENERATE CAPTIONS'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
