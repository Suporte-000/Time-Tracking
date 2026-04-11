import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ActiveWindow {
  processName: string;
  windowTitle: string;
  timestamp: string;
}

// PowerShell script: get the process with a foreground/active window.
// Uses MainWindowHandle != 0 + CPU sort as a proxy for the active window.
// No Add-Type / C# compilation — runs fast.
const PS_ACTIVE_WINDOW_SCRIPT = `$p = Get-Process | Where-Object {$_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne ''} | Sort-Object CPU -Descending | Select-Object -First 1; if ($p) { "$($p.ProcessName)|$($p.MainWindowTitle)" }`;
const PS_ACTIVE_WINDOW_ENCODED = Buffer.from(PS_ACTIVE_WINDOW_SCRIPT, 'utf16le').toString('base64');

export class WindowMonitor extends EventEmitter {
  private intervalId: NodeJS.Timeout | null = null;
  private pollInterval: number = 1000;
  private lastActiveWindow: ActiveWindow | null = null;

  constructor(pollInterval: number = 1000) {
    super();
    this.pollInterval = pollInterval;
  }

  start() {
    if (this.intervalId) return;
    console.log('WindowMonitor started (GetForegroundWindow)');
    this.intervalId = setInterval(() => this.checkActiveWindow(), this.pollInterval);
    this.checkActiveWindow();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkActiveWindow() {
    try {
      const activeWindow = await this.getActiveWindow();
      if (!activeWindow) return;

      if (this.hasWindowChanged(activeWindow)) {
        this.lastActiveWindow = activeWindow;
        this.emit('window-changed', activeWindow);
      }
    } catch {
      // Silently ignore transient errors
    }
  }

  private async getActiveWindow(): Promise<ActiveWindow | null> {
    if (process.platform !== 'win32') {
      return {
        processName: 'Code',
        windowTitle: 'TimeTrack Development',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -NonInteractive -EncodedCommand ${PS_ACTIVE_WINDOW_ENCODED}`,
        { timeout: 4000, windowsHide: true }
      );
      const line = stdout.trim();
      if (!line) return null;
      const idx = line.indexOf('|');
      if (idx < 0) return null;
      return {
        processName: line.substring(0, idx).trim(),
        windowTitle: line.substring(idx + 1).trim(),
        timestamp: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private hasWindowChanged(w: ActiveWindow): boolean {
    if (!this.lastActiveWindow) return true;
    return (
      this.lastActiveWindow.processName !== w.processName ||
      this.lastActiveWindow.windowTitle !== w.windowTitle
    );
  }

  async getCurrentWindow(): Promise<ActiveWindow | null> {
    return this.getActiveWindow();
  }
}
