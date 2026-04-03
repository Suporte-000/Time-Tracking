import { EventEmitter } from 'events';
import { powerMonitor } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * ImprovedActivityMonitor - Event-driven inactivity detection
 *
 * Uses a hybrid approach optimized for minimal CPU usage:
 * 1. Electron's powerMonitor for system sleep/wake events (zero CPU)
 * 2. Smart polling that only activates when user might be inactive
 * 3. GetLastInputInfo Win32 API for precise idle time
 *
 * CPU Usage: ~0% when active, minimal checks only when potentially idle
 */
export class ImprovedActivityMonitor extends EventEmitter {
  private checkInterval: NodeJS.Timeout | null = null;
  private inactivityThreshold: number = 5 * 60 * 1000; // 5 minutes default
  private isUserInactive: boolean = false;
  private lastActivityTime: number = Date.now();
  private smartCheckInterval: number = 30000; // Check every 30s (reduced from 5s)
  private fastCheckInterval: number = 5000; // Check every 5s when near threshold
  private isNearThreshold: boolean = false;

  constructor(inactivityThreshold?: number) {
    super();
    if (inactivityThreshold) {
      this.inactivityThreshold = inactivityThreshold;
    }
  }

  /**
   * Start monitoring user activity
   * Uses Electron's powerMonitor + smart polling
   */
  start() {
    if (this.checkInterval) {
      console.warn('ImprovedActivityMonitor already started');
      return;
    }

    console.log('Starting ImprovedActivityMonitor with event-driven architecture...');
    this.lastActivityTime = Date.now();

    // Listen to Electron power events (zero CPU overhead)
    this.setupPowerMonitorListeners();

    // Start smart polling
    this.startSmartPolling();
  }

  /**
   * Setup Electron power monitor listeners
   * These are event-driven and use zero CPU
   */
  private setupPowerMonitorListeners() {
    // System is suspending (sleep/hibernate)
    powerMonitor.on('suspend', () => {
      console.log('System suspended - marking as inactive');
      this.markInactive();
    });

    // System woke up from sleep
    powerMonitor.on('resume', () => {
      console.log('System resumed - marking as active');
      this.markActive();
    });

    // User is locking the screen
    powerMonitor.on('lock-screen', () => {
      console.log('Screen locked - marking as inactive');
      this.markInactive();
    });

    // User unlocked the screen
    powerMonitor.on('unlock-screen', () => {
      console.log('Screen unlocked - marking as active');
      this.markActive();
    });
  }

  /**
   * Smart polling: adjusts check frequency based on idle time
   * - Every 30s when user is clearly active
   * - Every 5s when approaching inactivity threshold
   * - Stops polling entirely when inactive
   */
  private startSmartPolling() {
    const check = async () => {
      const idleTime = await this.getSystemIdleTime();

      if (idleTime === null) {
        // Can't determine idle time, schedule next check
        this.scheduleNextCheck();
        return;
      }

      const totalIdleMs = idleTime;

      // Check if we're near the inactivity threshold (within 1 minute)
      const thresholdBuffer = 60 * 1000; // 1 minute
      this.isNearThreshold = totalIdleMs >= (this.inactivityThreshold - thresholdBuffer);

      if (totalIdleMs >= this.inactivityThreshold) {
        // User is inactive
        if (!this.isUserInactive) {
          this.markInactive();
        }
        // When inactive, stop polling to save CPU
        // Will resume on power monitor events (suspend/resume/lock/unlock)
        return;
      } else {
        // User is active
        if (this.isUserInactive) {
          this.markActive();
        }
        this.lastActivityTime = Date.now();

        // Schedule next check
        this.scheduleNextCheck();
      }
    };

    // Initial check
    check();
  }

  /**
   * Schedule next check based on current state
   * Smart frequency adjustment to minimize CPU usage
   */
  private scheduleNextCheck() {
    if (this.checkInterval) {
      clearTimeout(this.checkInterval);
    }

    // Use faster polling when near threshold, slower when clearly active
    const interval = this.isNearThreshold
      ? this.fastCheckInterval
      : this.smartCheckInterval;

    this.checkInterval = setTimeout(async () => {
      await this.startSmartPolling();
    }, interval);
  }

  /**
   * Mark user as inactive and emit event
   */
  private markInactive() {
    if (!this.isUserInactive) {
      this.isUserInactive = true;
      this.emit('user-inactive', {
        timestamp: new Date().toISOString(),
      });
      console.log('User marked as INACTIVE');
    }
  }

  /**
   * Mark user as active and emit event
   */
  private markActive() {
    if (this.isUserInactive) {
      this.isUserInactive = false;
      this.lastActivityTime = Date.now();
      this.emit('user-active', {
        timestamp: new Date().toISOString(),
      });
      console.log('User marked as ACTIVE');

      // Resume smart polling after becoming active
      this.startSmartPolling();
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearTimeout(this.checkInterval);
      this.checkInterval = null;
    }

    // Remove power monitor listeners
    powerMonitor.removeAllListeners('suspend');
    powerMonitor.removeAllListeners('resume');
    powerMonitor.removeAllListeners('lock-screen');
    powerMonitor.removeAllListeners('unlock-screen');

    console.log('ImprovedActivityMonitor stopped');
  }

  /**
   * Update inactivity threshold
   */
  setInactivityThreshold(minutes: number) {
    this.inactivityThreshold = minutes * 60 * 1000;
    console.log(`Inactivity threshold updated to ${minutes} minutes`);
  }

  /**
   * Get system idle time in milliseconds using GetLastInputInfo Win32 API
   * This is the ONLY Windows API call made, and only during polling intervals
   */
  private async getSystemIdleTime(): Promise<number | null> {
    try {
      if (process.platform === 'win32') {
        // Windows: Use PowerShell with GetLastInputInfo (Win32 API)
        // This is the native hook approach the client requested
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

  /**
   * Get current status
   */
  isInactive(): boolean {
    return this.isUserInactive;
  }
}
