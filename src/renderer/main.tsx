import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PopupApp from './PopupApp';
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
      getSuggestion: (processName: string) => Promise<any>;
      onActiveWindowChanged: (callback: (data: any) => void) => void;
      onUserInactive: (callback: () => void) => void;
      onUserActive: (callback: () => void) => void;
    };
  }
}

// Determine which app to render based on URL hash
const isPopup = window.location.hash === '#popup' || window.location.search.includes('mode=popup');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isPopup ? <PopupApp /> : <App />}
  </React.StrictMode>
);
