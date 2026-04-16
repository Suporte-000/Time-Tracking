import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface ActiveWindow {
  processName: string;
  windowTitle: string;
  timestamp: string;
}

// Resolve path to fg-window.exe (bundled in app resources)
function getFgWindowExePath(): string {
  // In packaged app: process.resourcesPath/fg-window.exe
  // In development: src/helpers/fg-window.exe
  if (process.resourcesPath) {
    const packed = path.join(process.resourcesPath, 'fg-window.exe');
    if (fs.existsSync(packed)) return packed;
  }
  return path.join(__dirname, '../../src/helpers/fg-window.exe');
}

export class WindowMonitor extends EventEmitter {
  private intervalId: NodeJS.Timeout | null = null;
  private pollInterval: number = 2000;
  private lastActiveWindow: ActiveWindow | null = null;
  private _pending = false;
  private _exePath: string | null = null;

  constructor(pollInterval: number = 2000) {
    super();
    this.pollInterval = pollInterval;
  }

  start() {
    if (this.intervalId) return;
    this._exePath = getFgWindowExePath();
    const exists = fs.existsSync(this._exePath);
    console.log(`WindowMonitor started. fg-window.exe: ${this._exePath} (exists: ${exists})`);
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
    if (this._pending) return;
    this._pending = true;
    try {
      const activeWindow = await this.getActiveWindow();
      if (!activeWindow) return;
      if (this.hasWindowChanged(activeWindow)) {
        this.lastActiveWindow = activeWindow;
        this.emit('window-changed', activeWindow);
      }
    } catch {
      // Silently ignore transient errors
    } finally {
      this._pending = false;
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

    // Use fg-window.exe if available
    if (this._exePath && fs.existsSync(this._exePath)) {
      try {
        const { stdout } = await execAsync(
          `"${this._exePath}"`,
          { timeout: 3000, windowsHide: true }
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

    // Fallback: PowerShell with GetForegroundWindow P/Invoke
    const PS_SCRIPT = `$sig='[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr h, out int pid);'; Add-Type -MemberDefinition $sig -Name W -Namespace FG -EA Stop; $h=[FG.W]::GetForegroundWindow(); $p=0; [FG.W]::GetWindowThreadProcessId($h,[ref]$p)|Out-Null; $pr=Get-Process -Id $p -EA SilentlyContinue; if($pr){"$($pr.ProcessName)|$($pr.MainWindowTitle)"}`;
    const encoded = Buffer.from(PS_SCRIPT, 'utf16le').toString('base64');
    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}`,
        { timeout: 5000, windowsHide: true }
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
