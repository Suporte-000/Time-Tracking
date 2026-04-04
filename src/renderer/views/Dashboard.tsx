import React, { useState, useEffect, useRef } from 'react';
import type { Project, TimeEntry, MonitoredApp } from '../../shared/types';
import { PROJECT_COLORS } from '../../shared/colors';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [monitoredApps, setMonitoredApps] = useState<MonitoredApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectSub, setNewProjectSub] = useState('');

  // Manual timer state — supports multiple active timers
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<{ name: string; processName: string; icon?: string } | null>(null);
  const [customAppName, setCustomAppName] = useState('');
  const [activeEntries, setActiveEntries] = useState<TimeEntry[]>([]);
  const [tick, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadProjects();
    loadTodayEntries();
    loadMonitoredApps();
  }, []);

  // Timer tick — updates every second when any timer is active
  useEffect(() => {
    if (activeEntries.length > 0) {
      timerRef.current = setInterval(() => {
        setTick(t => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeEntries.length]);

  const getElapsed = (entry: TimeEntry): number => {
    return Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000);
  };

  const loadProjects = async () => {
    try {
      if (window.electron) {
        const data = await window.electron.getProjects();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayEntries = async () => {
    try {
      if (window.electron) {
        const today = new Date().toISOString().split('T')[0];
        const data = await window.electron.getTimeEntries(today);
        setTimeEntries(data);
        // Find all active (no endTime) entries
        const actives = data.filter((e: TimeEntry) => !e.endTime);
        setActiveEntries(actives);
      }
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  };

  const loadMonitoredApps = async () => {
    try {
      if (window.electron) {
        const data = await window.electron.getMonitoredApps();
        setMonitoredApps(data);
      }
    } catch (error) {
      console.error('Error loading monitored apps:', error);
    }
  };

  const handleStartTimer = async (projectId: string) => {
    // Resolve app name from dropdown or custom input
    let appName = 'Manual';
    let processName = 'manual';
    if (customAppName === '__custom__' && selectedApp?.name) {
      appName = selectedApp.name;
      processName = selectedApp.processName;
    } else if (customAppName && customAppName !== '__custom__') {
      const matched = monitoredApps.find(a => a.name === customAppName);
      appName = matched ? matched.name : customAppName;
      processName = matched ? matched.processName : customAppName.toLowerCase();
    }

    try {
      const entry = await window.electron.startTracking({
        userId: 'browser-user',
        projectId,
        appName,
        processName,
      });
      setActiveEntries(prev => [...prev, entry]);
      setShowStartModal(false);
      setSelectedApp(null);
      setCustomAppName('');
      await loadTodayEntries();
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const handleStopTimer = async (entryId: string) => {
    try {
      await window.electron.stopTracking(entryId);
      setActiveEntries(prev => prev.filter(e => e.id !== entryId));
      await loadTodayEntries();
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const handleStopAll = async () => {
    for (const entry of activeEntries) {
      try {
        await window.electron.stopTracking(entry.id);
      } catch (error) {
        console.error('Error stopping timer:', error);
      }
    }
    setActiveEntries([]);
    await loadTodayEntries();
  };

  const handleExportCSV = () => {
    if (timeEntries.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const headers = ['Data', 'Início', 'Fim', 'Duração', 'Projeto', 'Subprojeto', 'Aplicativo', 'Status'];

    const rows = timeEntries.map(entry => {
      const project = projects.find(p => p.id === entry.projectId);
      const duration = formatDuration(entry.duration);
      return [
        today,
        formatTime(entry.startTime),
        entry.endTime ? formatTime(entry.endTime) : '-',
        duration,
        project?.name || 'Sem projeto',
        project?.subproject || '-',
        entry.appName,
        entry.status,
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `timetrack_${today}.csv`;
    link.click();
  };

  const handleNewProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const colorIndex = projects.length % PROJECT_COLORS.length;
      await window.electron.createProject({
        name: newProjectName.trim(),
        subproject: newProjectSub.trim() || undefined,
        color: PROJECT_COLORS[colorIndex],
        isActive: true,
      });

      setNewProjectName('');
      setNewProjectSub('');
      setShowNewProjectModal(false);
      await loadProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Erro ao criar projeto');
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatTimerDisplay = (seconds: number): string => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // IDs of projects already being tracked
  const activeProjectIds = new Set(activeEntries.map(e => e.projectId));

  // Compute KPIs from today's entries
  const totalSeconds = timeEntries.reduce((sum, e) => {
    if (e.endTime) return sum + e.duration;
    const active = activeEntries.find(a => a.id === e.id);
    if (active) return sum + getElapsed(active);
    return sum + e.duration;
  }, 0);

  const getProjectTime = (projectId: string): number => {
    return timeEntries
      .filter(e => e.projectId === projectId)
      .reduce((sum, e) => {
        if (!e.endTime) {
          const active = activeEntries.find(a => a.id === e.id);
          if (active) return sum + getElapsed(active);
        }
        return sum + e.duration;
      }, 0);
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className="dashboard-view">
      <div className="top-bar">
        <div>
          <div className="top-title">Dashboard</div>
          <div className="top-sub">Hoje, {new Date().toLocaleDateString('pt-BR')}</div>
        </div>
        <div className="top-actions">
          <button
            className="btn"
            onClick={handleExportCSV}
            disabled={timeEntries.length === 0}
            style={{ opacity: timeEntries.length === 0 ? 0.5 : 1, cursor: timeEntries.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            ⬇ Exportar CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowNewProjectModal(true)}
          >
            + Novo Projeto
          </button>
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#161C26',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            border: '1px solid #1A1F2B',
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#E2E8F0' }}>Novo Projeto</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#A0AEC0', fontSize: '14px' }}>
                Nome do Projeto *
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Ex: Projeto A"
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#0A0E14',
                  border: '1px solid #1A1F2B',
                  borderRadius: '6px',
                  color: '#E2E8F0',
                  fontSize: '14px',
                }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#A0AEC0', fontSize: '14px' }}>
                Subprojeto (opcional)
              </label>
              <input
                type="text"
                value={newProjectSub}
                onChange={(e) => setNewProjectSub(e.target.value)}
                placeholder="Ex: Elétrica"
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#0A0E14',
                  border: '1px solid #1A1F2B',
                  borderRadius: '6px',
                  color: '#E2E8F0',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowNewProjectModal(false);
                  setNewProjectName('');
                  setNewProjectSub('');
                }}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid #1E2530',
                  borderRadius: '6px',
                  color: '#A0AEC0',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleNewProject}
                disabled={!newProjectName.trim()}
                style={{
                  padding: '10px 20px',
                  background: newProjectName.trim() ? '#1FB8A0' : '#1E2530',
                  border: 'none',
                  borderRadius: '6px',
                  color: newProjectName.trim() ? '#FFFFFF' : '#4A5568',
                  cursor: newProjectName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Criar Projeto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Timer Modal - Single step: pick app + project */}
      {showStartModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#161C26',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '400px',
            border: '1px solid #1A1F2B',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#E2E8F0' }}>Iniciar Timer</h3>

            {/* App selector - dropdown with known apps + custom option */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#A0AEC0', fontSize: '14px' }}>
                Aplicativo
              </label>
              <select
                value={customAppName}
                onChange={(e) => {
                  setCustomAppName(e.target.value);
                  if (e.target.value === '__custom__') {
                    setCustomAppName('__custom__');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#0A0E14',
                  border: '1px solid #1A1F2B',
                  borderRadius: '6px',
                  color: '#E2E8F0',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">Selecione um aplicativo...</option>
                {monitoredApps.map(app => (
                  <option key={app.id} value={app.name}>
                    {app.icon} {app.name}
                  </option>
                ))}
                <option value="__custom__">Outro (digitar nome)...</option>
              </select>
            </div>

            {/* Custom app name input - only shows when "Outro" is selected */}
            {customAppName === '__custom__' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#A0AEC0', fontSize: '14px' }}>
                  Nome do aplicativo
                </label>
                <input
                  type="text"
                  value={selectedApp?.name || ''}
                  onChange={(e) => setSelectedApp(e.target.value.trim() ? { name: e.target.value, processName: e.target.value.toLowerCase(), icon: '📱' } : null)}
                  placeholder="Ex: AutoCAD, Excel, Revit..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#0A0E14',
                    border: '1px solid #1A1F2B',
                    borderRadius: '6px',
                    color: '#E2E8F0',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {/* Project list */}
            <label style={{ display: 'block', marginBottom: '8px', color: '#A0AEC0', fontSize: '14px' }}>
              Projeto
            </label>
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {projects.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#718096', padding: '20px', fontSize: '14px' }}>
                  Nenhum projeto cadastrado. Crie um projeto primeiro.
                </div>
              ) : (
                projects.map(project => {
                  const alreadyActive = activeProjectIds.has(project.id);
                  const appSelected = customAppName !== '' && customAppName !== '__custom__' || (customAppName === '__custom__' && selectedApp?.name);
                  const canClick = !alreadyActive && appSelected;
                  return (
                    <div
                      key={project.id}
                      onClick={() => {
                        if (!canClick) return;
                        const app = customAppName === '__custom__'
                          ? selectedApp!
                          : monitoredApps.find(a => a.name === customAppName) || { name: customAppName, processName: customAppName.toLowerCase(), icon: '📱' };
                        setSelectedApp(app);
                        handleStartTimer(project.id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        marginBottom: '8px',
                        background: alreadyActive ? '#131820' : '#0A0E14',
                        border: `1px solid ${alreadyActive ? '#1FB8A0' : '#1A1F2B'}`,
                        borderRadius: '8px',
                        cursor: canClick ? 'pointer' : 'default',
                        opacity: alreadyActive ? 0.6 : !appSelected ? 0.5 : 1,
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => { if (canClick) e.currentTarget.style.borderColor = '#1FB8A0'; }}
                      onMouseLeave={(e) => { if (canClick) e.currentTarget.style.borderColor = alreadyActive ? '#1FB8A0' : '#1A1F2B'; }}
                    >
                      <div style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '4px',
                        background: project.color,
                        flexShrink: 0,
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 500 }}>
                          {project.name}
                        </div>
                        {project.subproject && (
                          <div style={{ color: '#A0AEC0', fontSize: '12px', marginTop: '2px' }}>
                            {project.subproject}
                          </div>
                        )}
                      </div>
                      {alreadyActive ? (
                        <div style={{ color: '#1FB8A0', fontSize: '12px', fontWeight: 600 }}>Em uso</div>
                      ) : (
                        <div style={{ color: '#1FB8A0', fontSize: '18px' }}>▶</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => { setShowStartModal(false); setSelectedApp(null); setCustomAppName(''); }}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid #1E2530',
                  borderRadius: '6px',
                  color: '#A0AEC0',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancelar
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
                  <div className="active-label">Rastreando agora</div>
                  <div className="active-app">
                    {project
                      ? `${project.name}${project.subproject ? ` › ${project.subproject}` : ''}`
                      : entry.appName}
                  </div>
                  <div className="active-project">
                    {entry.appName} — Iniciado às {formatTime(entry.startTime)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="active-timer" style={{ color: '#1FB8A0' }}>
                    {formatTimerDisplay(elapsed)}
                  </div>
                  <button
                    onClick={() => handleStopTimer(entry.id)}
                    style={{
                      marginTop: '8px',
                      padding: '6px 16px',
                      background: '#E85D75',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    ⏹ Parar
                  </button>
                </div>
              </div>
            );
          })}
          {/* Add more / Stop all bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', padding: '0 20px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowStartModal(true)}
              style={{
                padding: '8px 16px',
                background: '#1FB8A0',
                border: 'none',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              + Adicionar Timer
            </button>
            {activeEntries.length > 1 && (
              <button
                onClick={handleStopAll}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid #E85D75',
                  borderRadius: '6px',
                  color: '#E85D75',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ⏹ Parar Todos
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="active-card">
          <div className="active-app-icon">💻</div>
          <div className="active-info">
            <div className="active-label">App em foco agora</div>
            <div className="active-app">TimeTrack Development</div>
            <div className="active-project">→ Sistema de rastreamento iniciado</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="active-timer">00:00:00</div>
            <button
              onClick={() => setShowStartModal(true)}
              disabled={projects.length === 0}
              style={{
                marginTop: '8px',
                padding: '6px 16px',
                background: projects.length > 0 ? '#1FB8A0' : '#1E2530',
                border: 'none',
                borderRadius: '6px',
                color: projects.length > 0 ? '#FFFFFF' : '#4A5568',
                fontSize: '13px',
                fontWeight: '600',
                cursor: projects.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              ▶ Iniciar Timer
            </button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Total Hoje</div>
          <div className="kpi-val">{formatDuration(totalSeconds)}</div>
          <div className="kpi-sub">meta: 8h</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Projetos Ativos</div>
          <div className="kpi-val">{projects.length}</div>
          <div className="kpi-sub">cadastrados</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pausas</div>
          <div className="kpi-val">0m</div>
          <div className="kpi-sub">sem pausas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Sem Projeto</div>
          <div className="kpi-val">0h 0m</div>
          <div className="kpi-sub">não vinculado</div>
        </div>
      </div>

      {/* Project list */}
      <div className="section-label">Projetos Cadastrados</div>
      <div className="project-bars">
        {projects.length === 0 ? (
          <div className="empty-state">Nenhum projeto cadastrado ainda</div>
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
                    {project.subproject && ` › ${project.subproject}`}
                  </div>
                  <div className="proj-bar-wrap">
                    <div className="proj-bar" style={{ background: project.color, width: `${Math.min(pct, 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="proj-time">{formatDuration(projectTime)}</div>
                  <div className="proj-pct">{pct}%</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Dashboard;
