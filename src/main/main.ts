import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { WindowMonitor } from './services/windowMonitor';
import { ActivityMonitor } from './services/activityMonitor';
import { DatabaseService } from './services/database';
import { IPC_CHANNELS } from '../shared/types';

class TimeTrackApp {
  private mainWindow: BrowserWindow | null = null;
  private popupWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private windowMonitor: WindowMonitor | null = null;
  private activityMonitor: ActivityMonitor | null = null;
  private db: DatabaseService | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    // Handle app ready
    await app.whenReady();

    // Initialize database
    this.db = new DatabaseService();

    // Create main window
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
      this.mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private createTray() {
    // Create a simple tray icon (placeholder - will be replaced with actual icon)
    const icon = nativeImage.createEmpty();
    this.tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'TimeTrack',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Abrir',
        click: () => {
          this.mainWindow?.show();
        },
      },
      {
        label: 'Rastreando',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('TimeTrack - Rastreamento Ativo');

    this.tray.on('click', () => {
      this.mainWindow?.show();
    });
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

    // Initialize activity monitor (keyboard/mouse hooks)
    this.activityMonitor = new ActivityMonitor();

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
    // Check if this app is monitored
    const monitoredApp = this.db?.getMonitoredAppByProcess(activeWindow.processName);

    if (monitoredApp && monitoredApp.isEnabled) {
      // Get config to check popup delay
      const config = this.db?.getConfig();
      const popupDelay = (config?.popupDelay || 2) * 60 * 1000; // Convert to milliseconds

      // TODO: Implement delayed popup logic (wait for continuous use)
      // For now, just log
      console.log(`Monitored app detected: ${monitoredApp.name}, will show popup after ${popupDelay}ms`);
    }
  }

  private createPopupWindow(appName: string, processName: string) {
    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      this.popupWindow.focus();
      return;
    }

    this.popupWindow = new BrowserWindow({
      width: 320,
      height: 420,
      resizable: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    // Load popup view
    if (process.env.NODE_ENV === 'development') {
      this.popupWindow.loadURL('http://localhost:5173#popup');
    } else {
      this.popupWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'popup' });
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

    // System
    ipcMain.on(IPC_CHANNELS.MINIMIZE_TO_TRAY, () => {
      this.mainWindow?.hide();
    });
  }
}

// Start the application
new TimeTrackApp();
