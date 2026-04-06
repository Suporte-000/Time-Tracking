import React, { useState, useEffect, useRef } from 'react';
import type { Project, TimeEntry, MonitoredApp } from '../../shared/types';
import { PROJECT_COLORS } from '../../shared/colors';
import { useI18n } from '../i18nContext';
import ProjectPopup from '../components/ProjectPopup';
import './Dashboard.css';

const LOCALE_MAP: Record<string, string> = { 'en': 'en-US', 'es': 'es-ES', 'pt-BR': 'pt-BR' };

const Dashboard: React.FC = () => {
  const { t, lang } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [monitoredApps, setMonitoredApps] = useState<MonitoredApp[]>([]);
  const [loading, setLoading] = useState(true);

  // New project modal state
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectSubproject, setNewProjectSubproject] = useState('');
  const [newProjectApp, setNewProjectApp] = useState('');
  const [newProjectCustomApp, setNewProjectCustomApp] = useState('');

  // Import file ref
  const importFileRef = useRef<HTMLInputElement>(null);


  // Timer state
  const [showStartModal, setShowStartModal] = useState(false);
  const [activeEntries, setActiveEntries] = useState<TimeEntry[]>([]);
  const [, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Virtual popup state — shows after 2 minutes to simulate app detection
  const [showPopup, setShowPopup] = useState(false);
  const [popupApp, setPopupApp] = useState<{ appName: string; processName: string } | null>(null);
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const POPUP_DELAY_MS = 2 * 60 * 1000; // 2 minutes

  useEffect(() => {
    loadProjects(); loadTodayEntries(); loadMonitoredApps();
    // Schedule popup after 2 minutes (virtual simulation of app detection)
    popupTimerRef.current = setTimeout(() => triggerPopup(), POPUP_DELAY_MS);
    return () => { if (popupTimerRef.current) clearTimeout(popupTimerRef.current); };
  }, []);

  useEffect(() => {
    if (activeEntries.length > 0) {
      timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeEntries.length]);

  const getElapsed = (entry: TimeEntry): number => Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000);

  const loadProjects = async () => {
    try { if (window.electron) { setProjects(await window.electron.getProjects()); } }
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
    try { await window.electron.stopTracking(entryId); setActiveEntries(prev => prev.filter(e => e.id !== entryId)); await loadTodayEntries(); }
    catch (error) { console.error('Error stopping timer:', error); }
  };

  const triggerPopup = () => {
    // Prefer apps that are linked to a project so the popup can show the business name
    const linkedApps = monitoredApps.filter(app =>
      projects.some(p => p.processName && p.processName.toLowerCase() === app.processName.toLowerCase())
    );
    const pool = linkedApps.length > 0 ? linkedApps : monitoredApps;
    const fallback = { name: 'Visual Studio Code', processName: 'Code' };
    const app = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : fallback;
    setPopupApp({ appName: app.name, processName: app.processName });
    setShowPopup(true);
  };

  const handlePopupSelect = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) await handleStartTimer(project);
    setShowPopup(false);
    // Reset timer so popup can appear again after another 2 minutes
    popupTimerRef.current = setTimeout(() => triggerPopup(), POPUP_DELAY_MS);
  };

  const handlePopupDismiss = () => {
    setShowPopup(false);
    // Reset timer so popup can appear again after another 2 minutes
    popupTimerRef.current = setTimeout(() => triggerPopup(), POPUP_DELAY_MS);
  };

  const handleStopAll = async () => {
    for (const entry of activeEntries) { try { await window.electron.stopTracking(entry.id); } catch {} }
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

  const handleNewProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const colorIndex = projects.length % PROJECT_COLORS.length;
      await window.electron.createProject({
        name: newProjectName.trim(),
        subproject: newProjectSubproject.trim() || undefined,
        color: PROJECT_COLORS[colorIndex],
        isActive: true,
      });
      setNewProjectName(''); setNewProjectSubproject('');
      setShowNewProjectModal(false); await loadProjects();
    } catch (error) { console.error('Error creating project:', error); alert(t('project.createError')); }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let count = 0;
    for (const line of lines) {
      const parts = line.split('\t');
      const name = parts[0]?.trim();
      const subproject = parts[1]?.trim() || undefined;
      if (!name) continue;
      const colorIndex = (projects.length + count) % PROJECT_COLORS.length;
      await window.electron.createProject({ name, subproject, color: PROJECT_COLORS[colorIndex], isActive: true });
      count++;
    }
    await loadProjects();
    e.target.value = '';
    alert(`Imported ${count} projects.`);
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

  const canCreateProject = newProjectName.trim();

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
          <button className="btn" onClick={() => importFileRef.current?.click()}>
            ⬆ Import TXT/CSV
          </button>
          <input ref={importFileRef} type="file" accept=".txt,.csv" style={{ display: 'none' }} onChange={handleImportFile} />
          <button className="btn btn-primary" onClick={() => setShowNewProjectModal(true)}>
            {t('dashboard.newProject')}
          </button>
        </div>
      </div>

      {/* New Project Modal — with app selector */}
      {showNewProjectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#161C26', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '500px', border: '1px solid #1A1F2B' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#E2E8F0' }}>{t('project.new')}</h3>

            {/* Project name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#A0AEC0', fontSize: '14px' }}>{t('project.name')}</label>
              <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder={t('project.namePlaceholder')}
                style={{ width: '100%', padding: '10px', background: '#0A0E14', border: '1px solid #1A1F2B', borderRadius: '6px', color: '#E2E8F0', fontSize: '14px' }} autoFocus />
            </div>

            {/* Subproject */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#A0AEC0', fontSize: '14px' }}>Subproject (optional)</label>
              <input type="text" value={newProjectSubproject} onChange={(e) => setNewProjectSubproject(e.target.value)} placeholder="e.g. Electrical, Plumbing..."
                style={{ width: '100%', padding: '10px', background: '#0A0E14', border: '1px solid #1A1F2B', borderRadius: '6px', color: '#E2E8F0', fontSize: '14px' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowNewProjectModal(false); setNewProjectName(''); setNewProjectSubproject(''); setNewProjectApp(''); setNewProjectCustomApp(''); }}
                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #1E2530', borderRadius: '6px', color: '#A0AEC0', cursor: 'pointer', fontSize: '14px' }}>
                {t('common.cancel')}
              </button>
              <button onClick={handleNewProject} disabled={!canCreateProject}
                style={{ padding: '10px 20px', background: canCreateProject ? '#1FB8A0' : '#1E2530', border: 'none', borderRadius: '6px', color: canCreateProject ? '#FFFFFF' : '#4A5568', cursor: canCreateProject ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: '600' }}>
                {t('project.create')}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Active tracking cards */}
      {activeEntries.length > 0 ? (
        <div>
          {activeEntries.map(entry => {
            const project = projects.find(p => p.id === entry.projectId);
            const elapsed = getElapsed(entry);
            return (
              <div key={entry.id} className="active-card" style={{ marginBottom: '8px' }}>
                <div className="active-app-icon">⏱</div>
                <div className="active-info">
                  <div className="active-label">{t('timer.trackingNow')}</div>
                  <div className="active-app">{project ? `${project.name}${project.subproject ? ` › ${project.subproject}` : ''}` : entry.appName}</div>
                  <div className="active-project">{entry.appName} — {t('timer.startedAt')} {formatTime(entry.startTime)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="active-timer" style={{ color: '#1FB8A0' }}>{formatTimerDisplay(elapsed)}</div>
                  <button onClick={() => handleStopTimer(entry.id)}
                    style={{ marginTop: '8px', padding: '6px 16px', background: '#E85D75', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    ⏹ {t('timer.stop')}
                  </button>
                </div>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', padding: '0 20px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowStartModal(true)}
              style={{ padding: '8px 16px', background: '#1FB8A0', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              {t('timer.addTimer')}
            </button>
            {activeEntries.length > 1 && (
              <button onClick={handleStopAll}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #E85D75', borderRadius: '6px', color: '#E85D75', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                ⏹ {t('timer.stopAll')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="active-card">
          <div className="active-app-icon">💻</div>
          <div className="active-info">
            <div className="active-label">{t('timer.appInFocus')}</div>
            <div className="active-app">TimeTrack Development</div>
            <div className="active-project">{t('timer.trackingStarted')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="active-timer">00:00:00</div>
            <button onClick={() => setShowStartModal(true)} disabled={projects.length === 0}
              style={{ marginTop: '8px', padding: '6px 16px', background: projects.length > 0 ? '#1FB8A0' : '#1E2530', border: 'none', borderRadius: '6px', color: projects.length > 0 ? '#FFFFFF' : '#4A5568', fontSize: '13px', fontWeight: '600', cursor: projects.length > 0 ? 'pointer' : 'not-allowed' }}>
              ▶ {t('timer.start')}
            </button>
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

      {/* Virtual popup — simulates app detection after 2 minutes */}
      {showPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <ProjectPopup
            appName={popupApp?.appName ?? 'Unknown App'}
            processName={popupApp?.processName ?? 'unknown'}
            activeProjectIds={activeProjectIds}
            onSelect={handlePopupSelect}
            onDismiss={handlePopupDismiss}
          />
        </div>
      )}

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
