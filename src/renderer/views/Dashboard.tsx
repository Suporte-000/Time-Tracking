import React, { useState, useEffect, useRef } from 'react';
import type { Project, TimeEntry, MonitoredApp } from '../../shared/types';
import { PROJECT_COLORS } from '../../shared/colors';
import { useI18n } from '../i18nContext';
import './Dashboard.css';

const LOCALE_MAP: Record<string, string> = { 'en': 'en-US', 'es': 'es-ES', 'pt-BR': 'pt-BR' };

const Dashboard: React.FC = () => {
  const { t, lang } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [monitoredApps, setMonitoredApps] = useState<MonitoredApp[]>([]);
  const [loading, setLoading] = useState(true);

  // New project modal state




  // Timer state
  const [showStartModal, setShowStartModal] = useState(false);
  const [activeEntries, setActiveEntries] = useState<TimeEntry[]>([]);
  const [, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const projectsRef = useRef<Project[]>([]);

  useEffect(() => {
    loadProjects(); loadTodayEntries(); loadMonitoredApps();

    // Refresh when main process auto-stops a tracking entry (process exited)
    (window.electron as any)?.onTrackingAutoStopped?.(() => { loadTodayEntries(); });
  }, []);

  useEffect(() => {
    if (activeEntries.length > 0) {
      timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeEntries.length]);

  const getElapsed = (entry: TimeEntry): number => Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000);

  const loadProjects = async () => {
    try { if (window.electron) { const p = await window.electron.getProjects(); setProjects(p); projectsRef.current = p; } }
    catch (error) { console.error('Error loading projects:', error); }
    finally { setLoading(false); }
  };

  const loadTodayEntries = async () => {
    try {
      if (window.electron) {
        const today = new Date().toISOString().split('T')[0];
        const data = await window.electron.getTimeEntries(today);
        setTimeEntries(data);
        setActiveEntries(data.filter((e: TimeEntry) => !e.endTime));
      }
    } catch (error) { console.error('Error loading time entries:', error); }
  };

  const loadMonitoredApps = async () => {
    try { if (window.electron) { setMonitoredApps(await window.electron.getMonitoredApps()); } }
    catch (error) { console.error('Error loading monitored apps:', error); }
  };

  // Start timer using the project's linked app
  const handleStartTimer = async (project: Project) => {
    const appName = project.appName || 'Manual';
    const processName = project.processName || 'manual';
    try {
      const entry = await window.electron.startTracking({ userId: 'browser-user', projectId: project.id, appName, processName });
      setActiveEntries(prev => [...prev, entry]);
      setShowStartModal(false);
      await loadTodayEntries();
    } catch (error) { console.error('Error starting timer:', error); }
  };

  const handleStopTimer = async (entryId: string) => {
    try { await window.electron.stopTracking(entryId, 'manual'); setActiveEntries(prev => prev.filter(e => e.id !== entryId)); await loadTodayEntries(); }
    catch (error) { console.error('Error stopping timer:', error); }
  };

  const handleStopAll = async () => {
    for (const entry of activeEntries) { try { await window.electron.stopTracking(entry.id, 'manual'); } catch {} }
    setActiveEntries([]); await loadTodayEntries();
  };

  const handleExportCSV = () => {
    if (timeEntries.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const headers = [t('csv.date'), t('csv.start'), t('csv.end'), t('csv.duration'), t('csv.project'), t('csv.app'), t('csv.status')];
    const rows = timeEntries.map(entry => {
      const project = projects.find(p => p.id === entry.projectId);
      return [today, formatTime(entry.startTime), entry.endTime ? formatTime(entry.endTime) : '-', formatDuration(entry.duration), project?.name || t('project.none'), entry.appName, entry.status];
    });
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `timetrack_${today}.csv`; link.click();
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };
  const formatTimerDisplay = (seconds: number): string => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };
  const formatTime = (isoString: string): string => new Date(isoString).toLocaleTimeString(LOCALE_MAP[lang] || 'pt-BR', { hour: '2-digit', minute: '2-digit' });

  const activeProjectIds = new Set(activeEntries.map(e => e.projectId).filter((id): id is string => id !== null));
  const totalSeconds = timeEntries.reduce((sum, e) => {
    if (e.endTime) return sum + e.duration;
    const active = activeEntries.find(a => a.id === e.id);
    return active ? sum + getElapsed(active) : sum + e.duration;
  }, 0);
  const getProjectTime = (projectId: string): number => timeEntries.filter(e => e.projectId === projectId).reduce((sum, e) => {
    if (!e.endTime) { const active = activeEntries.find(a => a.id === e.id); if (active) return sum + getElapsed(active); }
    return sum + e.duration;
  }, 0);

  if (loading) return <div className="loading">{t('dashboard.loading')}</div>;

  return (
    <div className="dashboard-view">
      <div className="top-bar">
        <div>
          <div className="top-title">{t('dashboard.title')}</div>
          <div className="top-sub">{t('dashboard.today')}, {new Date().toLocaleDateString(LOCALE_MAP[lang] || 'pt-BR')}</div>
        </div>
        <div className="top-actions">
          <button className="btn" onClick={handleExportCSV} disabled={timeEntries.length === 0}
            style={{ opacity: timeEntries.length === 0 ? 0.5 : 1, cursor: timeEntries.length === 0 ? 'not-allowed' : 'pointer' }}>
            ⬇ {t('dashboard.exportCsv')}
          </button>
        </div>
      </div>


      {/* Start Timer Modal — just pick a project (app is already linked) */}
      {showStartModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#161C26', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '400px', border: '1px solid #1A1F2B' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#E2E8F0' }}>{t('timer.start')}</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {projects.filter(p => !activeProjectIds.has(p.id)).length === 0 ? (
                <div style={{ textAlign: 'center', color: '#718096', padding: '20px', fontSize: '14px' }}>{t('project.noneCreateFirst')}</div>
              ) : (
                projects.filter(p => !activeProjectIds.has(p.id)).map(project => (
                  <div key={project.id} onClick={() => handleStartTimer(project)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', marginBottom: '8px', background: '#0A0E14', border: '1px solid #1A1F2B', borderRadius: '8px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1FB8A0'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1A1F2B'; }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: project.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 500 }}>
                        {project.name}{project.subproject ? ` › ${project.subproject}` : ''}
                      </div>
                      {project.appName && <div style={{ color: '#718096', fontSize: '12px', marginTop: '2px' }}>→ {project.appName}</div>}
                    </div>
                    <div style={{ color: '#1FB8A0', fontSize: '18px' }}>▶</div>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setShowStartModal(false)}
                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #1E2530', borderRadius: '6px', color: '#A0AEC0', cursor: 'pointer', fontSize: '14px' }}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APP EM FOCO AGORA */}
      {activeEntries.length > 0 ? (
        <div>
          {activeEntries.map(entry => {
            const project = projects.find(p => p.id === entry.projectId);
            const elapsed = getElapsed(entry);
            const projectLabel = project
              ? `${project.name}${project.subproject ? ` › ${project.subproject}` : ''}`
              : '—';
            return (
              <div key={entry.id} className="active-card" style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '32px', width: '48px',textAlign: 'center', flexShrink: 0 }}>💻</div>
                <div className="active-info" style={{ flex: 1 }}>
                  <div className="active-label" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', color: '#E8F6F5', marginBottom: '4px' }}>{t('timer.appInFocus')}</div>
                  <div className="active-app" style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>{projectLabel}</div>
                  <div className="active-project" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>→ {entry.appName || 'Unknown'}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums', letterSpacing: '1px' }}>{formatTimerDisplay(elapsed)}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', marginBottom: '8px' }}>{t('timer.todayOnProject')}</div>
                  <button onClick={() => handleStopTimer(entry.id)}
                    style={{ padding: '6px 18px', background: '#E85D75', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    ■ {t('timer.stop')}
                  </button>
                </div>
              </div>
            );
          })}
          {activeEntries.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button onClick={handleStopAll}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #E85D75', borderRadius: '6px', color: '#E85D75', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                ⏹ {t('timer.stopAll')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="active-card">
          <div style={{ fontSize: '32px', width: '48px', textAlign: 'center', flexShrink: 0 }}>💻</div>
          <div className="active-info" style={{ flex: 1 }}>
            <div className="active-label" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', color: '#E8F6F5', marginBottom: '4px' }}>{t('timer.appInFocus')}</div>
            <div className="active-app" style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>—</div>
            <div className="active-project" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{t('timer.noTracking')}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>00:00:00</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{t('timer.todayOnProject')}</div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-row">
        <div className="kpi-card"><div className="kpi-label">{t('kpi.totalToday')}</div><div className="kpi-val">{formatDuration(totalSeconds)}</div><div className="kpi-sub">{t('kpi.goal')}</div></div>
        <div className="kpi-card"><div className="kpi-label">{t('kpi.activeProjects')}</div><div className="kpi-val">{projects.length}</div><div className="kpi-sub">{t('kpi.registered')}</div></div>
        <div className="kpi-card"><div className="kpi-label">{t('kpi.breaks')}</div><div className="kpi-val">0m</div><div className="kpi-sub">{t('kpi.noBreaks')}</div></div>
        <div className="kpi-card"><div className="kpi-label">{t('kpi.noProject')}</div><div className="kpi-val">0h 0m</div><div className="kpi-sub">{t('kpi.unlinked')}</div></div>
      </div>


      {/* Project list */}
      <div className="section-label">{t('project.registered')}</div>
      <div className="project-bars">
        {projects.length === 0 ? (
          <div className="empty-state">{t('project.noneYet')}</div>
        ) : (
          projects.map((project) => {
            const projectTime = getProjectTime(project.id);
            const pct = totalSeconds > 0 ? Math.round((projectTime / (8 * 3600)) * 100) : 0;
            return (
              <div key={project.id} className="proj-row">
                <div className="proj-color" style={{ background: project.color }}></div>
                <div className="proj-info">
                  <div className="proj-name">
                    {project.name}
                    {project.subproject && <span style={{ color: '#718096', fontWeight: 400 }}> › {project.subproject}</span>}
                  </div>
                  {project.appName && (
                    <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>→ {project.appName}</div>
                  )}
                  <div className="proj-bar-wrap"><div className="proj-bar" style={{ background: project.color, width: `${Math.min(pct, 100)}%` }}></div></div>
                </div>
                <div><div className="proj-time">{formatDuration(projectTime)}</div><div className="proj-pct">{pct}%</div></div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Dashboard;
