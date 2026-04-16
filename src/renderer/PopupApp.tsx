import React, { useEffect, useState, useRef, useCallback } from 'react';
import ProjectPopup from './components/ProjectPopup';
import { useI18n } from './i18nContext';

const PopupApp: React.FC = () => {
  const { t } = useI18n();
  const [appData, setAppData] = useState<{
    appName: string;
    processName: string;
    switchedFrom?: string;
  } | null>(null);
  const [userId, setUserId] = useState<string>('');
  const cardRef = useRef<HTMLDivElement>(null);

  // Measure card height and tell main process to resize window
  const sendResize = useCallback(() => {
    if (cardRef.current) {
      const h = cardRef.current.getBoundingClientRect().height;
      window.electron.popupResize?.(Math.ceil(h));
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appName = params.get('appName') || t('popupApp.unknownApp');
    const processName = params.get('processName') || '';
    const switchedFrom = params.get('switchedFrom') || undefined;
    setAppData({ appName, processName, switchedFrom });

    window.electron.getLocalUser().then(user => {
      if (user?.id) setUserId(user.id);
    }).catch(() => {});
  }, []);

  // Re-measure whenever content changes (step change, data load)
  useEffect(() => {
    if (!appData) return;
    const id = requestAnimationFrame(() => sendResize());
    // Also observe size changes (list items loading)
    const obs = new ResizeObserver(() => sendResize());
    if (cardRef.current) obs.observe(cardRef.current);
    return () => { cancelAnimationFrame(id); obs.disconnect(); };
  }, [appData, sendResize]);

  const handleSelect = async (projectId: string, appName: string, processName: string) => {
    try {
      await window.electron.startTracking({
        userId,
        projectId,
        appName,
        processName,
      });
      window.close();
    } catch (error) {
      console.error('Failed to start tracking:', error);
    }
  };

  const handleDismiss = () => { window.close(); };

  if (!appData) return <div>{t('dashboard.loading')}</div>;

  return (
    <div style={{ width: '400px', height: '100vh', background: 'transparent' }}>
      <div ref={cardRef} style={{ width: '400px' }}>
      <ProjectPopup
        appName={appData.appName}
        processName={appData.processName}
        switchedFrom={appData.switchedFrom}
        onSelect={handleSelect}
        onDismiss={handleDismiss}
      />
      </div>
    </div>
  );
};

export default PopupApp;
