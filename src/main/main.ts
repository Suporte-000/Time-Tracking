import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification, shell, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import { WindowMonitor } from './services/windowMonitor';
import { ImprovedActivityMonitor } from './services/activityMonitorImproved';
import { DatabaseService } from './services/database';
import { PostgresService } from './services/postgresService';
import { SyncService } from './services/syncService';
import { IPC_CHANNELS } from '../shared/types';

function parseEnvFile(filePath: string) {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    if (key) process.env[key] = val;
  }
}

// Phase 1: load .env from paths that don't need app.whenReady()
function loadEnvEarly() {
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '.env'),
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env'),
    path.join(__dirname, '../../../.env'),
    path.join(path.dirname(process.execPath), '.env'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) { parseEnvFile(p); console.log('[ENV] Early-loaded from:', p); return; }
  }
}

// Phase 2: load from userData / resources (requires app.whenReady)
function loadEnvAfterReady() {
  const userDataEnv = path.join(app.getPath('userData'), '.env');
  const bundledEnv = path.join(process.resourcesPath || '', '.env');

  // If userData .env doesn't exist, try to create it
  if (!fs.existsSync(userDataEnv)) {
    if (fs.existsSync(bundledEnv)) {
      // Copy bundled .env to userData
      try { fs.copyFileSync(bundledEnv, userDataEnv); console.log('[ENV] Copied bundled .env to userData'); } catch {}
    } else {
      // Create template so user knows where to put credentials
      try {
        fs.mkdirSync(path.dirname(userDataEnv), { recursive: true });
        fs.writeFileSync(userDataEnv, '# TimeTrack configuration\nDATABASE_URL=\n');
        console.log('[ENV] Created template .env at:', userDataEnv);
      } catch {}
    }
  }

  // Load from userData (highest priority) or bundled fallback
  const candidates = [userDataEnv, bundledEnv, path.join(app.getAppPath(), '.env')];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      parseEnvFile(p);
      console.log('[ENV] Loaded from:', p);
      break;
    }
  }
  console.log('[ENV] DATABASE_URL:', process.env.DATABASE_URL ? 'SET ✓' : 'NOT SET ✗');
}

loadEnvEarly();

// ── Log file setup ──────────────────────────────────────────────────────────
const LOG_PATH = path.join(app.getPath('userData'), 'timetrack.log');
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });
function writeLog(level: string, args: any[]) {
  const line = `[${new Date().toISOString()}] [${level}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`;
  logStream.write(line);
}
const _origLog = console.log.bind(console);
const _origWarn = console.warn.bind(console);
const _origError = console.error.bind(console);
console.log = (...a) => { _origLog(...a); writeLog('INFO', a); };
console.warn = (...a) => { _origWarn(...a); writeLog('WARN', a); };
console.error = (...a) => { _origError(...a); writeLog('ERROR', a); };

// PowerShell helper — returns process names, one per line (used for scan/check)
function psGetProcessNames(): string {
  const script = `Get-Process | Select-Object -ExpandProperty Name`;
  return `powershell -NoProfile -NonInteractive -EncodedCommand ${Buffer.from(script, 'utf16le').toString('base64')}`;
}

// ── Native Win32 helpers for running-apps enumeration ────────────────────────
let _win32Libs: { ffi: any; ref: any; user32: any; kernel32: any } | null = null;

function loadWin32Libs() {
  if (_win32Libs) return _win32Libs;
  try {
    const ffi = require('ffi-napi');
    const ref = require('ref-napi');
    const user32 = ffi.Library('user32', {
      EnumWindows: ['bool', ['pointer', 'int64']],
      IsWindowVisible: ['bool', ['pointer']],
      GetWindowTextW: ['int', ['pointer', 'pointer', 'int']],
      GetWindowThreadProcessId: ['uint32', ['pointer', ref.refType('int32')]],
    });
    const kernel32 = ffi.Library('kernel32', {
      OpenProcess: ['pointer', ['uint32', 'bool', 'int32']],
      QueryFullProcessImageNameW: ['bool', ['pointer', 'uint32', 'pointer', ref.refType('uint32')]],
      CloseHandle: ['bool', ['pointer']],
    });
    _win32Libs = { ffi, ref, user32, kernel32 };
    return _win32Libs;
  } catch {
    return null;
  }
}

