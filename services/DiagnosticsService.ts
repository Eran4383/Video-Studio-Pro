
export interface SystemStats {
  fps: number;
  memoryUsed: number; // MB
  memoryLimit: number; // MB
  domNodes: number;
  activeAudioElements: number;
  canvasResolution: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  details?: any;
}

export class DiagnosticsService {
  private static instance: DiagnosticsService;
  private logs: LogEntry[] = [];
  private frameCount = 0;
  private lastTime = 0;
  private currentFps = 0;
  private isMonitoring = false;

  private constructor() {
    // Capture global errors
    window.addEventListener('error', (event) => {
      this.log('error', 'Global', event.message, { filename: event.filename, lineno: event.lineno, colno: event.colno, error: event.error });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.log('error', 'Global', 'Unhandled Promise Rejection', { reason: event.reason });
    });
  }

  public static getInstance(): DiagnosticsService {
    if (!DiagnosticsService.instance) {
      DiagnosticsService.instance = new DiagnosticsService();
    }
    return DiagnosticsService.instance;
  }

  public log(level: 'info' | 'warn' | 'error' | 'debug', category: string, message: string, details?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      level,
      category,
      message,
      details
    };
    
    this.logs.unshift(entry); // Add to beginning
    
    // Keep log size manageable
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }
    
    // Also log to console for dev tools visibility
    const style = level === 'error' ? 'color: red' : level === 'warn' ? 'color: orange' : 'color: cyan';
    console.log(`%c[${category}] ${message}`, style, details || '');
  }

  public getLogs(): LogEntry[] {
    return this.logs;
  }

  public clearLogs() {
    this.logs = [];
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
