import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface ActiveWindow {
  processName: string;
  windowTitle: string;
  timestamp: string;
}

// ── Native Win32 helpers (ffi-napi) ──────────────────────────────────────────
let _ffi: any = null;
let _ref: any = null;
let _user32: any = null;
let _kernel32: any = null;
let _psapi: any = null;
let _nativeReady = false;

function loadNative() {
  if (_nativeReady) return true;
  try {
    _ffi = require('ffi-napi');
    _ref = require('ref-napi');

    _user32 = _ffi.Library('user32', {
      GetForegroundWindow: ['pointer', []],
      GetWindowThreadProcessId: ['uint32', ['pointer', _ref.refType('int32')]],
      GetWindowTextW: ['int', ['pointer', 'pointer', 'int']],
    });

    _kernel32 = _ffi.Library('kernel32', {
      OpenProcess: ['pointer', ['uint32', 'bool', 'int32']],
      QueryFullProcessImageNameW: ['bool', ['pointer', 'uint32', 'pointer', _ref.refType('uint32')]],
      CloseHandle: ['bool', ['pointer']],
    });

    _nativeReady = true;
    console.log('[WindowMonitor] Using native Win32 API (ffi-napi)');
    return true;
  } catch (e: any) {
    console.warn('[WindowMonitor] ffi-napi not available, falling back to PowerShell:', e.message);
    return false;
  }
}

function getNativeActiveWindow(): ActiveWindow | null {
  try {
    const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

    // Get foreground window handle
    const hwnd = _user32.GetForegroundWindow();
    if (!hwnd || hwnd.isNull()) return null;

    // Get title
    const titleBuf = Buffer.alloc(1024);
    _user32.GetWindowTextW(hwnd, titleBuf, 512);
    const windowTitle = titleBuf.toString('ucs2').replace(/\0/g, '').trim();

    // Get PID
    const pidBuf = _ref.alloc('int32', 0);
    _user32.GetWindowThreadProcessId(hwnd, pidBuf);
    const pid = pidBuf.deref();
    if (!pid) return null;

    // Get process name from full path
    const hProc = _kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
    if (!hProc || hProc.isNull()) return null;

    let processName = '';
    try {
      const pathBuf = Buffer.alloc(1024);
      const lenBuf = _ref.alloc('uint32', 512);
      const ok = _kernel32.QueryFullProcessImageNameW(hProc, 0, pathBuf, lenBuf);
      if (ok) {
        const fullPath = pathBuf.toString('ucs2').replace(/\0/g, '').trim();
        processName = path.basename(fullPath, '.exe');
      }
    } finally {
      _kernel32.CloseHandle(hProc);
    }

    if (!processName) return null;

    return {
      processName,
      windowTitle,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ── Fallback: PowerShell (no Add-Type, uses Get-Process) ─────────────────────
// Only used if ffi-napi fails to load.
const PS_FALLBACK_SCRIPT = `$id = (Get-Process | Where-Object {$_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne ''} | Sort-Object CPU -Descending | Select-Object -First 1); if ($id) { "$($id.ProcessName)|$($id.MainWindowTitle)" }`;
const PS_FALLBACK_ENCODED = Buffer.from(PS_FALLBACK_SCRIPT, 'utf16le').toString('base64');

async function getPsActiveWindow(): Promise<ActiveWindow | null> {
  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -NonInteractive -EncodedCommand ${PS_FALLBACK_ENCODED}`,
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

// ── WindowMonitor ─────────────────────────────────────────────────────────────
export class WindowMonitor extends EventEmitter {
  private intervalId: NodeJS.Timeout | null = null;
  private pollInterval: number = 1000;
  private lastActiveWindow: ActiveWindow | null = null;
  private useNative: boolean = false;

  constructor(pollInterval: number = 1000) {
    super();
    this.pollInterval = pollInterval;
    if (process.platform === 'win32') {
      this.useNative = loadNative();
    }
  }

  start() {
    if (this.intervalId) return;
    console.log(`WindowMonitor started (${this.useNative ? 'ffi-napi/Win32' : 'PowerShell fallback'})`);
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
      let activeWindow: ActiveWindow | null = null;

      if (process.platform === 'win32') {
        if (this.useNative) {
          activeWindow = getNativeActiveWindow();
        } else {
          activeWindow = await getPsActiveWindow();
        }
      } else {
        // Linux/Mac dev fallback
        activeWindow = {
          processName: 'Code',
          windowTitle: 'TimeTrack Development',
          timestamp: new Date().toISOString(),
        };
      }

      if (!activeWindow) return;

      if (this.hasWindowChanged(activeWindow)) {
        this.lastActiveWindow = activeWindow;
        this.emit('window-changed', activeWindow);
      }
    } catch {
      // Silently ignore transient errors
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
    if (process.platform !== 'win32') return null;
    if (this.useNative) return getNativeActiveWindow();
    return getPsActiveWindow();
  }
}