function getRunningAppsNative(): { processName: string; windowTitle: string; icon: string }[] {
  const libs = loadWin32Libs();
  if (!libs) return [];
  const { ffi, ref, user32, kernel32 } = libs;
  const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
  const seen = new Set<string>();
  const apps: { processName: string; windowTitle: string; icon: string }[] = [];

  const callback = ffi.Callback('bool', ['pointer', 'int64'], (hwnd: any) => {
    try {
      if (!user32.IsWindowVisible(hwnd)) return true;
      const titleBuf = Buffer.alloc(1024);
      const len = user32.GetWindowTextW(hwnd, titleBuf, 512);
      if (len === 0) return true;
      const windowTitle = titleBuf.toString('ucs2').replace(/\0/g, '').trim();
      if (!windowTitle) return true;

      const pidBuf = ref.alloc('int32', 0);
      user32.GetWindowThreadProcessId(hwnd, pidBuf);
      const pid = pidBuf.deref();
      if (!pid) return true;

      const hProc = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
      if (!hProc || hProc.isNull()) return true;

      try {
        const pathBuf = Buffer.alloc(1024);
        const lenBuf = ref.alloc('uint32', 512);
        const ok = kernel32.QueryFullProcessImageNameW(hProc, 0, pathBuf, lenBuf);
        if (!ok) return true;
        const fullPath = pathBuf.toString('ucs2').replace(/\0/g, '').trim();
        const processName = require('path').basename(fullPath, '.exe');
        const key = processName.toLowerCase();
        if (key === 'timetrack' || key === 'applicationframehost') return true;
        if (!seen.has(key)) {
          seen.add(key);
          apps.push({ processName, windowTitle, icon: '🖥️' });
        }
      } finally {
        kernel32.CloseHandle(hProc);
      }
    } catch { /* skip this window */ }
    return true;
  });

  user32.EnumWindows(callback, 0);
  // Keep callback reference alive until EnumWindows returns
  void callback;
  return apps;
}

class TimeTrackApp {
  private mainWindow: BrowserWindow | null = null;
  private popupWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private windowMonitor: WindowMonitor | null = null;
  private activityMonitor: ImprovedActivityMonitor | null = null;
  private db: DatabaseService | null = null;
  private pg: PostgresService | null = null;
  private sync: SyncService | null = null;
  private popupTimers: Map<string, NodeJS.Timeout> = new Map();
  private currentActiveProcess: string | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private processScanInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Single instance lock — if another instance is already running, focus it and quit this one
    const gotLock = app.requestSingleInstanceLock();
    if (!gotLock) {
      console.log('[App] Another instance is already running. Quitting.');
      app.quit();
      return;
    }

