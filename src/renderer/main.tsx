import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PopupApp from './PopupApp';
import { browserApi } from './browserApi';
import { I18nProvider } from './i18nContext';
import './index.css';

// Type augmentation for electron API
declare global {
  interface Window {
    electron: {
      getProjects: () => Promise<any[]>;
      createProject: (project: any) => Promise<any>;
      importProjects: (filePath: string) => Promise<any>;
      getMonitoredApps: () => Promise<any[]>;
      updateMonitoredApp: (app: any) => Promise<any>;
      getConfig: () => Promise<any>;
      updateConfig: (config: any) => Promise<any>;
      getTimeEntries: (date?: string) => Promise<any[]>;
      startTracking: (data: any) => Promise<any>;
      stopTracking: (entryId: string) => Promise<any>;
      deleteTimeEntry: (entryId: string) => Promise<any>;
      getSuggestion: (processName: string) => Promise<any>;
      getRunningApps: () => Promise<{ processName: string; windowTitle: string; icon: string }[]>;
      rendererLog?: (level: string, message: string) => void;
      showPopup?: (appName: string, processName: string) => void;
      onActiveWindowChanged: (callback: (data: any) => void) => void;
      onUserInactive: (callback: () => void) => void;
      onUserActive: (callback: () => void) => void;
      minimizeToTray?: () => void;
      showMainWindow?: () => void;
      windowMinimize?: () => void;
      windowMaximize?: () => void;
      windowClose?: () => void;
      removeAllListeners?: (channel: string) => void;
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
