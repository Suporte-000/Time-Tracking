import React from 'react';
import { useI18n } from '../i18nContext';
import './TitleBar.css';

interface TitleBarProps {
  isTracking: boolean;
}

const LOCALE_MAP: Record<string, string> = { 'en': 'en-US', 'es': 'es-ES', 'pt-BR': 'pt-BR' };

const TitleBar: React.FC<TitleBarProps> = ({ isTracking }) => {
  const { t, lang } = useI18n();

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString(LOCALE_MAP[lang] || 'pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const [currentTime, setCurrentTime] = React.useState(getCurrentTime());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [lang]);

  return (
    <div className="title-bar">
      <div className="title-bar-left">
        <div className="win-btn btn-red" onClick={() => window.electron?.windowClose?.()} title="Close" />
        <div className="win-btn btn-yellow" onClick={() => window.electron?.windowMinimize?.()} title="Minimize" />
        <div className="win-btn btn-green" onClick={() => window.electron?.windowMaximize?.()} title="Maximize" />
      </div>

      <div className="title-text">{t('titlebar.title')}</div>

      <div className="title-bar-right">
        <div className={`tray-indicator ${isTracking ? 'active' : ''}`}>
          <div className="tray-dot"></div>
          {isTracking ? t('titlebar.tracking') : t('titlebar.paused')}
        </div>
        <div className="tray-time">{currentTime}</div>
      </div>
    </div>
  );
};

export default TitleBar;
