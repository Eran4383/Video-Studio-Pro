
export interface SystemStats {
  fps: number;
  memoryUsed: number; // MB
  memoryLimit: number; // MB
  domNodes: number;
  activeAudioElements: number;
  canvasResolution: string;
}

export class DiagnosticsService {
  private static instance: DiagnosticsService;
  private frameCount = 0;
  private lastTime = 0;
  private currentFps = 0;
  private isMonitoring = false;

  private constructor() {}

  public static getInstance(): DiagnosticsService {
    if (!DiagnosticsService.instance) {
      DiagnosticsService.instance = new DiagnosticsService();
    }
    return DiagnosticsService.instance;
  }

  public startMonitoring() {
    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.loop();
  }

  public stopMonitoring() {
    this.isMonitoring = false;
  }

  private loop = () => {
    if (!this.isMonitoring) return;
    
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;
    }
    
    requestAnimationFrame(this.loop);
  }

  public getStats(): SystemStats {
    const mem = (performance as any).memory;
    return {
      fps: this.currentFps,
      memoryUsed: mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : 0,
      memoryLimit: mem ? Math.round(mem.jsHeapSizeLimit / 1024 / 1024) : 0,
      domNodes: document.getElementsByTagName('*').length,
      activeAudioElements: document.querySelectorAll('audio').length + document.querySelectorAll('video').length,
      canvasResolution: '1920x1080' // Fixed for now, could be dynamic
    };
  }

  public async runBenchmark(durationMs: number = 3000): Promise<{ avgFps: number, minFps: number, maxFps: number }> {
    return new Promise((resolve) => {
      const fpsSamples: number[] = [];
      const start = performance.now();
      
      const sample = () => {
        if (performance.now() - start > durationMs) {
          const avg = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
          resolve({
            avgFps: Math.round(avg),
            minFps: Math.min(...fpsSamples),
            maxFps: Math.max(...fpsSamples)
          });
          return;
        }
        fpsSamples.push(this.currentFps);
        setTimeout(sample, 100);
      };
      
      sample();
    });
  }
}
