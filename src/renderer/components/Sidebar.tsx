import React from 'react';
import './Sidebar.css';

type View = 'dashboard' | 'popup' | 'history' | 'config' | 'management';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        Time<span>Track</span>
      </div>

      <div className="sidebar-section">Principal</div>
      <div
        className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
        onClick={() => onViewChange('dashboard')}
      >
        <span className="nav-icon">📊</span> Dashboard
      </div>
      <div
        className={`nav-item ${currentView === 'popup' ? 'active' : ''}`}
        onClick={() => onViewChange('popup')}
      >
        <span className="nav-icon">💬</span> Popup Demo
        <span className="nav-badge">!</span>
      </div>
      <div
        className={`nav-item ${currentView === 'history' ? 'active' : ''}`}
        onClick={() => onViewChange('history')}
      >
        <span className="nav-icon">📋</span> Histórico
      </div>

      <div className="sidebar-section">Sistema</div>
      <div
        className={`nav-item ${currentView === 'config' ? 'active' : ''}`}
        onClick={() => onViewChange('config')}
      >
        <span className="nav-icon">⚙️</span> Configurações
      </div>
      <div
        className={`nav-item ${currentView === 'management' ? 'active' : ''}`}
        onClick={() => onViewChange('management')}
      >
        <span className="nav-icon">👔</span> Gestão
      </div>

      <div className="sidebar-bottom">
        <div className="user-row">
          <div className="user-avatar">RC</div>
          <div className="user-info">
            <div className="user-name">Rodrigo C.</div>
            <div className="user-role">Desenvolvedor</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
