import React, { useState, useEffect, useRef } from 'react';
import type { MonitoredApp, SystemConfig } from '../../shared/types';
import { useI18n } from '../i18nContext';

const APP_ICONS: Record<string, string> = {
  'visual studio code': '💻', 'code': '💻',
  'google chrome': '🌐', 'chrome': '🌐',
  'figma': '🎨',
  'microsoft teams': '💬', 'teams': '💬',
  'notion': '📝',
};
const getIcon = (name: string) => APP_ICONS[name.toLowerCase()] ?? '🖥️';

/* ── Toggle ── */
const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
  <div onClick={onChange} style={{
    width: '44px', height: '24px', borderRadius: '12px',
    background: value ? '#1FB8A0' : '#2D3748',
    position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
  }}>
    <div style={{
      width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
      position: 'absolute', top: '3px', left: value ? '23px' : '3px', transition: 'left 0.2s',
    }} />
  </div>
);

/* ── Editable value badge ── */
const EditableBadge: React.FC<{
  value: number;
  unit: string;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}> = ({ value, unit, min = 1, max = 999, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(String(value)); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= min && n <= max) onChange(n);
    else setDraft(String(value));
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input ref={inputRef} type="number" value={draft} min={min} max={max}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); } }}
          style={{ width: '52px', padding: '5px 8px', background: '#0D1117', border: '1px solid #1FB8A0', borderRadius: '6px', color: '#E2E8F0', fontSize: '13px', fontWeight: '600', outline: 'none', textAlign: 'center' }} />
        <span style={{ fontSize: '12px', color: '#718096' }}>{unit}</span>
      </div>
    );
  }

  return (
    <div onClick={() => setEditing(true)} title="Click to edit"
      style={{ padding: '6px 14px', background: '#0D1117', border: '1px solid #1E2A3A', borderRadius: '8px', color: '#E2E8F0', fontSize: '13px', fontWeight: '600', minWidth: '70px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#1FB8A0'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2A3A'; }}>
      {value} {unit}
    </div>
  );
};

/* ── Main component ── */
const Configuration: React.FC = () => {
  const { t } = useI18n();
  const [apps, setApps] = useState<MonitoredApp[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [showAddApp, setShowAddApp] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppProcess, setNewAppProcess] = useState('');

  useEffect(() => { loadData(); }, []);

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

  const handleToggleApp = async (app: MonitoredApp) => {
    const updated = { ...app, isEnabled: !app.isEnabled };
    setApps(prev => prev.map(a => a.id === app.id ? updated : a));
    await window.electron.updateMonitoredApp(updated);
  };

  const handleConfigToggle = async (key: 'startWithWindows' | 'minimizeToTray' | 'showNotifications') => {
    if (!config) return;
    const updated = { ...config, [key]: !config[key] };
    setConfig(updated);
    await window.electron.updateConfig(updated);
  };

  const handleConfigNumber = async (key: keyof SystemConfig, val: number) => {
    if (!config) return;
    const updated = { ...config, [key]: val };
    setConfig(updated);
    await window.electron.updateConfig(updated);
  };

  const handleAddApp = async () => {
    if (!newAppName.trim() || !newAppProcess.trim()) return;
    const newApp: MonitoredApp = {
      id: `app-${Date.now()}`,
      name: newAppName.trim(),
      processName: newAppProcess.trim(),
      icon: getIcon(newAppName.trim()),
      isEnabled: true,
      createdAt: new Date().toISOString(),
    };
    await window.electron.updateMonitoredApp(newApp);
    setApps(prev => [...prev, newApp]);
    setNewAppName(''); setNewAppProcess('');
    setShowAddApp(false);
  };

  return (
    <div style={{ padding: '24px 28px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#E2E8F0' }}>{t('config.title')}</h2>
        <div style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>{t('config.subtitle')}</div>
      </div>

      {/* Add App Modal */}
      {showAddApp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#161C26', borderRadius: '14px', padding: '24px', width: '360px', border: '1px solid #1E2A3A' }}>
            <h3 style={{ margin: '0 0 18px', color: '#E2E8F0', fontSize: '16px' }}>Add Monitored App</h3>
            <label style={{ display: 'block', fontSize: '12px', color: '#718096', marginBottom: '6px' }}>App name</label>
            <input value={newAppName} onChange={e => setNewAppName(e.target.value)} placeholder="e.g. Slack"
              style={{ width: '100%', padding: '9px 12px', background: '#0D1117', border: '1px solid #1E2A3A', borderRadius: '8px', color: '#E2E8F0', fontSize: '14px', outline: 'none', marginBottom: '14px' }} autoFocus />
            <label style={{ display: 'block', fontSize: '12px', color: '#718096', marginBottom: '6px' }}>Process name</label>
            <input value={newAppProcess} onChange={e => setNewAppProcess(e.target.value)} placeholder="e.g. slack"
              style={{ width: '100%', padding: '9px 12px', background: '#0D1117', border: '1px solid #1E2A3A', borderRadius: '8px', color: '#E2E8F0', fontSize: '14px', outline: 'none', marginBottom: '20px' }}
              onKeyDown={e => { if (e.key === 'Enter') handleAddApp(); }} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddApp(false)}
                style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #1E2A3A', borderRadius: '8px', color: '#A0AEC0', cursor: 'pointer', fontSize: '13px' }}>
                {t('common.cancel')}
              </button>
              <button onClick={handleAddApp} disabled={!newAppName.trim() || !newAppProcess.trim()}
                style={{ padding: '9px 18px', background: newAppName.trim() && newAppProcess.trim() ? '#1FB8A0' : '#1E2A3A', border: 'none', borderRadius: '8px', color: newAppName.trim() && newAppProcess.trim() ? '#fff' : '#4A5568', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

        {/* Left — Monitored Apps */}
        <div style={{ background: '#161C26', borderRadius: '14px', border: '1px solid #1E2A3A', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E2A3A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#718096' }}>{t('config.monitoredApps')}</span>
            <button onClick={() => setShowAddApp(true)}
              style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#1FB8A0', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
          </div>
          <div>
            {apps.map(app => (
              <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 20px', borderBottom: '1px solid #111722', transition: 'background 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#111722'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#0D1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  {getIcon(app.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#E2E8F0' }}>{app.name}</div>
                  <div style={{ fontSize: '12px', color: '#4A5568', marginTop: '1px' }}>{app.processName}.exe</div>
                </div>
                <Toggle value={app.isEnabled} onChange={() => handleToggleApp(app)} />
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* System Parameters */}
          {config && (
            <div style={{ background: '#161C26', borderRadius: '14px', border: '1px solid #1E2A3A', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E2A3A' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#718096' }}>{t('config.systemParams')}</span>
              </div>
              <div>
                {[
                  { label: t('config.inactivity'), key: 'inactivityTimeout' as keyof SystemConfig, unit: t('config.minutes'), min: 1, max: 60 },
                  { label: t('config.popupDelay'),  key: 'popupDelay'         as keyof SystemConfig, unit: t('config.minutes'), min: 1, max: 60 },
                  { label: t('config.autoClose'),   key: 'popupAutoClose'     as keyof SystemConfig, unit: t('config.seconds'), min: 5, max: 300 },
                  { label: t('config.backup'),      key: 'backupInterval'     as keyof SystemConfig, unit: 'h', min: 1, max: 24,
                    displayVal: Math.round((config.backupInterval as number) / 60) || 1,
                    saveVal: (v: number) => v * 60 },
                ].map(row => {
                  const rawVal = config[row.key] as number;
                  const displayVal = row.displayVal ?? rawVal;
                  return (
                    <div key={String(row.key)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #111722' }}>
                      <span style={{ fontSize: '14px', color: '#A0AEC0' }}>{row.label}</span>
                      <EditableBadge value={displayVal} unit={row.unit} min={row.min} max={row.max}
                        onChange={v => handleConfigNumber(row.key, row.saveVal ? row.saveVal(v) : v)} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* System Toggles */}
          {config && (
            <div style={{ background: '#161C26', borderRadius: '14px', border: '1px solid #1E2A3A', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E2A3A' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#718096' }}>{t('config.system')}</span>
              </div>
              <div>
                {[
                  { label: t('config.startWithWindows'), key: 'startWithWindows'  as const },
                  { label: t('config.minimizeToTray'),   key: 'minimizeToTray'    as const },
                  { label: t('config.notifications'),    key: 'showNotifications' as const },
                ].map(row => (
                  <div key={row.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #111722' }}>
                    <span style={{ fontSize: '14px', color: '#A0AEC0' }}>{row.label}</span>
                    <Toggle value={!!config[row.key]} onChange={() => handleConfigToggle(row.key)} />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Configuration;
