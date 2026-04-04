import React from 'react';
import { useI18n } from '../i18nContext';
import { LANGUAGE_LABELS, type Language } from '../../shared/i18n';
import './Sidebar.css';

type View = 'dashboard' | 'popup' | 'history' | 'config' | 'management';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        Time<span>Track</span>
      </div>

      <div className="sidebar-section">{t('sidebar.main')}</div>
      <div
        className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
        onClick={() => onViewChange('dashboard')}
      >
        <span className="nav-icon">📊</span> {t('sidebar.dashboard')}
      </div>
      <div
        className={`nav-item ${currentView === 'popup' ? 'active' : ''}`}
        onClick={() => onViewChange('popup')}
      >
        <span className="nav-icon">💬</span> {t('sidebar.popupDemo')}
        <span className="nav-badge">!</span>
      </div>
      <div
        className={`nav-item ${currentView === 'history' ? 'active' : ''}`}
        onClick={() => onViewChange('history')}
      >
        <span className="nav-icon">📋</span> {t('sidebar.history')}
      </div>

      <div className="sidebar-section">{t('sidebar.system')}</div>
      <div
        className={`nav-item ${currentView === 'config' ? 'active' : ''}`}
        onClick={() => onViewChange('config')}
      >
        <span className="nav-icon">⚙️</span> {t('sidebar.settings')}
      </div>
      <div
        className={`nav-item ${currentView === 'management' ? 'active' : ''}`}
        onClick={() => onViewChange('management')}
      >
        <span className="nav-icon">👔</span> {t('sidebar.management')}
      </div>

      {/* Language selector */}
      <div style={{ padding: '12px 16px', marginTop: '8px' }}>
        <label style={{ display: 'block', fontSize: '10px', color: '#4A5568', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
          {t('config.language')}
        </label>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Language)}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: '#0A0E14',
            border: '1px solid #1A1F2B',
            borderRadius: '6px',
            color: '#E2E8F0',
            fontSize: '12px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {(Object.keys(LANGUAGE_LABELS) as Language[]).map(l => (
            <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>
          ))}
        </select>
      </div>

      <div className="sidebar-bottom">
        <div className="user-row">
          <div className="user-avatar">RC</div>
          <div className="user-info">
            <div className="user-name">Rodrigo C.</div>
            <div className="user-role">{t('sidebar.developer')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
