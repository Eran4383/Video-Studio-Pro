import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { Project, Asset } from '../../types';

export class AudioMuxerService {
  private muxer: Muxer<ArrayBufferTarget>;
  private encoder: AudioEncoder;
  private sampleRate: number = 44100; // Standard AAC sample rate
  private numberOfChannels: number = 2; // Stereo

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
    
    // 1. Calculate Duration
    // Include subtitles in duration calculation just in case, but audio usually drives length
    const activeTracks = project.tracks.filter(t => t.isVisible && !t.isMuted);
    const duration = Math.max(...activeTracks.flatMap(t => t.clips.map(c => c.startTime + c.duration)), 1);
    
    // 2. Create Offline Context
    const offlineCtx = new OfflineAudioContext(
      this.numberOfChannels,
      duration * this.sampleRate,
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
          // Fetch and decode audio data
          // Note: In a real app, we might cache decoded buffers. Here we fetch/decode.
          const response = await fetch(asset.url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

          const source = offlineCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineCtx.destination);
          
          // Handle offset (start point in asset) and startTime (position on timeline)
          // start(when, offset, duration)
          source.start(clip.startTime, clip.offset, clip.duration);
        } catch (e) {
          console.warn(`[AudioMuxerService] Failed to load audio clip ${clip.id}`, e);
        }
      }
    }

    // 4. Render
    const renderedBuffer = await offlineCtx.startRendering();
    console.log('[AudioMuxerService] Audio Render Complete. Encoding...');

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

        const audioData = new AudioData({
            format: 'f32', // 32-bit float planar/interleaved? WebCodecs usually handles f32-planar if specified, but AAC encoder might want s16. 
            // Actually, AudioData handles the format. 'f32' is standard for Web Audio.
            sampleRate: this.sampleRate,
            numberOfFrames: length,
            numberOfChannels: this.numberOfChannels,
            timestamp: timestamp,
            data: data
        });

        this.encoder.encode(audioData);
        audioData.close();
    }

    await this.encoder.flush();
    console.log('[AudioMuxerService] Audio Encoding Complete.');
  }
}