    // When a second instance tries to launch, bring the existing window to front
    app.on('second-instance', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore();
        if (!this.mainWindow.isVisible()) this.mainWindow.show();
        this.mainWindow.focus();
      }
    });

    this.init();
  }

  private async init() {
    // Handle app ready
    await app.whenReady();

    // Initialize database
    this.db = new DatabaseService();

    // Phase 2: load .env now that app is ready (userData + resourcesPath are valid)
    loadEnvAfterReady();

    // Initialize PostgreSQL + sync
    this.pg = new PostgresService();
    this.sync = new SyncService(this.pg, this.db);
    this.pg.connect().then(async ok => {
      if (ok) {
        console.log('[Postgres] Connected to Railway');
        // Restore user-config.json if it was deleted (ID recovery)
        await this.sync?.tryRestoreLocalUser();
        // Pull shared data (projects, programs, members) from PostgreSQL into local SQLite
        await this.sync?.pullFromPostgres();
        // Sync all today's entries up to PostgreSQL
        this.sync?.syncAllTodayEntries().catch(() => {});
      } else {
        console.warn('[Postgres] Failed to connect — check DATABASE_URL in .env');
      }
    }).catch(err => console.warn('[Postgres] Could not connect:', err.message));

    // Sync all today's entries to PostgreSQL every 5 minutes
    this.syncInterval = setInterval(() => {
      if (this.pg?.isConnected()) {
        console.log('[Sync] 5-minute sync triggered');
        this.sync?.syncAllTodayEntries().catch(err => console.warn('[Sync] Error:', err));
      }
    }, 5 * 60 * 1000);

    // Always register auto-start with Windows (openAtLogin driven by config)
    const savedConfig = this.db?.getConfig();
    const startWithWindows = savedConfig?.startWithWindows ?? true;
    app.setLoginItemSettings({
      openAtLogin: startWithWindows,
      openAsHidden: true,
      name: 'TimeTrack',
    });
    console.log(`[App] Start with Windows: ${startWithWindows}`);

    // Create main window
    // Remove default menu bar (File/Edit/View/Window/Help)
    Menu.setApplicationMenu(null);

    this.createMainWindow();

    // Create system tray
    this.createTray();

    // Initialize monitors
    this.initializeMonitors();

    // Setup IPC handlers
    this.setupIPCHandlers();

    // Handle window events
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Stop all active tracking when app quits
    app.on('before-quit', async () => {
      console.log('[App] Quitting — stopping all active tracking entries');
      // Clear intervals
      if (this.syncInterval) clearInterval(this.syncInterval);
      if (this.processScanInterval) clearInterval(this.processScanInterval);
      // Clear popup timers
      for (const timer of this.popupTimers.values()) clearTimeout(timer);
      this.popupTimers.clear();
      // Stop all active entries
      const entries = this.db?.getTimeEntries() || [];
      const active = entries.filter(e => !e.endTime);
      for (const entry of active) {
        this.db?.stopTracking(entry.id, 'auto');
        console.log(`[App] Auto-stopped tracking: ${entry.processName}`);
      }
      // Final sync
      if (this.pg?.isConnected()) {
        try { await this.sync?.syncAllTodayEntries(); } catch {}
      }
      await this.pg?.close();
    });
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      fullscreen: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      frame: false,
      show: false,
    });

    // Load app
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }

    // Capture all renderer console output into the log file
    this.mainWindow.webContents.on('console-message', (_e, level, message) => {
      const lvl = ['DEBUG', 'INFO', 'WARN', 'ERROR'][level] ?? 'INFO';
      writeLog(`MAIN-RENDERER:${lvl}`, [message]);
    });

    this.mainWindow.once('ready-to-show', () => {
      // If launched automatically at login, stay hidden in tray
      const launchedAtLogin = app.getLoginItemSettings().wasOpenedAtLogin;
      if (launchedAtLogin) {
        console.log('[App] Launched at login — starting minimized to tray');
        return; // don't show window
      }
      this.mainWindow?.show();
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      }
    });

    // Intercept OS close button — hide to tray instead of quitting
    this.mainWindow.on('close', (e) => {
      e.preventDefault();
      this.mainWindow?.hide();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private createTrayIcon() {
    // Generate a 16x16 teal icon as PNG buffer
    // Simple solid teal square with "T" — works on all Windows versions
    const size = 16;
    const buf = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      const x = i % size;
      const y = Math.floor(i / size);
      // Draw teal background
      let r = 0x1F, g = 0xB8, b = 0xA0, a = 255;
      // Draw white "T" letter in center
      const cx = 8;
      if ((y === 3 || y === 4) && x >= 3 && x <= 12) { r = 255; g = 255; b = 255; }
      else if (x >= cx - 1 && x <= cx + 1 && y >= 3 && y <= 13) { r = 255; g = 255; b = 255; }
      buf[i * 4 + 0] = r;
      buf[i * 4 + 1] = g;
      buf[i * 4 + 2] = b;
      buf[i * 4 + 3] = a;
    }
    return nativeImage.createFromBuffer(buf, { width: size, height: size });
  }

  private createTray() {
    const icon = this.createTrayIcon();
    this.tray = new Tray(icon);

    this.updateTrayMenu();
    this.tray.setToolTip('TimeTrack - Controle de Horas');

    this.tray.on('click', () => {
      this.mainWindow?.show();
      this.mainWindow?.focus();
    });

    // Update tray menu and window title every second
    setInterval(() => {
      this.updateTrayMenu();
    }, 1000);
  }

  private updateTrayMenu() {
    if (!this.tray) return;

    const activeEntries = this.db?.getTimeEntries();
    const currentTracking = activeEntries?.find(entry => entry.endTime === null);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'TimeTrack',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: currentTracking
          ? `Rastreando: ${currentTracking.appName}`
          : 'Sem rastreamento ativo',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Abrir Dashboard',
        click: () => {
          this.mainWindow?.show();
          this.mainWindow?.focus();
        },
      },
      {
        label: currentTracking ? 'Parar Rastreamento' : 'Iniciar Manual',
        click: () => {
          if (currentTracking) {
            this.db?.stopTracking(currentTracking.id, 'manual');
          }
          this.mainWindow?.show();
        },
      },
      { type: 'separator' },
      {
        label: 'Ver Histórico',
        click: () => {
          this.mainWindow?.show();
        },
      },
      {
        label: 'Configurações',
        click: () => {
          this.mainWindow?.show();
        },
      },
      { type: 'separator' },
      {
        label: 'View Logs',
        click: () => {
          shell.openPath(LOG_PATH);
        },
      },
      {
        label: 'Sair',
        click: () => {
          app.exit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);

    const projects = this.db?.getProjects() || [];

    if (currentTracking) {
      const project = projects.find(p => p.id === currentTracking.projectId);
      const projectName = project
        ? project.name + (project.subproject ? ` › ${project.subproject}` : '')
        : currentTracking.appName;

      // Elapsed time
      const elapsed = Math.floor((Date.now() - new Date(currentTracking.startTime).getTime()) / 1000);
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      const timeStr = h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`;

      this.tray.setToolTip(`TimeTrack - ${projectName} (${timeStr})`);
      this.mainWindow?.setTitle(`TimeTrack — ${projectName}  •  ${timeStr}`);
    } else {
      this.tray.setToolTip('TimeTrack');
      this.mainWindow?.setTitle('TimeTrack — Controle de Horas por Projeto');
    }
  }

  private initializeMonitors() {
    // Initialize window monitor (Windows process detection)
    this.windowMonitor = new WindowMonitor();

    // Listen for active window changes
    this.windowMonitor.on('window-changed', (activeWindow) => {
      console.log('Active window changed:', activeWindow);

      // Send to renderer
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC_CHANNELS.ACTIVE_WINDOW_CHANGED, activeWindow);
      }

      // Check if we should show popup
      this.handleWindowChange(activeWindow);
    });

    // Initialize improved activity monitor (event-driven with minimal CPU usage)
    this.activityMonitor = new ImprovedActivityMonitor();

    this.activityMonitor.on('user-inactive', () => {
      console.log('User inactive');
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC_CHANNELS.USER_INACTIVE);
      }
    });

    this.activityMonitor.on('user-active', () => {
      console.log('User active again');
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC_CHANNELS.USER_ACTIVE);
      }
    });

    // Start monitoring
    this.windowMonitor.start();
    this.activityMonitor.start();

    // Auto-stop tracking when the tracked process exits
    if (process.platform === 'win32') {
      setInterval(() => this.checkTrackedProcessStillRunning(), 5000);
    }

    // Every 2 minutes: scan running processes for any registered programs
    this.processScanInterval = setInterval(() => this.scanRegisteredProcesses(), 2 * 60 * 1000);
    // Also scan immediately on startup (don't wait 2 minutes)
    setTimeout(() => this.scanRegisteredProcesses(), 5000);
  }

  private async scanRegisteredProcesses() {
    if (process.platform !== 'win32') return;
    try {
      const registeredPrograms = this.db?.getProjectPrograms() || [];
      if (registeredPrograms.length === 0) return;

      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      const { stdout } = await execAsync(psGetProcessNames(), { timeout: 8000, windowsHide: true });
      const running = new Set(
        stdout.split(/\r?\n/)
          .map((l: string) => l.trim().toLowerCase())
          .filter(Boolean)
      );

      const activeEntries = this.db?.getTimeEntries() || [];
      const activeProcesses = new Set(activeEntries.filter(e => !e.endTime).map(e => e.processName.toLowerCase()));

      const user = this.sync?.getLocalUser();
      if (!user) return;

      for (const prog of registeredPrograms) {
        const key = prog.processName.toLowerCase();
        if (!running.has(key)) continue;
        if (activeProcesses.has(key)) continue;
        if (this.popupTimers.has(prog.processName)) continue;

        const linked = this.db?.getProjectByProcess(prog.processName);
        const projectId = linked?.projectId ?? null;
        const displayName = linked?.displayName ?? prog.displayName;

        // Standalone (no project) → show popup for user to pick project
        if (!projectId) {
          console.log(`[Scan] Standalone program "${prog.processName}" — showing popup`);
          this.createPopupWindow(displayName, prog.processName);
          break; // one at a time
        }

        // Project linked → auto-start tracking immediately
        console.log(`[Scan] Auto-starting tracking for "${linked?.projectName}" / "${prog.processName}"`);
        const entry = this.db?.startTracking({
          userId: user.id,
          projectId,
          appName: displayName,
          processName: prog.processName,
        });
        if (entry) {
          this.sync?.syncEntry(entry.id).catch(() => {});
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(IPC_CHANNELS.ACTIVE_WINDOW_CHANGED, {
              processName: prog.processName,
              windowTitle: displayName,
            });
          }
          this.showTrackingNotification();
        }
        break; // one at a time
      }
    } catch (err) {
      console.warn('[Scan] scanRegisteredProcesses error:', err);
    }
  }

  private async checkTrackedProcessStillRunning() {
    try {
      const entries = this.db?.getTimeEntries() || [];
      const active = entries.filter(e => !e.endTime && e.processName);
      if (active.length === 0) return;

      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      const { stdout } = await execAsync(psGetProcessNames(), { timeout: 8000, windowsHide: true });
      const running = new Set(
        stdout.split(/\r?\n/)
          .map((l: string) => l.trim().toLowerCase())
          .filter(Boolean)
      );

      for (const entry of active) {
        const key = entry.processName.toLowerCase();
        if (!running.has(key)) {
          console.log(`Process "${entry.processName}" exited — auto-stopping entry ${entry.id}`);
          this.db?.stopTracking(entry.id, 'auto');
          this.sync?.syncEntry(entry.id).catch(() => {});
          // Notify renderer to refresh
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('tracking-auto-stopped', entry.id);
          }
          // Clear any pending popup timer for this process
          const timer = this.popupTimers.get(entry.processName);
          if (timer) { clearTimeout(timer); this.popupTimers.delete(entry.processName); }
        }
      }
    } catch (err) {
      console.warn('checkTrackedProcessStillRunning error:', err);
    }
  }

  private handleWindowChange(activeWindow: { processName: string; windowTitle: string }) {
    const processName = activeWindow.processName;

    // If process changed, clear previous timer
    if (this.currentActiveProcess !== processName) {
      if (this.currentActiveProcess) {
        const timer = this.popupTimers.get(this.currentActiveProcess);
        if (timer) {
          clearTimeout(timer);
          this.popupTimers.delete(this.currentActiveProcess);
        }
      }
      this.currentActiveProcess = processName;
    }

    // Skip if no registered programs exist
    if ((this.db?.getProjectPrograms() || []).length === 0) {
      console.log(`[AutoTrack] Skipped "${processName}": no registered programs in SQLite`);
      return;
    }

    // Check if this process is registered by admin in project_programs
    const linked = this.db?.getProjectByProcess(processName);
    if (!linked) {
      console.log(`[AutoTrack] Skipped "${processName}": not registered in project_programs`);
      return;
    }

    // Get config to check popup delay
    const config = this.db?.getConfig();
    const popupDelay = (config?.popupDelay || 2) * 60 * 1000;

    // Check if already tracking this app
    const activeEntries = this.db?.getTimeEntries();
    const alreadyTracking = activeEntries?.some(
      entry => entry.processName === processName && entry.endTime === null
    );

    if (alreadyTracking) {
      console.log(`Already tracking ${linked.projectName ?? 'standalone'}`);
      return;
    }

    if (!this.popupTimers.has(processName)) {
      // Standalone (no project linked) → show popup for user to pick project
      if (!linked.projectId) {
        console.log(`[AutoTrack] Standalone program "${processName}" — showing popup`);
        this.createPopupWindow(linked.displayName, processName);
        return;
      }

      // Project linked → auto-start after popupDelay
      console.log(`Starting timer for ${linked.projectName} / ${processName} (${popupDelay / 1000}s)`);

      const timer = setTimeout(() => {
        this.popupTimers.delete(processName);

        // Re-check: still running and not already tracking
        const entries = this.db?.getTimeEntries();
        const stillTracking = entries?.some(e => e.processName === processName && !e.endTime);
        if (stillTracking) return;

        const user = this.sync?.getLocalUser();
        if (!user) {
          console.warn(`[AutoTrack] No local user — cannot auto-start tracking for ${linked.projectName}`);
          return;
        }

        const entry = this.db?.startTracking({
          userId: user.id,
          projectId: linked.projectId ?? null,
          appName: linked.displayName,
          processName,
        });

        if (entry) {
          console.log(`[AutoTrack] Auto-started tracking: ${linked.projectName} / ${processName}`);
          this.sync?.syncEntry(entry.id).catch(() => {});
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(IPC_CHANNELS.ACTIVE_WINDOW_CHANGED, {
              processName,
              windowTitle: linked.displayName,
            });
          }
          this.showTrackingNotification();
        }
      }, popupDelay);

      this.popupTimers.set(processName, timer);
    }
  }

  private showTrackingNotification() {
    const config = this.db?.getConfig();
    if (!config?.showNotifications) return; // respect the toggle

    const lang = config?.language || 'en';
    const messages: Record<string, string> = {
      'en': 'We have started program tracking.',
      'es': 'Hemos iniciado el seguimiento del programa.',
      'pt-BR': 'Iniciamos o rastreamento do programa.',
    };
    const body = messages[lang] ?? messages['en'];

    if (process.platform === 'win32' && this.tray) {
      this.tray.displayBalloon({ title: 'TimeTrack', content: body, iconType: 'info' });
    } else if (Notification.isSupported()) {
      new Notification({ title: 'TimeTrack', body, silent: false }).show();
    }
  }

  private createPopupWindow(appName: string, processName: string) {
    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      this.popupWindow.focus();
      return;
    }

    // Don't show popup if there are no projects
    const projects = this.db?.getProjects() || [];
    if (projects.length === 0) {
      console.log('No projects exist, skipping popup');
      return;
    }


    const { workArea } = screen.getPrimaryDisplay();
    const popupWidth = 400;
    const popupHeight = 480;
    const margin = 12;
    const x = workArea.x + workArea.width - popupWidth - margin;
    const y = workArea.y + workArea.height - popupHeight - margin;

    this.popupWindow = new BrowserWindow({
      width: popupWidth,
      height: popupHeight,
      minWidth: popupWidth,
      maxWidth: popupWidth,
      x,
      y,
      resizable: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    // Force above ALL windows on Windows (fullscreen apps, focused apps, etc.)
    this.popupWindow.setAlwaysOnTop(true, 'screen-saver');
    this.popupWindow.setVisibleOnAllWorkspaces(true);

    // Center the popup on screen
    this.popupWindow.center();
    this.popupWindow.focus();

    // Load popup view with query params
    const queryParams = new URLSearchParams({
      appName,
      processName,
    });

    if (process.env.NODE_ENV === 'development') {
      this.popupWindow.loadURL(`http://localhost:5173?mode=popup&${queryParams.toString()}`);
      this.popupWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
      this.popupWindow.loadFile(path.join(__dirname, '../../dist/index.html'), {
        query: { mode: 'popup', appName, processName },
      });
    }

    // Capture popup renderer console output into the log file
    this.popupWindow.webContents.on('console-message', (_e, level, message) => {
      const lvl = ['DEBUG', 'INFO', 'WARN', 'ERROR'][level] ?? 'INFO';
      writeLog(`POPUP-RENDERER:${lvl}`, [message]);
    });

    this.popupWindow.on('closed', () => {
      this.popupWindow = null;
    });
  }

  private setupIPCHandlers() {
    if (!this.db) return;

    // Projects
    ipcMain.handle(IPC_CHANNELS.GET_PROJECTS, () => {
      return this.db?.getProjects() || [];
    });

    ipcMain.handle(IPC_CHANNELS.CREATE_PROJECT, (_, project) => {
      const created = this.db?.createProject(project);
      if (created && this.pg?.isConnected()) {
        this.pg.upsertProject(created).catch(() => {});
      }
      return created;
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_PROJECT, (_, id: string, updates) => {
      const result = this.db?.updateProject(id, updates);
      if (result && this.pg?.isConnected()) {
        const projects = this.db?.getProjects() || [];
        const p = projects.find((x: any) => x.id === id);
        if (p) this.pg.upsertProject(p).catch(() => {});
      }
      return result;
    });

    ipcMain.handle(IPC_CHANNELS.DELETE_PROJECT, (_, id: string) => {
      const result = this.db?.deleteProject(id);
      if (result && this.pg?.isConnected()) {
        this.pg.deleteProject(id).catch(() => {});
      }
      return result;
    });

    ipcMain.handle(IPC_CHANNELS.IMPORT_PROJECTS, async (_, filePath: string) => {
      const result = this.db?.importProjects(filePath);
      if (this.pg?.isConnected()) {
        const projects = this.db?.getProjects() || [];
        for (const p of projects) {
          this.pg.upsertProject(p).catch(() => {});
        }
      }
      return result;
    });

    // Monitored Apps
    ipcMain.handle(IPC_CHANNELS.GET_MONITORED_APPS, () => {
      return this.db?.getMonitoredApps() || [];
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_MONITORED_APP, (_, app) => {
      return this.db?.updateMonitoredApp(app);
    });

    // Config
    ipcMain.handle(IPC_CHANNELS.GET_CONFIG, () => {
      return this.db?.getConfig();
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_CONFIG, (_, config) => {
      const result = this.db?.updateConfig(config);

      // Start with Windows
      if (config.startWithWindows !== undefined) {
        app.setLoginItemSettings({
          openAtLogin: config.startWithWindows,
          openAsHidden: true,
          name: 'TimeTrack',
        });
        console.log(`[Config] Start with Windows: ${config.startWithWindows}`);
      }

      // Minimize to tray: ensure tray icon exists when enabled
      if (config.minimizeToTray === true && !this.tray) {
        this.createTray();
        console.log('[Config] Tray created (minimizeToTray enabled)');
      }

      // Discrete notifications: no extra action needed — showTrackingNotification reads config on each call
      if (config.showNotifications !== undefined) {
        console.log(`[Config] Notifications: ${config.showNotifications}`);
      }

      return result;
    });

    // Time entries
    ipcMain.handle(IPC_CHANNELS.GET_TIME_ENTRIES, (_, date?: string) => {
      return this.db?.getTimeEntries(date);
    });

    ipcMain.handle(IPC_CHANNELS.START_TRACKING, async (_, data) => {
      // Only allow tracking for registered programs (or explicit 'manual' entries)
      const processName: string = data?.processName || '';
      if (processName && processName !== 'manual') {
        const registered = this.db?.getProjectByProcess(processName);
        if (!registered) {
          console.log(`[IPC] START_TRACKING blocked: "${processName}" is not registered in admin panel`);
          return null;
        }
      }
      const entry = this.db?.startTracking(data);
      if (entry) this.sync?.syncEntry(entry.id).catch(() => {});
      return entry;
    });

    ipcMain.handle(IPC_CHANNELS.STOP_TRACKING, async (_, entryId: string, status?: string) => {
      const result = this.db?.stopTracking(entryId, status);
      if (result) this.sync?.syncEntry(entryId).catch(() => {});
      return result;
    });

    // Suggestions
    ipcMain.handle(IPC_CHANNELS.GET_SUGGESTION, (_, processName: string) => {
      return this.db?.getSuggestion(processName);
    });

    // Running apps — queries Windows for all processes with a visible window
    ipcMain.handle(IPC_CHANNELS.GET_RUNNING_APPS, async () => {
      if (process.platform !== 'win32') return [];
      try {
        const apps = getRunningAppsNative();
        console.log(`[RunningApps] Found ${apps.length} apps with windows`);
        return apps;
      } catch (err: any) {
        console.error('[RunningApps] Error:', err?.message || err);
        return [];
      }
    });

    // Popup window is disabled — tracking starts automatically
    // ipcMain.on(IPC_CHANNELS.SHOW_POPUP, ...)

    // Popup resize — renderer sends actual card height, we resize the window to match
    ipcMain.on(IPC_CHANNELS.POPUP_RESIZE, (_, height: number) => {
      if (this.popupWindow && !this.popupWindow.isDestroyed()) {
        const [currentWidth] = this.popupWindow.getSize();
        this.popupWindow.setSize(currentWidth, Math.ceil(height));
      }
    });

    // Renderer log — writes renderer-side messages to the log file
    ipcMain.on(IPC_CHANNELS.RENDERER_LOG, (_, level: string, message: string) => {
      writeLog(`RENDERER:${level}`, [message]);
    });

    // System
    ipcMain.on(IPC_CHANNELS.MINIMIZE_TO_TRAY, () => {
      this.mainWindow?.hide();
    });

    ipcMain.on(IPC_CHANNELS.SHOW_MAIN_WINDOW, () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });

    ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
      if (this.mainWindow?.isFullScreen()) {
        this.mainWindow.setFullScreen(false);
      }
      this.mainWindow?.minimize();
    });

    ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
      if (!this.mainWindow) return;
      if (this.mainWindow.isFullScreen()) {
        this.mainWindow.setFullScreen(false);
      } else if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.setFullScreen(true);
      }
    });

    // Close: hide to tray if minimizeToTray is enabled, otherwise quit
    ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
      const cfg = this.db?.getConfig();
      if (cfg?.minimizeToTray ?? true) {
        this.mainWindow?.hide();
      } else {
        app.quit();
      }
    });

    // ── Team / PostgreSQL handlers ────────────────────────────────────────────

    // Project programs
    ipcMain.handle(IPC_CHANNELS.GET_PROJECT_PROGRAMS, (_, projectId?: string) => {
      return this.db?.getProjectPrograms(projectId) ?? [];
    });

    ipcMain.handle(IPC_CHANNELS.ADD_PROJECT_PROGRAM, async (_, projectId: string | null, processName: string, displayName: string) => {
      const result = this.db?.addProjectProgram(projectId ?? null, processName, displayName);
      if (result && this.pg?.isConnected()) {
        this.pg.upsertProjectProgram({
          id: result.id,
          project_id: projectId ?? null,
          process_name: processName,
          display_name: displayName,
        }).catch(() => {});
      }
      return result;
    });

    ipcMain.handle(IPC_CHANNELS.REMOVE_PROJECT_PROGRAM, (_, id: string) => {
      const result = this.db?.removeProjectProgram(id);
      if (result && this.pg?.isConnected()) {
        this.pg.deleteProjectProgram(id).catch(() => {});
      }
      return result;
    });

    ipcMain.handle(IPC_CHANNELS.GET_POSTGRES_STATUS, () => {
      return this.pg?.isConnected() ?? false;
    });

    ipcMain.handle(IPC_CHANNELS.PULL_FROM_POSTGRES, async () => {
      if (!this.pg?.isConnected()) return false;
      await this.sync?.pullFromPostgres();
      console.log('[Admin] Pulled all data from PostgreSQL');
      return true;
    });

    ipcMain.handle(IPC_CHANNELS.PUSH_TO_POSTGRES, async () => {
      if (!this.pg?.isConnected()) return false;
      await this.sync?.syncAllTodayEntries();
      await this.sync?.syncAllProjects();
      console.log('[Admin] Pushed all local data to PostgreSQL');
      return true;
    });

    ipcMain.handle(IPC_CHANNELS.GET_LOCAL_USER, () => {
      return this.sync?.getLocalUser() ?? null;
    });

    ipcMain.handle(IPC_CHANNELS.SAVE_LOCAL_USER, async (_, config) => {
      return this.sync?.saveLocalUser(config);
    });

    ipcMain.handle(IPC_CHANNELS.GET_USER_COLORS, () => {
      return this.sync?.getAvailableColors() ?? [];
    });

    ipcMain.handle(IPC_CHANNELS.GET_TEAM_MEMBERS, async () => {
      return this.pg?.getTeamMembers() ?? [];
    });

    ipcMain.handle(IPC_CHANNELS.ADD_TEAM_MEMBER, async (_, member) => {
      // 1. Save to SQLite
      this.db?.upsertTeamMember(member);
      console.log(`[Admin] Saved team member to SQLite: ${member.name}`);
      // 2. Sync to PostgreSQL
      if (this.pg?.isConnected()) {
        const result = await this.pg.addTeamMember(member);
        console.log(`[Admin] Synced team member to PostgreSQL: ${member.name}`);
        return result;
      }
      return member;
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_TEAM_MEMBER, async (_, id: string, updates) => {
      // 1. Save to SQLite
      const members = this.db?.getTeamMembers() || [];
      const existing = members.find((m: any) => m.id === id);
      if (existing) {
        this.db?.upsertTeamMember({ ...existing, ...updates, id });
        console.log(`[Admin] Updated team member in SQLite: ${id}`);
      }
      // 2. Sync to PostgreSQL
      if (this.pg?.isConnected()) {
        const result = await this.pg.updateTeamMember(id, updates);
        console.log(`[Admin] Synced team member update to PostgreSQL: ${id}`);
        return result;
      }
      return true;
    });

    ipcMain.handle(IPC_CHANNELS.REMOVE_TEAM_MEMBER, async (_, id: string) => {
      // 1. Delete from SQLite
      this.db?.deleteTeamMember(id);
      console.log(`[Admin] Removed team member from SQLite: ${id}`);
      // 2. Sync to PostgreSQL
      if (this.pg?.isConnected()) {
        const result = await this.pg.removeTeamMember(id);
        console.log(`[Admin] Synced team member removal to PostgreSQL: ${id}`);
        return result;
      }
      return true;
    });

    ipcMain.handle(IPC_CHANNELS.GET_TEAM_ENTRIES, async (_, date: string) => {
      return this.pg?.getTeamEntriesForDate(date) ?? [];
    });

    ipcMain.handle(IPC_CHANNELS.ADJUST_TIME_ENTRY, async (_, data) => {
      if (!this.pg) throw new Error('PostgreSQL not connected');
      await this.pg.adjustTimeEntry(data);
      return true;
    });

    ipcMain.handle(IPC_CHANNELS.GET_AUDIT_LOG, async (_, date: string) => {
      return this.pg?.getAuditLogForDate(date) ?? [];
    });

    ipcMain.handle(IPC_CHANNELS.SET_MANAGER_PIN, async (_, pin: string) => {
      if (!this.pg) throw new Error('PostgreSQL not connected');
      await this.pg.setManagerPin(pin);
      return true;
    });

    ipcMain.handle(IPC_CHANNELS.VERIFY_MANAGER_PIN, async (_, pin: string) => {
      return this.pg?.verifyManagerPin(pin) ?? false;
    });

    ipcMain.handle(IPC_CHANNELS.HAS_MANAGER_PIN, async () => {
      return this.pg?.hasManagerPin() ?? false;
    });

    ipcMain.handle(IPC_CHANNELS.EXPORT_WEEKLY_REPORT, async (_, _userId: string, _userName: string, date?: string) => {
      if (!this.pg) return null;
      const reportDate = date || new Date().toISOString().split('T')[0];

      const [entries, members, auditLog] = await Promise.all([
        this.pg.getTeamEntriesForDate(reportDate),
        this.pg.getTeamMembers(),
        this.pg.getAuditLogForDate(reportDate),
      ]);

      // Build member totals map
      const memberTotals = new Map<string, number>();
      for (const e of entries) {
        if (e.end_time) memberTotals.set(e.user_id, (memberTotals.get(e.user_id) || 0) + e.duration);
      }

      const fmt = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      };
      const fmtTime = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '';

      const lines: string[] = [];

      // Sheet 1: summary per member
      lines.push(`Team Report — ${reportDate}`);
      lines.push('');
      lines.push('MEMBER SUMMARY');
      lines.push('Member,Goal (h),Total,Progress %');
      for (const m of members) {
        const total = memberTotals.get(m.id) || 0;
        const pct = m.goal_hours > 0 ? Math.round((total / (m.goal_hours * 3600)) * 100) : 0;
        lines.push(`"${m.name}",${m.goal_hours},${fmt(total)},${pct}%`);
      }

      lines.push('');
      lines.push('TIME ENTRIES');
      lines.push('Member,Project,App,Start,End,Duration,Adjusted');
      for (const e of entries) {
        lines.push([
          `"${e.user_name}"`,
          `"${e.project_name || 'No Project'}"`,
          `"${e.app_name}"`,
          fmtTime(e.start_time),
          fmtTime(e.end_time),
          fmt(e.duration),
          e.is_manually_adjusted ? 'Yes' : 'No',
        ].join(','));
      }

      lines.push('');
      lines.push('MANUAL ADJUSTMENTS');
      if (auditLog.length === 0) {
        lines.push('No manual adjustments on this date.');
      } else {
        lines.push('Time,Manager,Member,Project,Old Start,Old End,New Start,New End,Reason');
        for (const a of auditLog) {
          lines.push([
            fmtTime(a.created_at),
            `"${a.manager_name}"`,
            `"${a.target_user_name}"`,
            `"${a.project_name}"`,
            fmtTime(a.old_start_time),
            fmtTime(a.old_end_time),
            fmtTime(a.new_start_time),
            fmtTime(a.new_end_time),
            `"${a.motive}"`,
          ].join(','));
        }
      }

      const csv = lines.join('\r\n');
      const savePath = path.join(app.getPath('documents'), `timetrack-team-${reportDate}.csv`);
      fs.writeFileSync(savePath, '\uFEFF' + csv, 'utf8'); // BOM for Excel
      shell.openPath(savePath);
      return savePath;
    });
  }
}

// Start the application
new TimeTrackApp();
