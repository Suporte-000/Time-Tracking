import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PopupApp from './PopupApp';
import { browserApi } from './browserApi';
import { I18nProvider } from './i18nContext';
import './index.css';

// Type augmentation for electron API — mirrors preload.ts api object
declare global {
  interface Window {
    electron: {
      // Projects
      getProjects: () => Promise<any[]>;
      createProject: (project: any) => Promise<any>;
      updateProject: (id: string, updates: any) => Promise<boolean>;
      deleteProject: (id: string) => Promise<boolean>;
      importProjects: (filePath: string) => Promise<any>;
      // Monitored apps
      getMonitoredApps: () => Promise<any[]>;
      updateMonitoredApp: (app: any) => Promise<any>;
      // Config
      getConfig: () => Promise<any>;
      updateConfig: (config: any) => Promise<any>;
      // Time tracking
      getTimeEntries: (date?: string) => Promise<any[]>;
      startTracking: (data: any) => Promise<any>;
      stopTracking: (entryId: string, status?: string) => Promise<any>;
      getSuggestion: (processName: string) => Promise<any>;
      getRunningApps: () => Promise<{ processName: string; windowTitle: string; icon: string }[]>;
      // System
      rendererLog?: (level: string, message: string) => void;
      showPopup?: (appName: string, processName: string) => void;
      onActiveWindowChanged: (callback: (data: any) => void) => void;
      onUserInactive: (callback: () => void) => void;
      onUserActive: (callback: () => void) => void;
      onTrackingAutoStopped?: (callback: (entryId: string) => void) => void;
      minimizeToTray?: () => void;
      showMainWindow?: () => void;
      windowMinimize?: () => void;
      windowMaximize?: () => void;
      windowClose?: () => void;
      removeAllListeners?: (channel: string) => void;
      // Team / PostgreSQL
      getPostgresStatus: () => Promise<boolean>;
      getLocalUser: () => Promise<any>;
      saveLocalUser: (config: any) => Promise<any>;
      getUserColors: () => Promise<string[]>;
      getTeamMembers: () => Promise<any[]>;
      addTeamMember: (member: any) => Promise<any>;
      updateTeamMember: (id: string, updates: any) => Promise<boolean>;
      removeTeamMember: (id: string) => Promise<boolean>;
      getTeamEntries: (date: string) => Promise<any[]>;
      adjustTimeEntry: (data: any) => Promise<boolean>;
      getAuditLog: (date: string) => Promise<any[]>;
      setManagerPin: (pin: string) => Promise<boolean>;
      verifyManagerPin: (pin: string) => Promise<boolean>;
      hasManagerPin: () => Promise<boolean>;
      exportWeeklyReport: (userId: string, userName: string, date?: string) => Promise<string | null>;
      // Project programs
      getProjectPrograms: (projectId?: string) => Promise<any[]>;
      addProjectProgram: (projectId: string | null, processName: string, displayName: string) => Promise<any>;
      removeProjectProgram: (id: string) => Promise<boolean>;
      pullFromPostgres: () => Promise<boolean>;
      pushToPostgres: () => Promise<boolean>;
    };
  }
}

// Fallback to browser localStorage API when Electron is not available
if (!window.electron) {
  window.electron = browserApi as any;
}

// Determine which app to render based on URL hash
const isPopup = window.location.hash === '#popup' || window.location.search.includes('mode=popup');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      {isPopup ? <PopupApp /> : <App />}
    </I18nProvider>
  </React.StrictMode>
);
