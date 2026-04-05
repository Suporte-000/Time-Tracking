import React, { useState, useEffect } from 'react';
import ProjectPopup from '../components/ProjectPopup';
import { UI_COLORS } from '../../shared/colors';
import { useI18n } from '../i18nContext';
import type { Project, TimeEntry } from '../../shared/types';

const PopupDemo: React.FC = () => {
  const { t } = useI18n();
  const [showPopup, setShowPopup] = useState(false);
  const [lastTracked, setLastTracked] = useState<{ projectId: string; appName: string } | null>(null);
  const [activeProjectIds, setActiveProjectIds] = useState<Set<string>>(new Set());
  const [allTracking, setAllTracking] = useState(false);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split('T')[0];
      const [projects, entries] = await Promise.all([
        window.electron.getProjects(),
        window.electron.getTimeEntries(today),
      ]);
      const active = new Set<string>((entries as TimeEntry[]).filter((e: TimeEntry) => !e.endTime).map((e: TimeEntry) => e.projectId));
      setActiveProjectIds(active);
      setAllTracking((projects as Project[]).length > 0 && (projects as Project[]).every((p: Project) => active.has(p.id)));
    };
    load();
  }, [showPopup]);

  const handleOpenPopup = () => {
    if (allTracking) return;
    setShowPopup(true);
  };

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
      <h2 style={{ color: UI_COLORS.text.primary, margin: '0 0 8px 0' }}>{t('popupDemo.title')}</h2>
      <p style={{ color: UI_COLORS.text.muted, marginTop: '0' }}>
        {t('popupDemo.description')}
      </p>

      <div style={{
        marginTop: '20px',
        padding: '20px',
        background: UI_COLORS.bg.card,
        borderRadius: '10px',
        border: `1px solid ${UI_COLORS.border.primary}`,
      }}>
        <p style={{ fontSize: '14px', color: UI_COLORS.text.secondary, margin: '0 0 16px 0' }}>
          {t('popupDemo.instruction')}
        </p>
        <button
          onClick={handleOpenPopup}
          disabled={allTracking}
          style={{
            padding: '12px 24px',
            background: allTracking ? UI_COLORS.bg.hover : UI_COLORS.brand.accent,
            border: 'none',
            borderRadius: '8px',
            color: allTracking ? UI_COLORS.text.muted : '#FFFFFF',
            fontSize: '14px',
            fontWeight: '600',
            cursor: allTracking ? 'not-allowed' : 'pointer',
          }}
        >
          {t('popupDemo.openPopup')}
        </button>
        {allTracking && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: UI_COLORS.text.muted }}>
            All businesses are already being tracked.
          </div>
        )}

        {lastTracked && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: `${UI_COLORS.status.success}15`,
            borderRadius: '8px',
            border: `1px solid ${UI_COLORS.status.success}40`,
          }}>
            <span style={{ color: UI_COLORS.status.success, fontSize: '14px' }}>
              {t('popupDemo.success')}
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
            activeProjectIds={activeProjectIds}
            onSelect={handleSelect}
            onDismiss={handleDismiss}
          />
        </div>
      )}
    </div>
  );
};

export default PopupDemo;
