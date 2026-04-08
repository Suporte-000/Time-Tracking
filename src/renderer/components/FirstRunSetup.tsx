import React, { useState } from 'react';
import { useI18n } from '../i18nContext';


const COLORS = [
  '#14919B', '#1FB8A0', '#0B5563', '#8B5CF6',
  '#EC4899', '#F59E0B', '#10B981', '#3B82F6',
];

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().substring(0, 2);
}

interface Props {
  onComplete: (user: { name: string; initials: string; color: string }) => void;
}

const FirstRunSetup: React.FC<Props> = ({ onComplete }) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { setError(t('firstrun.nameRequired')); return; }
    onComplete({ name: name.trim(), initials: getInitials(name), color });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: '#161C26', border: '1px solid #1E2530', borderRadius: '16px',
        padding: '36px 40px', width: '380px',
      }}>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#E8F6F5', marginBottom: '6px' }}>
          {t('firstrun.title')}
        </div>
        <div style={{ fontSize: '13px', color: '#718096', marginBottom: '28px' }}>
          {t('firstrun.subtitle')}
        </div>

        <label style={{ fontSize: '11px', fontWeight: 600, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {t('firstrun.yourName')}
        </label>
        <input
          autoFocus
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder={t('firstrun.namePlaceholder')}
          style={{
            display: 'block', width: '100%', marginTop: '6px', marginBottom: '20px',
            padding: '9px 12px', background: '#0A0E14', border: '1px solid #1E2530',
            borderRadius: '8px', color: '#E2E8F0', fontSize: '14px', outline: 'none',
          }}
        />

        <label style={{ fontSize: '11px', fontWeight: 600, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {t('firstrun.profileColor')}
        </label>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {COLORS.map(c => (
            <div
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: '32px', height: '32px', borderRadius: '8px', background: c, cursor: 'pointer',
                border: color === c ? '3px solid #E8F6F5' : '3px solid transparent',
                transition: 'border 0.15s',
              }}
            />
          ))}
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '12px', background: '#0A0E14', borderRadius: '10px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '14px', color: 'white',
          }}>
            {name ? getInitials(name) : '?'}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#E2E8F0' }}>{name || t('firstrun.yourName')}</div>
            <div style={{ fontSize: '11px', color: '#4A5568' }}>{t('firstrun.member')}</div>
          </div>
        </div>

        {error && <div style={{ color: '#FC8181', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}

        <button
          onClick={handleSubmit}
          style={{
            width: '100%', padding: '11px', background: '#1FB8A0', border: 'none',
            borderRadius: '8px', color: '#0B5563', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
          }}
        >
          {t('firstrun.start')}
        </button>
      </div>
    </div>
  );
};

export default FirstRunSetup;
