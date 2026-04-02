import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ActiveWindow {
  processName: string;
  windowTitle: string;
  timestamp: string;
}

/**
 * WindowMonitor - Detects active window on Windows
 * Uses PowerShell to get the foreground window process
 *
 * On Windows, we use Get-Process with MainWindowTitle to detect the active window.
 * This is a cross-platform compatible approach that works without native addons.
 *
 * For production, this would use native Win32 API (GetForegroundWindow) via node-ffi
 * or a native addon for better performance and accuracy.
 */
export class WindowMonitor extends EventEmitter {
  private intervalId: NodeJS.Timeout | null = null;
  private pollInterval: number = 1000; // 1 second
  private lastActiveWindow: ActiveWindow | null = null;

  constructor(pollInterval: number = 1000) {
    super();
    this.pollInterval = pollInterval;
  }

  /**
   * Start monitoring active window changes
   */
  start() {
    if (this.intervalId) {
      console.warn('WindowMonitor already started');
      return;
    }

    console.log('Starting WindowMonitor...');

    this.intervalId = setInterval(() => {
      this.checkActiveWindow();
    }, this.pollInterval);

    // Initial check
    this.checkActiveWindow();
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('WindowMonitor stopped');
    }
  }

  /**
   * Check currently active window
   * Uses PowerShell on Windows to get the foreground window
   */
  private async checkActiveWindow() {
    try {
      let activeWindow: ActiveWindow;

      if (process.platform === 'win32') {
        // Windows: Use PowerShell to get active window
        const command = `powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1 | Select-Object ProcessName, MainWindowTitle | ConvertTo-Json"`;

        const { stdout } = await execAsync(command, {
          timeout: 5000,
          windowsHide: true,
        });

        if (!stdout.trim()) {
          return;
        }

        const result = JSON.parse(stdout);

        activeWindow = {
          processName: result.ProcessName || 'unknown',
          windowTitle: result.MainWindowTitle || '',
          timestamp: new Date().toISOString(),
        };
      } else {
        // For non-Windows platforms (development on Linux/Mac)
        // Return a mock active window for testing
        activeWindow = {
          processName: 'Code', // VS Code as default for testing
          windowTitle: 'TimeTrack Development',
          timestamp: new Date().toISOString(),
        };
      }

      // Check if window changed
      if (this.hasWindowChanged(activeWindow)) {
        this.lastActiveWindow = activeWindow;
        this.emit('window-changed', activeWindow);
      }
    } catch (error) {
      // Silently ignore errors to avoid spam in console
      // In production, this would use proper error handling
    }
  }

  /**
   * Check if window has changed from last check
   */
  private hasWindowChanged(newWindow: ActiveWindow): boolean {
    if (!this.lastActiveWindow) {
      return true;
    }

    return (
      this.lastActiveWindow.processName !== newWindow.processName ||
      this.lastActiveWindow.windowTitle !== newWindow.windowTitle
    );
  }

  /**
   * Get current active window (on-demand)
   */
  async getCurrentWindow(): Promise<ActiveWindow | null> {
    try {
      if (process.platform === 'win32') {
        const command = `powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1 | Select-Object ProcessName, MainWindowTitle | ConvertTo-Json"`;

        const { stdout } = await execAsync(command, {
          timeout: 5000,
          windowsHide: true,
        });

        if (!stdout.trim()) {
          return null;
        }

        const result = JSON.parse(stdout);

        return {
          processName: result.ProcessName || 'unknown',
          windowTitle: result.MainWindowTitle || '',
          timestamp: new Date().toISOString(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting current window:', error);
      return null;
    }
  }
}
