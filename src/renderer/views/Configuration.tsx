import React, { useState, useEffect, useRef } from 'react';
import type { SystemConfig } from '../../shared/types';
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
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (window.electron) {
      const configData = await window.electron.getConfig();
      setConfig(configData);
    }
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

  return (
    <div style={{ padding: '24px 28px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#E2E8F0' }}>{t('config.title')}</h2>
        <div style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>{t('config.subtitle')}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* System Parameters */}
          {config && (
            <div style={{ background: '#161C26', borderRadius: '14px', border: '1px solid #1E2A3A', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E2A3A' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#718096' }}>{t('config.systemParams')}</span>
              </div>
              <div>
                {[
                  { label: t('config.inactivity'),  key: 'inactivityTimeout' as const, unit: t('config.minutes'), min: 1,  max: 60  },
                  { label: t('config.popupDelay'),  key: 'popupDelay'        as const, unit: t('config.minutes'), min: 1,  max: 60  },
                  { label: t('config.autoClose'),   key: 'popupAutoClose'    as const, unit: t('config.seconds'), min: 10, max: 300 },
                  { label: t('config.backup'),      key: 'backupInterval'    as const, unit: t('config.hour'),    min: 1,  max: 24  },
                ].map(row => (
                  <div key={row.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #111722' }}>
                    <span style={{ fontSize: '14px', color: '#A0AEC0' }}>{row.label}</span>
                    <EditableBadge
                      value={row.key === 'backupInterval' ? Math.round((config[row.key] as number) / 60) : (config[row.key] as number)}
                      unit={row.unit}
                      min={row.min}
                      max={row.max}
                      onChange={v => handleConfigNumber(row.key, row.key === 'backupInterval' ? v * 60 : v)}
                    />
                  </div>
                ))}
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
