# Export Architecture Plan (mp4-muxer & WebCodecs)

This document serves as the architectural roadmap for the new export engine.
Goal: Produce high-quality, frame-perfect MP4 files using GPU acceleration and offline rendering.

## 1. ExportController.ts (The Manager)
**Role:** Orchestrates the entire export process.
**Responsibilities:**
- Initializes `VideoMuxerService` and `AudioMuxerService`.
- Preloads assets (creates HTMLVideoElements, loads AudioBuffers).
- Manages the Main Loop:
  1. Calculates current time `t`.
  2. Syncs video elements to `t` (waits for `seeked` event).
  3. Calls `SceneRenderer.drawFrame(t)`.
  4. Creates a `VideoFrame` from canvas.
  5. Sends frame to `VideoMuxerService`.
  6. Advances `t` by `1/FPS`.
- Handles Audio rendering via `OfflineAudioContext` and sends to `AudioMuxerService`.
- Finalizes the file and returns the Blob.

## 2. VideoMuxerService.ts (The Encoder)
**Role:** Wraps `VideoEncoder` and `mp4-muxer`.
**Responsibilities:**
- Configures the encoder (H.264/AVC, Bitrate, Dimensions).
- Configures the Muxer (MP4 container).
- Accepts `VideoFrame` objects, encodes them, and chunks them to the Muxer.
- Handles `flush` and finalization.

## 3. AudioMuxerService.ts (The Sound Engineer)
**Role:** Renders and Encodes Audio.
**Responsibilities:**
- Uses `OfflineAudioContext` to render the entire project audio timeline in one go (fast).
- Encodes the resulting `AudioBuffer` to AAC (using `AudioEncoder` if available, or a polyfill/library if needed, but `mp4-muxer` usually expects raw PCM or encoded chunks. *Correction*: WebCodecs `AudioEncoder` is the standard way).
- Sends encoded audio chunks to `mp4-muxer`.

## 4. SceneRenderer.ts (The Artist)
**Role:** Draws a single frame to the canvas.
**Responsibilities:**
- Stateless (mostly) rendering logic.
- `drawFrame(ctx, project, assets, videoElements, time)`:
  1. Clears canvas (Background color).
  2. Identifies active video/image clips for time `t`.
  3. Draws them (handling transforms/scaling if we add that later).
  4. Calls `GFX_Engine.render` for overlays.
  5. Draws Subtitles (with word wrap and styling).
