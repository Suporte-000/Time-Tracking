import React, { useState, useEffect, useRef } from 'react';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const ManagerPinModal: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleVerify = async () => {
    if (!pin) { setError('Enter password.'); return; }
    setLoading(true);
    try {
      const ok = await window.electron.verifyManagerPin(pin);
      if (ok) { onSuccess(); }
      else { setError('Incorrect password.'); setPin(''); }
    } catch { setError('Connection error.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: '#161C26', border: '1px solid #1E2530', borderRadius: '14px',
        padding: '32px 36px', width: '320px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '28px', marginBottom: '12px' }}>🔒</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#E8F6F5', marginBottom: '6px' }}>
          Manager Access
        </div>
        <div style={{ fontSize: '12px', color: '#718096', marginBottom: '24px' }}>
          Enter the administrator password to continue.
        </div>

        <input
          ref={inputRef}
          type="password"
          value={pin}
          onChange={e => { setPin(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleVerify()}
          placeholder="Password"
          maxLength={20}
          style={{
            width: '100%', padding: '10px', textAlign: 'center', letterSpacing: '4px',
            background: '#0A0E14', border: `1px solid ${error ? '#FC8181' : '#1E2530'}`,
            borderRadius: '8px', color: '#E2E8F0', fontSize: '18px', outline: 'none',
            marginBottom: '8px',
          }}
        />
        {error && <div style={{ color: '#FC8181', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}
        {!error && <div style={{ height: '20px', marginBottom: '12px' }} />}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '9px', background: 'transparent', border: '1px solid #1E2530',
              borderRadius: '8px', color: '#718096', fontSize: '13px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleVerify}
            disabled={loading}
            style={{
              flex: 2, padding: '9px', background: '#1FB8A0', border: 'none',
              borderRadius: '8px', color: '#0B5563', fontWeight: 700, fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '...' : 'Enter'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagerPinModal;
