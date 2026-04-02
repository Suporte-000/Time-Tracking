import React, { useState, useEffect } from 'react';
import type { MonitoredApp, SystemConfig } from '../../shared/types';

const Configuration: React.FC = () => {
  const [apps, setApps] = useState<MonitoredApp[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (window.electronAPI) {
      const [appsData, configData] = await Promise.all([
        window.electronAPI.getMonitoredApps(),
        window.electronAPI.getConfig(),
      ]);
      setApps(appsData);
      setConfig(configData);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Configurações</h2>
      <p style={{ color: '#718096', marginTop: '8px' }}>
        Apps monitorados: {apps.length}
      </p>
      {config && (
        <div style={{ marginTop: '20px', padding: '16px', background: '#161C26', borderRadius: '10px' }}>
          <p style={{ fontSize: '13px', color: '#A0AEC0' }}>
            ⏱️ Tempo de inatividade: {config.inactivityTimeout} minutos
          </p>
          <p style={{ fontSize: '13px', color: '#A0AEC0', marginTop: '8px' }}>
            ⏰ Atraso do popup: {config.popupDelay} minutos
          </p>
        </div>
      )}
    </div>
  );
};

export default Configuration;
