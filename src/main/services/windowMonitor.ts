import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ActiveWindow {
  processName: string;
  windowTitle: string;
  timestamp: string;
}

// Uses UIAutomationClient (.NET built-in DLL, no C# compilation) to get the
// ACTUAL focused window via FocusedElement — no CPU heuristic, no window stealing.
// -ExecutionPolicy Bypass overrides Restricted policy for this single call.
const PS_FOCUSED_SCRIPT = `
[void][System.Reflection.Assembly]::LoadWithPartialName('UIAutomationClient')
try {
  $el = [System.Windows.Automation.AutomationElement]::FocusedElement
  if ($el) {
    $pid = $el.GetCurrentPropertyValue([System.Windows.Automation.AutomationElement]::ProcessIdProperty)
    $p = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if ($p) { "$($p.ProcessName)|$($p.MainWindowTitle)" }
  }
} catch {}
`.trim();

const PS_FOCUSED_ENCODED = Buffer.from(PS_FOCUSED_SCRIPT, 'utf16le').toString('base64');

export class WindowMonitor extends EventEmitter {
  private intervalId: NodeJS.Timeout | null = null;
  private pollInterval: number = 1000;
  private lastActiveWindow: ActiveWindow | null = null;
  private _pending = false;

  constructor(pollInterval: number = 1000) {
    super();
    this.pollInterval = pollInterval;
  }

  start() {
    if (this.intervalId) return;
    console.log('WindowMonitor started (UIAutomation FocusedElement)');
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
    if (this._pending) return; // skip if previous poll still running
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

    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${PS_FOCUSED_ENCODED}`,
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
