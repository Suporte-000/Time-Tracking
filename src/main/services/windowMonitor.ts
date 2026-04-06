import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ActiveWindow {
  processName: string;
  windowTitle: string;
  timestamp: string;
}

// PowerShell script using Win32 GetForegroundWindow API — gets the ACTUAL focused window
const PS_GET_FOREGROUND = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WinForeground {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int pid);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder buf, int max);
}
"@
$hwnd = [WinForeground]::GetForegroundWindow()
$pid = 0
[WinForeground]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null
$sb = New-Object System.Text.StringBuilder 512
[WinForeground]::GetWindowText($hwnd, $sb, 512) | Out-Null
$proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
if ($proc) {
  [PSCustomObject]@{ ProcessName = $proc.ProcessName; WindowTitle = $sb.ToString(); PID = $pid } | ConvertTo-Json -Compress
}
`.trim();

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
      let activeWindow: ActiveWindow;

      if (process.platform === 'win32') {
        const { stdout } = await execAsync(
          `powershell -NoProfile -NonInteractive -Command "${PS_GET_FOREGROUND.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
          { timeout: 4000, windowsHide: true }
        );

        if (!stdout.trim()) return;

        const result = JSON.parse(stdout.trim());
        if (!result?.ProcessName) return;

        activeWindow = {
          processName: result.ProcessName,
          windowTitle: result.WindowTitle || '',
          timestamp: new Date().toISOString(),
        };
      } else {
        // Linux/Mac dev fallback — simulate VS Code in focus
        activeWindow = {
          processName: 'Code',
          windowTitle: 'TimeTrack Development',
          timestamp: new Date().toISOString(),
        };
      }

      if (this.hasWindowChanged(activeWindow)) {
        this.lastActiveWindow = activeWindow;
        this.emit('window-changed', activeWindow);
      }
    } catch {
      // Silently ignore — PowerShell errors are transient
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
    try {
      if (process.platform !== 'win32') return null;

      const { stdout } = await execAsync(
        `powershell -NoProfile -NonInteractive -Command "${PS_GET_FOREGROUND.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
        { timeout: 4000, windowsHide: true }
      );

      if (!stdout.trim()) return null;
      const result = JSON.parse(stdout.trim());
      if (!result?.ProcessName) return null;

      return {
        processName: result.ProcessName,
        windowTitle: result.WindowTitle || '',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }
}
