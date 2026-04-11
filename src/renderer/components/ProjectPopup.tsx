import React, { useState, useEffect } from 'react';
import { Project } from '../../shared/types';
import { useI18n } from '../i18nContext';

interface RunningApp {
  processName: string;
  windowTitle: string;
  icon: string;
}

interface ProjectPopupProps {
  appName: string;
  processName: string;
  activeProjectIds?: Set<string>;
  onSelect: (projectId: string, appName: string, processName: string) => void;
  onDismiss: () => void;
}

const APP_ICONS: Record<string, string> = {
  'visual studio code': '💻', 'code': '💻',
  'google chrome': '🌐', 'chrome': '🌐',
  'figma': '🎨',
  'microsoft teams': '💬', 'teams': '💬',
  'notion': '📝',
  'timetrack': '⏱',
};
const getAppIcon = (name: string) => APP_ICONS[name.toLowerCase()] ?? '🖥️';

const ProjectPopup: React.FC<ProjectPopupProps> = ({
  processName,
  activeProjectIds = new Set(),
  onSelect,
  onDismiss,
}) => {
  const { t } = useI18n();

  // Step 1 = select program, Step 2 = select project
  const [step, setStep] = useState<1 | 2>(1);
  const [runningApps, setRunningApps] = useState<RunningApp[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<RunningApp | null>(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [appSearch, setAppSearch] = useState('');
  const [loadingApps, setLoadingApps] = useState(true);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (countdown <= 0) { onDismiss(); return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onDismiss]);

  const loadData = async () => {
    setLoadingApps(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [apps, allProjects, registeredPrograms, activeEntries] = await Promise.all([
        window.electron.getRunningApps ? window.electron.getRunningApps() : Promise.resolve([]),
        window.electron.getProjects(),
        window.electron.getProjectPrograms(),
        window.electron.getTimeEntries(today),
      ]);

      // Processes that are already being tracked right now
      const trackedProcesses = new Set(
        (activeEntries as any[])
          .filter((e: any) => !e.endTime)
          .map((e: any) => e.processName.toLowerCase())
      );

      // Only show registered programs that are running AND not already tracked
      const registeredProcessNames = new Set(
        (registeredPrograms as any[]).map((p: any) => p.processName.toLowerCase())
      );
      const running = ((apps as RunningApp[]) || []).filter(
        a =>
          registeredProcessNames.has(a.processName.toLowerCase()) &&
          !trackedProcesses.has(a.processName.toLowerCase())
      );

      setRunningApps(running);
      setProjects((allProjects as Project[]).filter(p => p.isActive));

      // Pre-select detected app if it's in the filtered list
      const matched = running.find(a => a.processName.toLowerCase() === processName.toLowerCase());
      if (matched) setSelectedApp(matched);
    } catch (e: any) {
      console.log(`[Popup][ERROR] loadData error: ${e?.message || e}`);
    } finally {
      setLoadingApps(false);
    }
  };

  // Projects available for selection (exclude already-active ones)
  const availableProjects = projects.filter(p =>
    !activeProjectIds.has(p.id) &&
    (p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.subproject && p.subproject.toLowerCase().includes(projectSearch.toLowerCase())))
  );

  const filteredApps = runningApps.filter(a =>
    !appSearch ||
    a.windowTitle.toLowerCase().includes(appSearch.toLowerCase()) ||
    a.processName.toLowerCase().includes(appSearch.toLowerCase())
  );

  const handleConfirm = () => {
    if (!selectedProjectId || !selectedApp) return;
    onSelect(selectedProjectId, selectedApp.windowTitle, selectedApp.processName);
  };

  // ── STEP 1 — Select Program ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', color: '#1FB8A0', marginBottom: '4px' }}>
            SELECT PROGRAM
          </div>
          <div style={{ fontSize: '12px', color: '#718096' }}>Which program are you using?</div>
          <span style={{ position: 'absolute', top: '12px', right: '36px', fontSize: '11px', color: '#4A5568' }}>{countdown}s</span>
          <button onClick={onDismiss} style={closeBtnStyle}>×</button>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 16px 6px' }}>
          <input
            value={appSearch}
            onChange={e => setAppSearch(e.target.value)}
            placeholder="Search programs..."
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box', padding: '8px 12px',
              background: '#0D1117', border: '1px solid #1E2A3A', borderRadius: '6px',
              color: '#E2E8F0', fontSize: '13px', outline: 'none',
            }}
          />
        </div>

        {/* App list */}
        <div style={{ padding: '4px 16px 8px', maxHeight: '240px', overflowY: 'auto' }}>
          {loadingApps ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#4A5568', fontSize: '13px' }}>Loading...</div>
          ) : filteredApps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#4A5568', fontSize: '13px' }}>No registered programs running</div>
          ) : (
            filteredApps.map(app => {
              const isSelected = selectedApp?.processName === app.processName;
              return (
                <div key={app.processName} onClick={() => setSelectedApp(app)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', marginBottom: '6px', borderRadius: '8px',
                    background: isSelected ? '#1A2535' : '#0D1117',
                    border: `1px solid ${isSelected ? '#1FB8A0' : '#1E2A3A'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>{getAppIcon(app.processName)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.windowTitle}</div>
                    <div style={{ fontSize: '11px', color: '#4A5568' }}>{app.processName}.exe</div>
                  </div>
                  {isSelected && <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#1FB8A0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', flexShrink: 0 }}>✓</div>}
                </div>
              );
            })
          )}
        </div>

        <div style={footerStyle}>
          <button onClick={onDismiss} style={skipBtnStyle}>{t('popup.skip')}</button>
          <button
            onClick={() => { if (selectedApp) setStep(2); }}
            disabled={!selectedApp}
            style={{ ...confirmBtnStyle, background: selectedApp ? '#1FB8A0' : '#1E2A3A', color: selectedApp ? '#fff' : '#4A5568', cursor: selectedApp ? 'pointer' : 'not-allowed' }}>
            Next →
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 2 — Select Project ────────────────────────────────────────────────
  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '13px', padding: 0, marginBottom: '4px' }}>
          ← {selectedApp?.windowTitle}
        </button>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', color: '#1FB8A0' }}>
          SELECT PROJECT
        </div>
        <div style={{ fontSize: '12px', color: '#718096' }}>Which project are you working on?</div>
        <span style={{ position: 'absolute', top: '12px', right: '36px', fontSize: '11px', color: '#4A5568' }}>{countdown}s</span>
        <button onClick={onDismiss} style={closeBtnStyle}>×</button>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 16px 6px' }}>
        <input
          value={projectSearch}
          onChange={e => setProjectSearch(e.target.value)}
          placeholder={t('popup.search')}
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box', padding: '8px 12px',
            background: '#0D1117', border: '1px solid #1E2A3A', borderRadius: '6px',
            color: '#E2E8F0', fontSize: '13px', outline: 'none',
          }}
        />
      </div>

      {/* Project list */}
      <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '4px 16px 8px' }}>
        {availableProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#4A5568', fontSize: '13px' }}>{t('popup.noResults')}</div>
        ) : (
          availableProjects.map(project => {
            const isSelected = selectedProjectId === project.id;
            return (
              <div key={project.id} onClick={() => setSelectedProjectId(project.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', marginBottom: '4px', borderRadius: '8px',
                  background: isSelected ? '#1A2535' : 'transparent',
                  border: `1px solid ${isSelected ? '#1E3A50' : 'transparent'}`,
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#111722'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: project.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {project.name}
                    {project.subproject && <span style={{ color: '#718096', fontWeight: 400 }}> › {project.subproject}</span>}
                  </div>
                </div>
                {isSelected && <div style={{ color: '#1FB8A0', fontSize: '14px' }}>✓</div>}
              </div>
            );
          })
        )}
      </div>

      <div style={footerStyle}>
        <button onClick={() => setStep(1)} style={skipBtnStyle}>← Back</button>
        <button onClick={handleConfirm} disabled={!selectedProjectId}
          style={{ ...confirmBtnStyle, background: selectedProjectId ? '#1FB8A0' : '#1E2A3A', color: selectedProjectId ? '#fff' : '#4A5568', cursor: selectedProjectId ? 'pointer' : 'not-allowed' }}>
          {t('popup.confirm')}
        </button>
      </div>
    </div>
  );
};

// ── Shared styles ──────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  width: '400px',
  background: '#161C26',
  borderRadius: '14px',
  border: '1px solid #1E2A3A',
  boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
  overflow: 'hidden',
  fontFamily: 'inherit',
};
const headerStyle: React.CSSProperties = {
  padding: '14px 18px 12px',
  background: '#111722',
  borderBottom: '1px solid #1E2A3A',
  position: 'relative',
};
const closeBtnStyle: React.CSSProperties = {
  position: 'absolute', top: '12px', right: '12px',
  background: 'transparent', border: 'none', color: '#718096',
  fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: 0,
};
const footerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderTop: '1px solid #1E2A3A',
  display: 'flex',
  gap: '10px',
};
const skipBtnStyle: React.CSSProperties = {
  flex: 1, padding: '10px', background: 'transparent',
  border: '1px solid #1E2A3A', borderRadius: '8px',
  color: '#A0AEC0', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
};
const confirmBtnStyle: React.CSSProperties = {
  flex: 2, padding: '10px', border: 'none',
  borderRadius: '8px', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
};

export default ProjectPopup;
