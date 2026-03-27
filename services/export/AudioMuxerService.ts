import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { Project, Asset } from '../../types';
import { ErrorReportingService } from '../ErrorReportingService';

export class AudioMuxerService {
  private muxer: Muxer<ArrayBufferTarget>;
  private encoder: AudioEncoder;
  private sampleRate: number = 44100; // Standard AAC sample rate
  private numberOfChannels: number = 2; // Stereo

  private audioBufferCache: Map<string, AudioBuffer> = new Map();

  constructor(muxer: Muxer<ArrayBufferTarget>) {
    this.muxer = muxer;

    this.encoder = new AudioEncoder({
      output: (chunk, meta) => {
        this.muxer.addAudioChunk(chunk, meta);
      },
      error: (e) => {
        console.error('[AudioMuxerService] Encoder Error:', e);
      }
    });

    this.encoder.configure({
      codec: 'mp4a.40.2', // AAC LC
      sampleRate: this.sampleRate,
      numberOfChannels: this.numberOfChannels,
      bitrate: 128_000 // 128 kbps
    });
  }

  public async renderAndEncode(project: Project, assets: Asset[]) {
    console.log('[AudioMuxerService] Starting Offline Audio Render...');
    ErrorReportingService.logExportEvent(0, 'INFO', 'Starting Offline Audio Render');
    
    // 1. Calculate Duration
    const activeTracks = project.tracks.filter(t => t.isVisible && !t.isMuted);
    const duration = Math.max(...activeTracks.flatMap(t => t.clips.map(c => c.startTime + c.duration)), 1);
    
    ErrorReportingService.logExportEvent(0, 'INFO', 'Audio duration calculated', { duration });

    // 2. Create Offline Context
    const offlineCtx = new OfflineAudioContext(
      this.numberOfChannels,
      Math.ceil(duration * this.sampleRate),
      this.sampleRate
    );

    // 3. Schedule Audio Clips
    const audioTracks = project.tracks.filter(t => (t.type === 'audio' || t.type === 'video') && !t.isMuted);
    
    for (const track of audioTracks) {
      for (const clip of track.clips) {
        if (clip.isSilent) continue;
        const asset = assets.find(a => a.id === clip.assetId);
        if (!asset || (asset.type !== 'AUDIO' && asset.type !== 'VIDEO')) continue;

        try {
          let audioBuffer = this.audioBufferCache.get(asset.id);
          
          if (!audioBuffer) {
            ErrorReportingService.logExportEvent(0, 'INFO', 'Fetching and decoding audio asset', { assetId: asset.id, url: asset.url });
            const response = await fetch(asset.url);
            if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
            this.audioBufferCache.set(asset.id, audioBuffer);
          }

          const source = offlineCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineCtx.destination);
          
          source.start(clip.startTime, clip.offset, clip.duration);
          ErrorReportingService.logExportEvent(0, 'INFO', 'Scheduled audio clip', { clipId: clip.id });
        } catch (e) {
          console.warn(`[AudioMuxerService] Failed to load audio clip ${clip.id}`, e);
          ErrorReportingService.logExportEvent(0, 'ERROR', 'Failed to load audio clip', { clipId: clip.id, error: String(e) });
        }
      }
    }

    // 4. Render
    ErrorReportingService.logExportEvent(0, 'INFO', 'Starting offlineCtx.startRendering()');
    const renderedBuffer = await offlineCtx.startRendering();
    
    if (!renderedBuffer || typeof renderedBuffer.getChannelData !== 'function') {
        throw new Error('[AudioMuxerService] renderedBuffer is not a valid AudioBuffer');
    }

    console.log('[AudioMuxerService] Audio Render Complete. Encoding...');
    ErrorReportingService.logExportEvent(0, 'INFO', 'Audio Render Complete. Starting encoding loop.');

    // 5. Encode
    // WebCodecs AudioEncoder expects AudioData.
    // We need to convert AudioBuffer (planar) to AudioData (interleaved usually for AAC, but AudioData handles format).
    // AudioData init takes: { format, sampleRate, numberOfFrames, numberOfChannels, timestamp, data }
    
    // We process in chunks (e.g., 1 second or less) to avoid huge allocations
    const chunkDuration = 1; // seconds
    const framesPerChunk = this.sampleRate * chunkDuration;
    
    for (let frame = 0; frame < renderedBuffer.length; frame += framesPerChunk) {
        const length = Math.min(framesPerChunk, renderedBuffer.length - frame);
        const timestamp = (frame / this.sampleRate) * 1_000_000; // microseconds
        
        // Interleave data for AudioData
        const data = new Float32Array(length * this.numberOfChannels);
        for (let i = 0; i < length; i++) {
            for (let ch = 0; ch < this.numberOfChannels; ch++) {
                // Planar to Interleaved: L R L R...
                data[i * this.numberOfChannels + ch] = renderedBuffer.getChannelData(ch)[frame + i];
            }
        }

        try {
            const audioData = new AudioData({
                format: 'f32',
                sampleRate: this.sampleRate,
                numberOfFrames: length,
                numberOfChannels: this.numberOfChannels,
                timestamp: timestamp,
                data: data
            });

            this.encoder.encode(audioData);
            audioData.close();
        } catch (e) {
            console.error('[AudioMuxerService] Error encoding audio chunk:', e);
            ErrorReportingService.logExportEvent(timestamp / 1_000_000, 'ERROR', 'Error encoding audio chunk', { error: String(e) });
        }
    }

    await this.encoder.flush();
    console.log('[AudioMuxerService] Audio Encoding Complete.');
    ErrorReportingService.logExportEvent(0, 'INFO', 'Audio Encoding Complete');
  }
}
