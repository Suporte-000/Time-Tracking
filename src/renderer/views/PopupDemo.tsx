import React, { useState, useEffect, useRef } from 'react';
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
  const [detectedApp, setDetectedApp] = useState<{ appName: string; processName: string } | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const POPUP_DELAY_MS = 2 * 60 * 1000;

  const scheduleAutoPopup = (projects: Project[], active: Set<string>) => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    autoTimerRef.current = setTimeout(async () => {
      const allDone = projects.length > 0 && projects.every(p => active.has(p.id));
      if (allDone) return;
      const apps = await window.electron.getMonitoredApps();
      const linked = apps.filter((a: { processName: string }) =>
        projects.some(p => p.processName && p.processName.toLowerCase() === a.processName.toLowerCase())
      );
      const pool = linked.length > 0 ? linked : apps;
      const app = pool[Math.floor(Math.random() * pool.length)] ?? { name: 'Visual Studio Code', processName: 'Code' };
      setDetectedApp({ appName: app.name, processName: app.processName });
      setShowPopup(true);
    }, POPUP_DELAY_MS);
  };

  useEffect(() => {
    return () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current); };
  }, []);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split('T')[0];
      const [projects, entries] = await Promise.all([
        window.electron.getProjects(),
        window.electron.getTimeEntries(today),
      ]);
      const active = new Set<string>((entries as TimeEntry[]).filter((e: TimeEntry) => !e.endTime).map((e: TimeEntry) => e.projectId));
      setActiveProjectIds(active);
      const allDone = (projects as Project[]).length > 0 && (projects as Project[]).every((p: Project) => active.has(p.id));
      setAllTracking(allDone);
      scheduleAutoPopup(projects as Project[], active);
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

      {/* How it works */}
      <div style={{
        marginTop: '20px',
        padding: '18px 20px',
        background: UI_COLORS.bg.card,
        borderRadius: '10px',
        border: `1px solid ${UI_COLORS.border.primary}`,
      }}>
        <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: UI_COLORS.brand.accent, marginBottom: '12px' }}>
          {t('popupDemo.howTitle')}
        </div>
        {[
          t('popupDemo.step1'),
          t('popupDemo.step2'),
          t('popupDemo.step3'),
          t('popupDemo.step4'),
          t('popupDemo.step5'),
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px', fontSize: '13px', color: UI_COLORS.text.secondary }}>
            <span style={{ color: UI_COLORS.text.muted, flexShrink: 0 }}>{i + 1}.</span>
            <span>{step}</span>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '16px',
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
            appName={detectedApp?.appName ?? 'Browser (Manual)'}
            processName={detectedApp?.processName ?? 'browser'}
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
