import React, { useState, useEffect } from 'react';
import type { MonitoredApp, SystemConfig } from '../../shared/types';
import { useI18n } from '../i18nContext';

const Configuration: React.FC = () => {
  const { t } = useI18n();
  const [apps, setApps] = useState<MonitoredApp[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (window.electron) {
      const [appsData, configData] = await Promise.all([
        window.electron.getMonitoredApps(),
        window.electron.getConfig(),
      ]);
      setApps(appsData);
      setConfig(configData);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>{t('config.title')}</h2>
      <p style={{ color: '#718096', marginTop: '8px' }}>
        {t('config.monitoredApps')}: {apps.length}
      </p>
      {config && (
        <div style={{ marginTop: '20px', padding: '16px', background: '#161C26', borderRadius: '10px' }}>
          <p style={{ fontSize: '13px', color: '#A0AEC0' }}>
            ⏱️ {t('config.inactivity')}: {config.inactivityTimeout} {t('config.minutes')}
          </p>
          <p style={{ fontSize: '13px', color: '#A0AEC0', marginTop: '8px' }}>
            ⏰ {t('config.popupDelay')}: {config.popupDelay} {t('config.minutes')}
          </p>
        </div>
      )}
    </div>
  );
};

export default Configuration;
