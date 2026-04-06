import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } from 'electron';
import path from 'path';
import { WindowMonitor } from './services/windowMonitor';
import { ImprovedActivityMonitor } from './services/activityMonitorImproved';
import { DatabaseService } from './services/database';
import { IPC_CHANNELS } from '../shared/types';

class TimeTrackApp {
  private mainWindow: BrowserWindow | null = null;
  private popupWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private windowMonitor: WindowMonitor | null = null;
  private activityMonitor: ImprovedActivityMonitor | null = null;
  private db: DatabaseService | null = null;
  private popupTimers: Map<string, NodeJS.Timeout> = new Map();
  private currentActiveProcess: string | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    // Handle app ready
    await app.whenReady();

    // Initialize database
    this.db = new DatabaseService();

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
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 960,
      height: 620,
      minWidth: 800,
      minHeight: 500,
      center: true,
      maximizable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'default',
      frame: true,
      show: false,
    });

    // Load app
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      // // Ensure it's not maximized on first show
      // if (this.mainWindow?.isMaximized()) {
      //   this.mainWindow.unmaximize();
      // }
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

    // Update tray menu every 5 seconds
    setInterval(() => {
      this.updateTrayMenu();
    }, 5000);
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
            this.db?.stopTracking(currentTracking.id);
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
        label: 'Sair',
        click: () => {
          app.exit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);

    // Update tooltip
    if (currentTracking) {
      const projects = this.db?.getProjects() || [];
      const project = projects.find(p => p.id === currentTracking.projectId);
      this.tray.setToolTip(
        `TimeTrack - Rastreando: ${project?.name || currentTracking.appName}`
      );
    } else {
      this.tray.setToolTip('TimeTrack - Sem rastreamento ativo');
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

    // Check if this app is monitored
    const monitoredApp = this.db?.getMonitoredAppByProcess(processName);

    if (monitoredApp && monitoredApp.isEnabled) {
      // Get config to check popup delay
      const config = this.db?.getConfig();
      const popupDelay = (config?.popupDelay || 2) * 60 * 1000; // Convert to milliseconds

      // Check if already tracking this app
      const activeEntries = this.db?.getTimeEntries();
      const alreadyTracking = activeEntries?.some(
        entry => entry.processName === processName && entry.endTime === null
      );

      if (alreadyTracking) {
        console.log(`Already tracking ${monitoredApp.name}`);
        return;
      }

      // Set timer to show popup after continuous use
      if (!this.popupTimers.has(processName)) {
        console.log(`Starting timer for ${monitoredApp.name} (${popupDelay / 1000}s)`);

        const timer = setTimeout(() => {
          console.log(`Timer expired, showing popup for ${monitoredApp.name}`);
          this.createPopupWindow(monitoredApp.name, processName);
          this.popupTimers.delete(processName);
        }, popupDelay);

        this.popupTimers.set(processName, timer);
      }
    }
  }

  private createPopupWindow(appName: string, processName: string) {
    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      this.popupWindow.focus();
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

    this.popupWindow = new BrowserWindow({
      width: 400,
      height: 520,
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
      return this.db?.updateConfig(config);
    });

    // Time entries
    ipcMain.handle(IPC_CHANNELS.GET_TIME_ENTRIES, (_, date?: string) => {
      return this.db?.getTimeEntries(date);
    });

    ipcMain.handle(IPC_CHANNELS.START_TRACKING, (_, data) => {
      return this.db?.startTracking(data);
    });

    ipcMain.handle(IPC_CHANNELS.STOP_TRACKING, (_, entryId: string) => {
      return this.db?.stopTracking(entryId);
    });

    // Suggestions
    ipcMain.handle(IPC_CHANNELS.GET_SUGGESTION, (_, processName: string) => {
      return this.db?.getSuggestion(processName);
    });

    // Running apps — queries Windows for all processes with a visible window
    ipcMain.handle(IPC_CHANNELS.GET_RUNNING_APPS, async () => {
      if (process.platform !== 'win32') {
        // Dev fallback on Linux/Mac
        return [
          { processName: 'Code', windowTitle: 'Visual Studio Code', icon: '💻' },
          { processName: 'chrome', windowTitle: 'Google Chrome', icon: '🌐' },
          { processName: 'figma', windowTitle: 'Figma', icon: '🎨' },
        ];
      }
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const ps = `Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object ProcessName, MainWindowTitle | ConvertTo-Json`;
        const { stdout } = await execAsync(
          `powershell -NoProfile -NonInteractive -Command "${ps}"`,
          { timeout: 5000, windowsHide: true }
        );
        if (!stdout.trim()) return [];
        const raw = JSON.parse(stdout.trim());
        const list = Array.isArray(raw) ? raw : [raw];
        return list
          .filter((p: { ProcessName: string; MainWindowTitle: string }) => p.ProcessName && p.MainWindowTitle)
          .map((p: { ProcessName: string; MainWindowTitle: string }) => ({
            processName: p.ProcessName,
            windowTitle: p.MainWindowTitle,
            icon: '🖥️',
          }));
      } catch {
        return [];
      }
    });

    // System
    ipcMain.on(IPC_CHANNELS.MINIMIZE_TO_TRAY, () => {
      this.mainWindow?.hide();
    });

    ipcMain.on(IPC_CHANNELS.SHOW_MAIN_WINDOW, () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
        this.mainWindow.restore();
      }
    });

    ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
      this.mainWindow?.minimize();
    });

    ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    // Close hides to tray — does NOT quit the app
    ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
      this.mainWindow?.hide();
    });
  }
}

// Start the application
new TimeTrackApp();
