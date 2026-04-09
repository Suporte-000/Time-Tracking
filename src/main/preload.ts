import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type { Project, MonitoredApp, SystemConfig, TimeEntry, AppSuggestion, LocalUserConfig, TeamMember, TeamTimeEntry, TeamAuditLog } from '../shared/types';

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

  stopTracking: (entryId: string, status?: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOP_TRACKING, entryId, status);
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

  getRunningApps: (): Promise<{ processName: string; windowTitle: string; icon: string }[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_RUNNING_APPS);
  },

  rendererLog: (level: string, message: string) => {
    ipcRenderer.send(IPC_CHANNELS.RENDERER_LOG, level, message);
  },

  showPopup: (appName: string, processName: string) => {
    ipcRenderer.send(IPC_CHANNELS.SHOW_POPUP, appName, processName);
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

  onTrackingAutoStopped: (callback: (entryId: string) => void) => {
    ipcRenderer.removeAllListeners('tracking-auto-stopped');
    ipcRenderer.on('tracking-auto-stopped', (_: any, entryId: string) => callback(entryId));
  },

  // Cleanup listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // ── Team / PostgreSQL ──────────────────────────────────────────────────────
  getPostgresStatus: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_POSTGRES_STATUS),

  getLocalUser: (): Promise<LocalUserConfig | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_LOCAL_USER),

  saveLocalUser: (config: Omit<LocalUserConfig, 'id'> & { id?: string }): Promise<LocalUserConfig> =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_LOCAL_USER, config),

  getUserColors: (): Promise<string[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_USER_COLORS),

  getTeamMembers: (): Promise<TeamMember[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TEAM_MEMBERS),

  addTeamMember: (member: Omit<TeamMember, 'created_at'>): Promise<TeamMember> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_TEAM_MEMBER, member),

  updateTeamMember: (id: string, updates: Partial<TeamMember>): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_TEAM_MEMBER, id, updates),

  removeTeamMember: (id: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.REMOVE_TEAM_MEMBER, id),

  getTeamEntries: (date: string): Promise<TeamTimeEntry[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TEAM_ENTRIES, date),

  adjustTimeEntry: (data: any): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADJUST_TIME_ENTRY, data),

  getAuditLog: (date: string): Promise<TeamAuditLog[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_AUDIT_LOG, date),

  setManagerPin: (pin: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_MANAGER_PIN, pin),

  verifyManagerPin: (pin: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.VERIFY_MANAGER_PIN, pin),

  hasManagerPin: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.HAS_MANAGER_PIN),

  exportWeeklyReport: (userId: string, userName: string, date?: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_WEEKLY_REPORT, userId, userName, date),

  // Project programs
  getProjectPrograms: (projectId?: string): Promise<any[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECT_PROGRAMS, projectId),

  addProjectProgram: (projectId: string, processName: string, displayName: string): Promise<any> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_PROJECT_PROGRAM, projectId, processName, displayName),

  removeProjectProgram: (id: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.REMOVE_PROJECT_PROGRAM, id),

  pullFromPostgres: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.PULL_FROM_POSTGRES),

  pushToPostgres: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.PUSH_TO_POSTGRES),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', api);
contextBridge.exposeInMainWorld('electronAPI', api); // Keep for backward compatibility

// Type declaration for TypeScript
export type ElectronAPI = typeof api;
