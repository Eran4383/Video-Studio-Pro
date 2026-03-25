
import React, { useRef, useEffect, useState } from 'react';
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
export const WaveformCanvas = ({
  assetId, buffer, clipOffset, clipDuration, pxPerSec, fps, 
  color = '#6366f1', isExpanded = false, waveformStyle = 'solid', waveformScale = 1.0
}: WaveformCanvasProps) => {
  const totalWidth = Math.ceil(clipDuration * pxPerSec);
  const height = isExpanded ? 100 : 60;
  const MAX_CANVAS_WIDTH = 4000; // Safe width for all browsers
  
  const numChunks = Math.ceil(totalWidth / MAX_CANVAS_WIDTH);
  const chunks = Array.from({ length: numChunks }).map((_, i) => {
    const chunkWidth = i === numChunks - 1 ? totalWidth - (i * MAX_CANVAS_WIDTH) : MAX_CANVAS_WIDTH;
    return { index: i, width: chunkWidth, offset: i * MAX_CANVAS_WIDTH };
  });

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none flex">
      {chunks.map(chunk => (
        <WaveformChunk 
          key={chunk.index}
          assetId={assetId}
          buffer={buffer}
          clipOffset={clipOffset}
          pxPerSec={pxPerSec}
          fps={fps}
          color={color}
          isExpanded={isExpanded}
          waveformStyle={waveformStyle}
          waveformScale={waveformScale}
          chunkIndex={chunk.index}
          chunkWidth={chunk.width}
          chunkOffsetPx={chunk.offset}
          height={height}
        />
      ))}
    </div>
  );
};

interface WaveformChunkProps {
  assetId: string;
  buffer: AudioBuffer;
  clipOffset: number;
  pxPerSec: number;
  fps: number;
  color: string;
  isExpanded: boolean;
  waveformStyle: 'solid' | 'lines';
  waveformScale: number;
  chunkIndex: number;
  chunkWidth: number;
  chunkOffsetPx: number;
  height: number;
  key?: React.Key;
}

const WaveformChunk = ({
  assetId, buffer, clipOffset, pxPerSec, fps, color, isExpanded, waveformStyle, waveformScale, chunkWidth, chunkOffsetPx, height
}: WaveformChunkProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      { rootMargin: '1000px 0px' } // Load a bit ahead of scrolling
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const canvas = canvasRef.current;
    if (!canvas || chunkWidth <= 0) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = chunkWidth * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const resolution = Math.max(fps, Math.round(pxPerSec));
    const data = waveformAnalyzer.getWaveformData(assetId, buffer, resolution);
    
    // Calculate the start time for this specific chunk
    const chunkStartTime = clipOffset + (chunkOffsetPx / pxPerSec);
    const startIdx = Math.floor(chunkStartTime * resolution);
    const midY = height / 2;
    const gain = (isExpanded ? 0.95 : 0.8) * waveformScale;
    
    ctx.clearRect(0, 0, chunkWidth, height);
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    const step = waveformStyle === 'lines' ? 4 : 1;
    for (let x = 0; x < chunkWidth; x += step) {
      const timeAtX = x / pxPerSec;
      const sampleIdx = startIdx + Math.floor(timeAtX * resolution);
      
      if (sampleIdx * 2 >= data.peaks.length) break;

      const min = data.peaks[sampleIdx * 2];
      const max = data.peaks[sampleIdx * 2 + 1];
      const rms = data.rms[sampleIdx];

      const alpha = Math.min(1, 0.35 + rms * 1.8);
      ctx.globalAlpha = alpha;

      const yMin = midY + (min * midY * gain);
      const yMax = midY + (max * midY * gain);

      if (waveformStyle === 'lines') {
        const segmentHeight = 2;
        const gap = 1;
        const segmentTotal = segmentHeight + gap;
        
        const amplitude = Math.max(Math.abs(min), Math.abs(max)) * gain;
        const barHeight = amplitude * (isExpanded ? height / 2 : height);
        const segments = Math.floor(barHeight / segmentTotal);
        
        const centerY = isExpanded ? midY : height;
        
        for (let s = 0; s < segments; s++) {
          let segColor = '#ef4444';
          if (s < 2) segColor = '#ef4444';
          else if (s < 6) segColor = '#4ade80';
          else if (s < 12) segColor = '#fbbf24';
          else if (s < 16) segColor = '#f97316';
          else segColor = '#ef4444';
          
          ctx.fillStyle = segColor;
          
          const syUp = centerY - (s + 1) * segmentTotal;
          ctx.fillRect(x + 0.5, syUp, 3, segmentHeight);
          
          if (isExpanded) {
            const syDown = centerY + s * segmentTotal;
            ctx.fillRect(x + 0.5, syDown, 3, segmentHeight);
          }
        }
      } else {
        ctx.lineCap = 'butt';
        ctx.lineWidth = 1;
        if (x === 0) ctx.moveTo(x + 0.5, yMin);
        else ctx.lineTo(x + 0.5, yMin);
        ctx.lineTo(x + 0.5, yMax);
      }
    }
    if (waveformStyle !== 'lines') ctx.stroke();
    ctx.globalAlpha = 1;

    if (pxPerSec > 150) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      const frameWidth = pxPerSec / fps;
      // Align grid to the global time
      const offsetRemainder = chunkOffsetPx % frameWidth;
      const startF = offsetRemainder === 0 ? 0 : frameWidth - offsetRemainder;
      
      for (let f = startF; f < chunkWidth; f += frameWidth) {
        ctx.moveTo(f, 0);
        ctx.lineTo(f, height);
      }
      ctx.stroke();
    }
  }, [assetId, buffer, clipOffset, pxPerSec, fps, color, isExpanded, chunkWidth, chunkOffsetPx, height, waveformStyle, waveformScale, isVisible]);

  return (
    <div ref={containerRef} style={{ width: chunkWidth, height }} className="shrink-0">
      {isVisible && (
        <canvas 
          ref={canvasRef} 
          style={{ width: chunkWidth, height, display: 'block' }}
          className="opacity-90"
        />
      )}
    </div>
  );
};
