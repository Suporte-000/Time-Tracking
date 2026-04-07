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

// ==================== TEAM / MANAGEMENT TYPES ====================

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  goal_hours: number;
  created_at: string;
}

export interface TeamTimeEntry {
  id: string;
  user_id: string;
  user_name: string;
  user_color: string;
  project_id: string | null;
  project_name: string | null;
  app_name: string;
  process_name: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  status: string;
  is_manually_adjusted: boolean;
}

export interface TeamAuditLog {
  id: string;
  manager_name: string;
  target_user_name: string;
  project_name: string;
  old_start_time: string | null;
  old_end_time: string | null;
  old_project: string | null;
  new_start_time: string | null;
  new_end_time: string | null;
  new_project: string | null;
  motive: string;
  created_at: string;
}

export interface LocalUserConfig {
  id: string;
  name: string;
  initials: string;
  color: string;
  goalHours: number;
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
  RENDERER_LOG: 'renderer-log',
  SHOW_POPUP: 'show-popup',

  // Team management (PostgreSQL)
  GET_LOCAL_USER: 'get-local-user',
  SAVE_LOCAL_USER: 'save-local-user',
  GET_TEAM_MEMBERS: 'get-team-members',
  ADD_TEAM_MEMBER: 'add-team-member',
  UPDATE_TEAM_MEMBER: 'update-team-member',
  REMOVE_TEAM_MEMBER: 'remove-team-member',
  GET_TEAM_ENTRIES: 'get-team-entries',
  ADJUST_TIME_ENTRY: 'adjust-time-entry',
  GET_AUDIT_LOG: 'get-audit-log',
  SET_MANAGER_PIN: 'set-manager-pin',
  VERIFY_MANAGER_PIN: 'verify-manager-pin',
  HAS_MANAGER_PIN: 'has-manager-pin',
  EXPORT_WEEKLY_REPORT: 'export-weekly-report',
  GET_POSTGRES_STATUS: 'get-postgres-status',
  GET_USER_COLORS: 'get-user-colors',
} as const;

export interface ActiveWindow {
  processName: string;
  windowTitle: string;
  timestamp: string;
}
