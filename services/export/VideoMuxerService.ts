import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export class VideoMuxerService {
  private encoder: VideoEncoder;
  private muxer: Muxer<ArrayBufferTarget>;
  private width: number;
  private height: number;
  private fps: number;
  private frameCount: number = 0;

  constructor(
    muxer: Muxer<ArrayBufferTarget>,
    width: number,
    height: number,
    fps: number,
    bitrate: number = 4_000_000 // 4 Mbps default
  ) {
    this.muxer = muxer;
    // Ensure dimensions are even (required for H.264 4:2:0)
    const safeWidth = Math.floor(width / 2) * 2;
    const safeHeight = Math.floor(height / 2) * 2;

    this.width = safeWidth;
    this.height = safeHeight;
    this.fps = fps;

    // Configure VideoEncoder
    this.encoder = new VideoEncoder({
      output: (chunk, meta) => {
        this.muxer.addVideoChunk(chunk, meta);
      },
      error: (e) => {
        console.error('[VideoMuxerService] Encoder Error:', e);
      }
    });

    this.encoder.configure({
      // avc1.64002a = High Profile (64), Level 4.2 (2a)
      // Supports up to 1080p60 and 4K30
      codec: 'avc1.64002a', 
      width: this.width,
      height: this.height,
      bitrate: bitrate,
      framerate: this.fps,
      latencyMode: 'quality'
    });
  }

  public async encodeFrame(frame: VideoFrame) {
    if (this.encoder.state === 'closed') {
        console.warn('[VideoMuxerService] Attempted to encode frame on closed encoder');
        return;
    }

    // Throttle encoding if the queue is getting too large to prevent dropped frames
    while (this.encoder.encodeQueueSize > 5) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Calculate timestamp based on frame count (deterministic)
    // timestamp is in microseconds
    const timestamp = (this.frameCount * 1_000_000) / this.fps;
    const duration = 1_000_000 / this.fps;

    // Ensure the frame has the correct timestamp if not already set
    const videoFrame = new VideoFrame(frame, { 
      timestamp: timestamp,
      duration: duration,
      // We might need to crop if the source frame doesn't match the even dimensions
      visibleRect: { x: 0, y: 0, width: this.width, height: this.height }
    });

    // Keyframe every 2 seconds (2 * fps)
    const keyFrame = this.frameCount % (this.fps * 2) === 0;
    
    try {
        this.encoder.encode(videoFrame, { keyFrame });
    } catch (e) {
        console.error('[VideoMuxerService] Encoding failed:', e);
    }
    
    videoFrame.close(); 
    this.frameCount++;
  }

  public async flush() {
    if (this.encoder.state === 'closed') return;
    await this.encoder.flush();
  }
}
