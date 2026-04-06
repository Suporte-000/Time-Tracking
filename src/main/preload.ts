import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type { Project, MonitoredApp, SystemConfig, TimeEntry, AppSuggestion } from '../shared/types';

/**
 * Preload script - Exposes safe IPC methods to renderer process
 * This ensures contextIsolation security while allowing communication
 */

// Define the API that will be exposed to renderer
const api = {
  // Projects
  getProjects: (): Promise<Project[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECTS);
  },

  createProject: (project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CREATE_PROJECT, project);
  },

  updateProject: (id: string, updates: Partial<Project>): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PROJECT, id, updates);
  },

  deleteProject: (id: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DELETE_PROJECT, id);
  },

  importProjects: (filePath: string): Promise<{ imported: number; errors: string[] }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMPORT_PROJECTS, filePath);
  },

  // Monitored Apps
  getMonitoredApps: (): Promise<MonitoredApp[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_MONITORED_APPS);
  },

  updateMonitoredApp: (app: MonitoredApp): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.UPDATE_MONITORED_APP, app);
  },

  // Config
  getConfig: (): Promise<SystemConfig> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_CONFIG);
  },

  updateConfig: (config: Partial<SystemConfig>): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CONFIG, config);
  },

  // Time tracking
  getTimeEntries: (date?: string): Promise<TimeEntry[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_TIME_ENTRIES, date);
  },

  startTracking: (data: {
    userId: string;
    projectId: string;
    appName: string;
    processName: string;
  }): Promise<TimeEntry> => {
    return ipcRenderer.invoke(IPC_CHANNELS.START_TRACKING, data);
  },

  stopTracking: (entryId: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOP_TRACKING, entryId);
  },

  // Suggestions
  getSuggestion: (processName: string): Promise<AppSuggestion | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_SUGGESTION, processName);
  },

  // System
  minimizeToTray: () => {
    ipcRenderer.send(IPC_CHANNELS.MINIMIZE_TO_TRAY);
  },

  showMainWindow: () => {
    ipcRenderer.send(IPC_CHANNELS.SHOW_MAIN_WINDOW);
  },

  windowMinimize: () => {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE);
  },

  windowMaximize: () => {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE);
  },

  windowClose: () => {
    ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE);
  },

  // Event listeners
  onActiveWindowChanged: (callback: (data: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.ACTIVE_WINDOW_CHANGED, (_, data) => callback(data));
  },

  onUserInactive: (callback: () => void) => {
    ipcRenderer.on(IPC_CHANNELS.USER_INACTIVE, () => callback());
  },

  onUserActive: (callback: () => void) => {
    ipcRenderer.on(IPC_CHANNELS.USER_ACTIVE, () => callback());
  },

  // Cleanup listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', api);
contextBridge.exposeInMainWorld('electronAPI', api); // Keep for backward compatibility

// Type declaration for TypeScript
export type ElectronAPI = typeof api;
