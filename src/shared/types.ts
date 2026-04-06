/**
 * Shared TypeScript types for TimeTrack
 * Used by both main (Electron) and renderer (React) processes
 */

export interface Project {
  id: string;
  name: string;
  subproject?: string;
  appName?: string;
  processName?: string;
  color: string;
  createdAt: string;
  isActive: boolean;
}

export interface MonitoredApp {
  id: string;
  name: string;
  processName: string;
  icon: string;
  isEnabled: boolean;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string | null;
  appName: string;
  processName: string;
  startTime: string;
  endTime: string | null;
  duration: number; // in seconds
  status: 'auto' | 'manual' | 'paused';
  isManuallyAdjusted: boolean;
  adjustedBy?: string;
  adjustmentReason?: string;
  syncedToServer: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSuggestion {
  projectId: string;
  projectName: string;
  subproject?: string;
  lastUsed: string;
  useCount: number;
}

export interface SystemConfig {
  inactivityTimeout: number; // minutes
  popupDelay: number; // minutes (default: 2)
  popupAutoClose: number; // seconds
  backupInterval: number; // minutes
  startWithWindows: boolean;
  minimizeToTray: boolean;
  showNotifications: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'developer' | 'manager';
  avatar?: string;
  isActive: boolean;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  targetUserId: string;
  targetUserName: string;
  timeEntryId: string;
  projectName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  timestamp: string;
}

export interface DailySummary {
  date: string;
  totalTime: number; // seconds
  projectCount: number;
  entryCount: number;
  unlinkedTime: number; // seconds
  pauseTime: number; // seconds
}

// IPC Channel names for communication between main and renderer
export const IPC_CHANNELS = {
  // Process detection
  ACTIVE_WINDOW_CHANGED: 'active-window-changed',
  GET_ACTIVE_WINDOW: 'get-active-window',

  // Project management
  GET_PROJECTS: 'get-projects',
  CREATE_PROJECT: 'create-project',
  UPDATE_PROJECT: 'update-project',
  DELETE_PROJECT: 'delete-project',
  IMPORT_PROJECTS: 'import-projects',

  // Time tracking
  START_TRACKING: 'start-tracking',
  STOP_TRACKING: 'stop-tracking',
  GET_TIME_ENTRIES: 'get-time-entries',
  UPDATE_TIME_ENTRY: 'update-time-entry',

  // Suggestions
  GET_SUGGESTION: 'get-suggestion',

  // Config
  GET_CONFIG: 'get-config',
  UPDATE_CONFIG: 'update-config',

  // Apps
  GET_MONITORED_APPS: 'get-monitored-apps',
  UPDATE_MONITORED_APP: 'update-monitored-app',

  // User activity
  USER_INACTIVE: 'user-inactive',
  USER_ACTIVE: 'user-active',

  // Server sync
  SYNC_TO_SERVER: 'sync-to-server',
  SYNC_STATUS: 'sync-status',

  // Audit log
  GET_AUDIT_LOG: 'get-audit-log',

  // System
  MINIMIZE_TO_TRAY: 'minimize-to-tray',
  SHOW_NOTIFICATION: 'show-notification',
  SHOW_MAIN_WINDOW: 'show-main-window',
  GET_RUNNING_APPS: 'get-running-apps',
  WINDOW_MINIMIZE: 'window-minimize',
  WINDOW_MAXIMIZE: 'window-maximize',
  WINDOW_CLOSE: 'window-close',
} as const;

export interface ActiveWindow {
  processName: string;
  windowTitle: string;
  timestamp: string;
}
