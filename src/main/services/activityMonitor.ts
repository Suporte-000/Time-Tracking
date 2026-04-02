import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * ActivityMonitor - Detects user inactivity
 * Uses system idle time to determine if user is active
 *
 * On Windows, this uses PowerShell to check idle time.
 * In production, this would use keyboard/mouse hooks via native Win32 API
 * for zero CPU overhead (no polling).
 *
 * The native implementation would use:
 * - SetWindowsHookEx for keyboard hooks
 * - SetWindowsHookEx for mouse hooks
 * - GetLastInputInfo for idle time
 */
export class ActivityMonitor extends EventEmitter {
  private intervalId: NodeJS.Timeout | null = null;
  private checkInterval: number = 5000; // Check every 5 seconds
  private inactivityThreshold: number = 5 * 60 * 1000; // 5 minutes default
  private isUserInactive: boolean = false;
  private lastActivityTime: number = Date.now();

  constructor(inactivityThreshold?: number) {
    super();
    if (inactivityThreshold) {
      this.inactivityThreshold = inactivityThreshold;
    }
  }

  /**
   * Start monitoring user activity
   */
  start() {
    if (this.intervalId) {
      console.warn('ActivityMonitor already started');
      return;
    }

    console.log('Starting ActivityMonitor...');
    this.lastActivityTime = Date.now();

    this.intervalId = setInterval(() => {
      this.checkActivity();
    }, this.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('ActivityMonitor stopped');
    }
  }

  /**
   * Update inactivity threshold
   */
  setInactivityThreshold(minutes: number) {
    this.inactivityThreshold = minutes * 60 * 1000;
  }

  /**
   * Check user activity via system idle time
   */
  private async checkActivity() {
    try {
      const idleTime = await this.getSystemIdleTime();

      if (idleTime !== null) {
        const now = Date.now();
        const timeSinceLastActivity = now - this.lastActivityTime + idleTime;

        if (timeSinceLastActivity >= this.inactivityThreshold) {
          // User is inactive
          if (!this.isUserInactive) {
            this.isUserInactive = true;
            this.emit('user-inactive', {
              idleTime,
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          // User is active
          if (this.isUserInactive) {
            this.isUserInactive = false;
            this.lastActivityTime = now;
            this.emit('user-active', {
              timestamp: new Date().toISOString(),
            });
          } else {
            // Update last activity time
            this.lastActivityTime = now;
          }
        }
      }
    } catch (error) {
      // Silently ignore errors
    }
  }

  /**
   * Get system idle time in milliseconds
   * Returns null if unable to determine
   */
  private async getSystemIdleTime(): Promise<number | null> {
    try {
      if (process.platform === 'win32') {
        // Windows: Use PowerShell to get idle time
        const command = `powershell -Command "Add-Type @'
using System;
using System.Runtime.InteropServices;
public class IdleTime {
    [DllImport(\\"user32.dll\\")]
    public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
    public struct LASTINPUTINFO {
        public uint cbSize;
        public uint dwTime;
    }
    public static uint GetIdleTime() {
        LASTINPUTINFO lastInputInfo = new LASTINPUTINFO();
        lastInputInfo.cbSize = (uint)Marshal.SizeOf(lastInputInfo);
        GetLastInputInfo(ref lastInputInfo);
        return ((uint)Environment.TickCount - lastInputInfo.dwTime);
    }
}
'@; [IdleTime]::GetIdleTime()"`;

        const { stdout } = await execAsync(command, {
          timeout: 5000,
          windowsHide: true,
        });

        const idleTimeMs = parseInt(stdout.trim(), 10);
        return isNaN(idleTimeMs) ? null : idleTimeMs;
      } else {
        // For non-Windows platforms (development on Linux/Mac)
        // Return 0 (always active) for testing
        return 0;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current idle time on demand
   */
  async getCurrentIdleTime(): Promise<number> {
    const idleTime = await this.getSystemIdleTime();
    return idleTime || 0;
  }
}
