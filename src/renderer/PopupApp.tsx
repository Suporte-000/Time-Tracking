import React, { useEffect, useState } from 'react';
import ProjectPopup from './components/ProjectPopup';

const PopupApp: React.FC = () => {
  const [appData, setAppData] = useState<{
    appName: string;
    processName: string;
  } | null>(null);

  useEffect(() => {
    // Get popup data from query params or window name
    const params = new URLSearchParams(window.location.search);
    const appName = params.get('appName') || 'Aplicativo Desconhecido';
    const processName = params.get('processName') || '';

    setAppData({ appName, processName });
  }, []);

  const handleSelect = async (projectId: string) => {
    if (!appData) return;

    try {
      await window.electron.startTracking({
        projectId,
        appName: appData.appName,
        processName: appData.processName,
      });

      // Close popup window
      window.close();
    } catch (error) {
      console.error('Failed to start tracking:', error);
    }
  };

  const handleDismiss = () => {
    window.close();
  };

  if (!appData) {
    return <div>Carregando...</div>;
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'transparent',
    }}>
      <ProjectPopup
        appName={appData.appName}
        processName={appData.processName}
        onSelect={handleSelect}
        onDismiss={handleDismiss}
      />
    </div>
  );
};

export default PopupApp;
