import React, { useState } from 'react';
import ProjectPopup from '../components/ProjectPopup';
import { UI_COLORS } from '../../shared/colors';

const PopupDemo: React.FC = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [lastTracked, setLastTracked] = useState<{ projectId: string; appName: string } | null>(null);

  const handleSelect = async (projectId: string) => {
    try {
      await window.electron.startTracking({
        userId: 'browser-user',
        projectId,
        appName: 'Browser (Manual)',
        processName: 'browser',
      });
      setLastTracked({ projectId, appName: 'Browser (Manual)' });
      setShowPopup(false);
    } catch (error) {
      console.error('Failed to start tracking:', error);
    }
  };

  const handleDismiss = () => {
    setShowPopup(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: UI_COLORS.text.primary, margin: '0 0 8px 0' }}>Popup Demo</h2>
      <p style={{ color: UI_COLORS.text.muted, marginTop: '0' }}>
        Simule o popup de vinculação de projeto que aparece ao detectar um app monitorado.
      </p>

      <div style={{
        marginTop: '20px',
        padding: '20px',
        background: UI_COLORS.bg.card,
        borderRadius: '10px',
        border: `1px solid ${UI_COLORS.border.primary}`,
      }}>
        <p style={{ fontSize: '14px', color: UI_COLORS.text.secondary, margin: '0 0 16px 0' }}>
          Clique no botão abaixo para abrir o popup e vincular seu tempo a um projeto.
        </p>
        <button
          onClick={() => setShowPopup(true)}
          style={{
            padding: '12px 24px',
            background: UI_COLORS.brand.accent,
            border: 'none',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Abrir Popup de Vinculação
        </button>

        {lastTracked && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: `${UI_COLORS.status.success}15`,
            borderRadius: '8px',
            border: `1px solid ${UI_COLORS.status.success}40`,
          }}>
            <span style={{ color: UI_COLORS.status.success, fontSize: '14px' }}>
              ✓ Rastreamento iniciado com sucesso!
            </span>
          </div>
        )}
      </div>

      {/* Popup Modal */}
      {showPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <ProjectPopup
            appName="Browser (Manual)"
            processName="browser"
            onSelect={handleSelect}
            onDismiss={handleDismiss}
          />
        </div>
      )}
    </div>
  );
};

export default PopupDemo;
