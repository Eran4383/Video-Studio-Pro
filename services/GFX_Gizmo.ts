import { GFXLayer } from './GFX_Engine';

export class GFX_Gizmo {
  static draw(ctx: CanvasRenderingContext2D, layer: GFXLayer) {
    ctx.save();
    
    // Apply transformations
    ctx.translate(layer.x, layer.y);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.scale(layer.scale, layer.scale);

    const w = layer.width;
    const h = layer.height;

    // Draw bounding box
    ctx.strokeStyle = '#6366f1'; // Indigo-500
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.stroke();

    // Draw corner handles
    const handleSize = 8 / layer.scale; // Keep handles constant visual size
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1;

    const corners = [
      { x: -w / 2, y: -h / 2 }, // Top-Left
      { x: w / 2, y: -h / 2 },  // Top-Right
      { x: w / 2, y: h / 2 },   // Bottom-Right
      { x: -w / 2, y: h / 2 },  // Bottom-Left
    ];

    corners.forEach(c => {
      ctx.beginPath();
      ctx.rect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
      ctx.fill();
      ctx.stroke();
    });

    // Center pivot
    ctx.beginPath();
    ctx.arc(0, 0, 4 / layer.scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}