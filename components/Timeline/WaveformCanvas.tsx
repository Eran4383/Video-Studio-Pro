
import React, { useRef, useEffect } from 'react';
import { waveformAnalyzer } from '../../utils/WaveformAnalyzer';

interface WaveformCanvasProps {
  assetId: string;
  buffer: AudioBuffer;
  clipOffset: number;
  clipDuration: number;
  pxPerSec: number;
  fps: number;
  color?: string;
  isExpanded?: boolean;
  waveformStyle?: 'solid' | 'lines';
  waveformScale?: number;
}

/**
 * WaveformCanvas renders a frame-accurate audio waveform using HTML5 Canvas.
 * Optimized for high-performance timeline scrubbing and zooming.
 * Replaces the old SVG-based Waveform for professional-grade precision.
 */
export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  assetId, buffer, clipOffset, clipDuration, pxPerSec, fps, 
  color = '#6366f1', isExpanded = false, waveformStyle = 'solid', waveformScale = 1.0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Calculate dimensions based on zoom level
  const width = Math.ceil(clipDuration * pxPerSec);
  const height = isExpanded ? 100 : 60;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Handle High DPI displays for professional crispness (Retina support)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Analysis resolution: 1 sample per pixel for maximum accuracy.
    // We round the resolution to stabilize the cache and prevent flickering during zoom.
    const resolution = Math.max(fps, Math.round(pxPerSec));
    const data = waveformAnalyzer.getWaveformData(assetId, buffer, resolution);
    
    const startIdx = Math.floor(clipOffset * resolution);
    const midY = height / 2;
    const gain = (isExpanded ? 0.95 : 0.8) * waveformScale;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw Waveform Peaks
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    // Optimization: Browser canvas rendering is fast, but we only iterate over the width
    const step = waveformStyle === 'lines' ? 3 : 1;
    for (let x = 0; x < width; x += step) {
      const timeAtX = x / pxPerSec;
      const sampleIdx = startIdx + Math.floor(timeAtX * resolution);
      
      if (sampleIdx * 2 >= data.peaks.length) break;

      const min = data.peaks[sampleIdx * 2];
      const max = data.peaks[sampleIdx * 2 + 1];
      const rms = data.rms[sampleIdx];

      // Premium look: Color intensity based on RMS energy (audio intensity)
      // This helps visualize the "meat" of the audio vs just the peaks.
      const alpha = Math.min(1, 0.35 + rms * 1.8);
      ctx.globalAlpha = alpha;

      const yMin = midY + (min * midY * gain);
      const yMax = midY + (max * midY * gain);

      // Draw vertical line for this pixel column
      if (waveformStyle === 'lines') {
        const segmentHeight = 2;
        const gap = 1;
        const totalHeight = Math.abs(yMax - yMin);
        const segments = Math.floor(totalHeight / (segmentHeight + gap));
        
        for (let s = 0; s < segments; s++) {
          const sy = yMin + s * (segmentHeight + gap);
          const amplitude = Math.abs((sy - midY) / midY);
          
          let segColor = '#10b981'; // Green
          if (amplitude > 0.8) segColor = '#ef4444'; // Red
          else if (amplitude > 0.5) segColor = '#f59e0b'; // Yellow/Orange
          
          ctx.fillStyle = segColor;
          ctx.fillRect(x + 0.5, sy, 2, segmentHeight);
        }
      } else {
        ctx.lineCap = 'butt';
        ctx.lineWidth = 1;
        ctx.moveTo(x + 0.5, yMin);
        ctx.lineTo(x + 0.5, yMax);
      }
    }
    if (waveformStyle !== 'lines') ctx.stroke();
    ctx.globalAlpha = 1;

    // Frame-Accurate Grid (Visible when zoomed in for surgical editing)
    if (pxPerSec > 150) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      const frameWidth = pxPerSec / fps;
      for (let f = 0; f < width; f += frameWidth) {
        ctx.moveTo(f, 0);
        ctx.lineTo(f, height);
      }
      ctx.stroke();
    }
  }, [assetId, buffer, clipOffset, clipDuration, pxPerSec, fps, color, isExpanded, width, height, waveformStyle, waveformScale]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <canvas 
        ref={canvasRef} 
        style={{ width, height, display: 'block' }}
        className="opacity-90"
      />
    </div>
  );
};
