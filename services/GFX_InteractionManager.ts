import { GFXLayer } from './GFX_Engine';

type InteractionMode = 'MOVE' | 'SCALE' | 'ROTATE' | 'IDLE';

export class GFX_InteractionManager {
  private active: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private initialLayer: GFXLayer | null = null;
  private mode: InteractionMode = 'IDLE';

  onMouseDown(x: number, y: number, layer: GFXLayer): InteractionMode {
    // Simple hit testing for MOVE operation (inside bounding box)
    // Future expansion: Add specific checks for corner handles (SCALE) and rotation handle
    
    const halfW = (layer.width * layer.scale) / 2;
    const halfH = (layer.height * layer.scale) / 2;

    // Check if click is inside the transformed bounding box (simplified axis-aligned check for now)
    // For robust rotated hit-test, we would transform the mouse point into local layer space.
    if (x >= layer.x - halfW && x <= layer.x + halfW && y >= layer.y - halfH && y <= layer.y + halfH) {
      this.active = true;
      this.startX = x;
      this.startY = y;
      this.initialLayer = { ...layer };
      this.mode = 'MOVE';
      return 'MOVE';
    }

    return 'IDLE';
  }

  onMouseMove(x: number, y: number, currentLayer: GFXLayer): boolean {
    if (!this.active || !this.initialLayer) return false;

    if (this.mode === 'MOVE') {
      const dx = x - this.startX;
      const dy = y - this.startY;
      
      currentLayer.x = this.initialLayer.x + dx;
      currentLayer.y = this.initialLayer.y + dy;
      return true; // Indicates layer was updated
    }

    return false;
  }

  onMouseUp() {
    this.active = false;
    this.mode = 'IDLE';
    this.initialLayer = null;
  }
}