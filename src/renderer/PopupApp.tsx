import React, { useEffect, useState } from 'react';
import ProjectPopup from './components/ProjectPopup';
import { useI18n } from './i18nContext';

const PopupApp: React.FC = () => {
  const { t } = useI18n();
  const [appData, setAppData] = useState<{
    appName: string;
    processName: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appName = params.get('appName') || t('popupApp.unknownApp');
    const processName = params.get('processName') || '';
    setAppData({ appName, processName });
  }, []);

  const handleSelect = async (projectId: string, appName: string, processName: string) => {
    try {
      await window.electron.startTracking({
        projectId,
        appName,
        processName,
      });
      // Show main window so user can see the active timer and stop it
      window.electron.showMainWindow?.();
      window.close();
    } catch (error) {
      console.error('Failed to start tracking:', error);
    }
  };

  const handleDismiss = () => { window.close(); };

  if (!appData) return <div>{t('dashboard.loading')}</div>;

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'transparent' }}>
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
