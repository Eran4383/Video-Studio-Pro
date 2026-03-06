
import { Project, Asset } from '../types';

export class ErrorReportingService {
  private static logs: { type: string, message: string, time: string }[] = [];
  private static originalConsoleError = console.error;
  private static originalConsoleWarn = console.warn;

  static init() {
    console.error = (...args) => {
      const message = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');
      this.logs.push({ type: 'ERROR', message, time: new Date().toISOString() });
      if (this.logs.length > 100) this.logs.shift();
      this.originalConsoleError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');
      this.logs.push({ type: 'WARN', message, time: new Date().toISOString() });
      if (this.logs.length > 100) this.logs.shift();
      this.originalConsoleWarn.apply(console, args);
    };
    
    window.addEventListener('unhandledrejection', (event) => {
      this.logs.push({ type: 'PROMISE_ERROR', message: String(event.reason), time: new Date().toISOString() });
      if (this.logs.length > 100) this.logs.shift();
    });
  }

  static generateFullReport(project: Project, assets: Asset[]) {
    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      hardware: {
        concurrency: navigator.hardwareConcurrency,
        memory: (navigator as any).deviceMemory || 'unknown',
      },
      project: {
        name: project.name,
        resolution: project.resolution,
        tracksCount: project.tracks.length,
        clipsCount: project.tracks.reduce((acc, t) => acc + t.clips.length, 0),
        duration: Math.max(...project.tracks.flatMap(t => t.clips.map(c => c.startTime + c.duration)), 0),
      },
      assets: assets.map(a => ({ name: a.name, type: a.type, duration: a.duration, width: a.width, height: a.height })),
      logs: this.logs,
    };

    const reportStr = JSON.stringify(report, null, 2);
    const blob = new Blob([reportStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus_error_report_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return reportStr;
  }
}
