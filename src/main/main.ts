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
    this.pg.connect().then(ok => {
      if (ok) {
        console.log('[Postgres] Connected to Railway');
        // Sync all today's entries immediately on connect
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

    // Apply start-with-Windows from saved config
    const savedConfig = this.db?.getConfig();
    if (savedConfig) {
      app.setLoginItemSettings({
        openAtLogin: savedConfig.startWithWindows,
        openAsHidden: true,
        name: 'TimeTrack',
      });
    }

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
    // and show popup if one is found and not already being tracked
    this.processScanInterval = setInterval(() => this.scanRegisteredProcesses(), 2 * 60 * 1000);
  }

  private async scanRegisteredProcesses() {
    if (process.platform !== 'win32') return;
    try {
      const registeredPrograms = this.db?.getProjectPrograms() || [];
      if (registeredPrograms.length === 0) return;

      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      const { stdout } = await execAsync('tasklist /fo csv /nh', { timeout: 5000, windowsHide: true });
      const running = new Set(
        stdout.split(/\r?\n/)
          .map((l: string) => l.split(',')[0]?.replace(/"/g, '').replace(/\.exe$/i, '').toLowerCase())
          .filter(Boolean)
      );

      const activeEntries = this.db?.getTimeEntries() || [];
      const activeProcesses = new Set(activeEntries.filter(e => !e.endTime).map(e => e.processName.toLowerCase()));

      for (const prog of registeredPrograms) {
        const key = prog.processName.toLowerCase();
        if (!running.has(key)) continue;
        if (activeProcesses.has(key)) continue;          // already tracked
        if (this.popupTimers.has(prog.processName)) continue; // timer already pending

        // Found a registered process running but not tracked — trigger popup immediately
        console.log(`[Scan] Found registered process "${prog.processName}" running — showing popup`);
        const linked = this.db?.getProjectByProcess(prog.processName);
        if (linked) {
          this.createPopupWindow(linked.displayName, prog.processName);
          break; // show one popup at a time
        }
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
      const { stdout } = await execAsync('tasklist /fo csv /nh', { timeout: 5000, windowsHide: true });
      const running = new Set(
        stdout.split(/\r?\n/)
          .map((l: string) => l.split(',')[0]?.replace(/"/g, '').replace(/\.exe$/i, '').toLowerCase())
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

    // Check if this process is registered by admin in project_programs
    const linked = this.db?.getProjectByProcess(processName);
    if (!linked) return;

    // Get config to check popup delay
    const config = this.db?.getConfig();
    const popupDelay = (config?.popupDelay || 2) * 60 * 1000;

    // Check if already tracking this app
    const activeEntries = this.db?.getTimeEntries();
    const alreadyTracking = activeEntries?.some(
      entry => entry.processName === processName && entry.endTime === null
    );

    if (alreadyTracking) {
      console.log(`Already tracking ${linked.projectName}`);
      return;
    }

    // Set timer to show popup after continuous use
    if (!this.popupTimers.has(processName)) {
      console.log(`Starting timer for ${linked.projectName} / ${processName} (${popupDelay / 1000}s)`);

      const timer = setTimeout(() => {
        console.log(`Timer expired, showing popup for ${linked.projectName}`);
        this.createPopupWindow(linked.displayName, processName);
        this.popupTimers.delete(processName);
      }, popupDelay);

      this.popupTimers.set(processName, timer);
    }
  }

  private createPopupWindow(appName: string, processName: string) {
    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      this.popupWindow.focus();
      return;
    }

    // Don't show popup if process has no linked project
    const linked = this.db?.getProjectByProcess(processName);
    if (!linked) {
      console.log('No project linked to process, skipping popup');
      return;
    }

    const isMinimized = !this.mainWindow || this.mainWindow.isMinimized() || !this.mainWindow.isVisible();

    if (isMinimized && Notification.isSupported()) {
      const notification = new Notification({
        title: 'TimeTrack — App Detectado',
        body: `Você está usando ${appName} há 2 minutos. Clique para vincular ao projeto.`,
        silent: false,
      });

      notification.on('click', () => {
        this.mainWindow?.show();
        this.mainWindow?.focus();
        this.createPopupWindow(appName, processName);
      });

      // Also show balloon on Windows tray
      if (process.platform === 'win32' && this.tray) {
        this.tray.displayBalloon({
          title: 'TimeTrack — App Detectado',
          content: `Você está usando ${appName} há 2 minutos. Clique para vincular.`,
          iconType: 'info',
        });
        this.tray.once('balloon-click', () => {
          this.mainWindow?.show();
          this.mainWindow?.focus();
          this.createPopupWindow(appName, processName);
        });
      }

      notification.show();
      return;
    }

    const { workArea } = screen.getPrimaryDisplay();
    const popupWidth = 400;
    const popupHeight = 520;
    const margin = 12;
    const x = workArea.x + workArea.width - popupWidth - margin;
    const y = workArea.y + workArea.height - popupHeight - margin;

    this.popupWindow = new BrowserWindow({
      width: popupWidth,
      height: popupHeight,
      x,
      y,
      resizable: false,
      frame: false,
      transparent: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: true,
      backgroundColor: '#0A0E14',
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
      return this.db?.createProject(project);
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_PROJECT, (_, id: string, updates) => {
      return this.db?.updateProject(id, updates);
    });

    ipcMain.handle(IPC_CHANNELS.DELETE_PROJECT, (_, id: string) => {
      return this.db?.deleteProject(id);
    });

    ipcMain.handle(IPC_CHANNELS.IMPORT_PROJECTS, (_, filePath: string) => {
      return this.db?.importProjects(filePath);
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
      // Apply start-with-Windows setting immediately
      if (config.startWithWindows !== undefined) {
        app.setLoginItemSettings({
          openAtLogin: config.startWithWindows,
          openAsHidden: true,
          name: 'TimeTrack',
        });
        console.log(`[App] Start with Windows: ${config.startWithWindows}`);
      }
      return result;
    });

    // Time entries
    ipcMain.handle(IPC_CHANNELS.GET_TIME_ENTRIES, (_, date?: string) => {
      return this.db?.getTimeEntries(date);
    });

    ipcMain.handle(IPC_CHANNELS.START_TRACKING, async (_, data) => {
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
      console.log('GET_RUNNING_APPS called, platform:', process.platform);
      if (process.platform !== 'win32') {
        console.log('GET_RUNNING_APPS: not win32, returning []');
        return [];
      }
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        console.log('GET_RUNNING_APPS: running tasklist...');
        const { stdout, stderr } = await execAsync(
          'tasklist /v /fo csv /nh',
          { timeout: 8000, windowsHide: true }
        );
        console.log('GET_RUNNING_APPS: tasklist stderr:', stderr || '(none)');
        console.log('GET_RUNNING_APPS: tasklist stdout length:', stdout?.length);
        console.log('GET_RUNNING_APPS: first 300 chars:', stdout?.substring(0, 300));

        const seen = new Set<string>();
        const apps: { processName: string; windowTitle: string; icon: string }[] = [];
        const lines = stdout.trim().split(/\r?\n/);
        console.log('GET_RUNNING_APPS: total lines:', lines.length);

        for (const line of lines) {
          if (!line.trim()) continue;
          const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
          const exeName = cols[0]?.replace(/"/g, '').replace(/\.exe$/i, '').trim();
          const windowTitle = cols[8]?.replace(/"/g, '').trim();
          if (!exeName || !windowTitle || windowTitle === 'N/A') continue;
          if (exeName.toLowerCase() === 'timetrack') continue;
          const key = exeName.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            apps.push({ processName: exeName, windowTitle, icon: '🖥️' });
          }
        }
        console.log('GET_RUNNING_APPS: result count:', apps.length);
        console.log('GET_RUNNING_APPS: apps:', JSON.stringify(apps.slice(0, 5)));
        return apps;
      } catch (err: any) {
        console.error('GET_RUNNING_APPS exception:', err?.message || err);
        console.error('GET_RUNNING_APPS stack:', err?.stack);
        return [];
      }
    });

    ipcMain.on(IPC_CHANNELS.SHOW_POPUP, (_, appName: string, processName: string) => {
      this.createPopupWindow(appName || '', processName || '');
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

    // Close hides to tray — does NOT quit the app
    ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
      this.mainWindow?.hide();
    });

    // ── Team / PostgreSQL handlers ────────────────────────────────────────────

    // Project programs
    ipcMain.handle(IPC_CHANNELS.GET_PROJECT_PROGRAMS, (_, projectId?: string) => {
      return this.db?.getProjectPrograms(projectId) ?? [];
    });

    ipcMain.handle(IPC_CHANNELS.ADD_PROJECT_PROGRAM, (_, projectId: string, processName: string, displayName: string) => {
      return this.db?.addProjectProgram(projectId, processName, displayName);
    });

    ipcMain.handle(IPC_CHANNELS.REMOVE_PROJECT_PROGRAM, (_, id: string) => {
      return this.db?.removeProjectProgram(id);
    });

    ipcMain.handle(IPC_CHANNELS.GET_POSTGRES_STATUS, () => {
      return this.pg?.isConnected() ?? false;
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
      if (!this.pg) return null;
      return this.pg.addTeamMember(member);
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_TEAM_MEMBER, async (_, id: string, updates) => {
      if (!this.pg) return false;
      return this.pg.updateTeamMember(id, updates);
    });

    ipcMain.handle(IPC_CHANNELS.REMOVE_TEAM_MEMBER, async (_, id: string) => {
      if (!this.pg) return false;
      return this.pg.removeTeamMember(id);
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

    ipcMain.handle(IPC_CHANNELS.EXPORT_WEEKLY_REPORT, async (_, userId: string, userName: string) => {
      if (!this.mainWindow) return null;
      const savePath = path.join(app.getPath('documents'), `timetrack-report-${userName.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`);
      const pdfData = await this.mainWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
      });
      fs.writeFileSync(savePath, pdfData);
      shell.openPath(savePath);
      return savePath;
    });
  }
}

// Start the application
new TimeTrackApp();
