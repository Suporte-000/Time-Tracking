import React from 'react';
import './TitleBar.css';

interface TitleBarProps {
  isTracking: boolean;
}

const TitleBar: React.FC<TitleBarProps> = ({ isTracking }) => {
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const [currentTime, setCurrentTime] = React.useState(getCurrentTime());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="title-bar">
      <div className="title-bar-left">
        <div className="win-btn btn-red"></div>
        <div className="win-btn btn-yellow"></div>
        <div className="win-btn btn-green"></div>
      </div>

      <div className="title-text">TimeTrack — Controle de Horas por Projeto</div>

      <div className="title-bar-right">
        <div className={`tray-indicator ${isTracking ? 'active' : ''}`}>
          <div className="tray-dot"></div>
          {isTracking ? 'Rastreando' : 'Pausado'}
        </div>
        <div className="tray-time">{currentTime}</div>
      </div>
    </div>
  );
};

export default TitleBar;
