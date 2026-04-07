import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './views/Dashboard';
import PopupDemo from './views/PopupDemo';
import History from './views/History';
import Configuration from './views/Configuration';
import Management from './views/Management';
import Sidebar from './components/Sidebar';
import TitleBar from './components/TitleBar';
import FirstRunSetup from './components/FirstRunSetup';
type View = 'dashboard' | 'popup' | 'history' | 'config' | 'management';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isTracking, setIsTracking] = useState(true);
  const [firstRun, setFirstRun] = useState(false);

  useEffect(() => {
    window.electron.getLocalUser?.().then(u => {
      if (!u) setFirstRun(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Listen for active window changes
    if (window.electronAPI) {
      window.electronAPI.onActiveWindowChanged((data) => {
        console.log('Active window changed:', data);
      });

      window.electronAPI.onUserInactive(() => {
        console.log('User inactive');
        setIsTracking(false);
      });

      window.electronAPI.onUserActive(() => {
        console.log('User active');
        setIsTracking(true);
      });
    }

    return () => {
      // Cleanup listeners
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('active-window-changed');
        window.electronAPI.removeAllListeners('user-inactive');
        window.electronAPI.removeAllListeners('user-active');
      }
    };
  }, []);

  return (
    <div className="app-container">
      {firstRun && (
        <FirstRunSetup onComplete={async (user) => {
          await window.electron.saveLocalUser?.(user);
          setFirstRun(false);
        }} />
      )}
      <TitleBar isTracking={isTracking} />
      <div className="app-body">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />

        <main className="main-content">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'popup' && <PopupDemo />}
          {currentView === 'history' && <History />}
          {currentView === 'config' && <Configuration />}
          {currentView === 'management' && <Management />}
        </main>
      </div>
    </div>
  );
}

export default App;
