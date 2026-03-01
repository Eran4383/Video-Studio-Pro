
import { Project, Asset } from '../types';

export class ErrorReportingService {
  private static logs: string[] = [];
  private static originalConsoleLog = console.log;
  private static originalConsoleError = console.error;

  static init() {
    console.log = (...args) => {
      this.logs.push(`[LOG] ${new Date().toISOString()}: ${args.join(' ')}`);
      this.originalConsoleLog.apply(console, args);
    };
    console.error = (...args) => {
      this.logs.push(`[ERROR] ${new Date().toISOString()}: ${args.join(' ')}`);
      this.originalConsoleError.apply(console, args);
    };
    
    window.addEventListener('unhandledrejection', (event) => {
      this.logs.push(`[PROMISE_ERROR] ${event.reason}`);
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
        tracksCount: project.tracks.length,
        clipsCount: project.tracks.reduce((acc, t) => acc + t.clips.length, 0),
        duration: Math.max(...project.tracks.flatMap(t => t.clips.map(c => c.startTime + c.duration)), 0),
      },
      assets: assets.map(a => ({ name: a.name, type: a.type, duration: a.duration })),
      logs: this.logs.slice(-100), // Last 100 entries
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
