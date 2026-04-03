import React, { useState, useEffect } from 'react';
import type { Project, TimeEntry } from '../../shared/types';
import { PROJECT_COLORS } from '../../shared/colors';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectSub, setNewProjectSub] = useState('');

  useEffect(() => {
    loadProjects();
    loadTodayEntries();
  }, []);

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
      }
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
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

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
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

      {/* Active tracking card */}
      <div className="active-card">
        <div className="active-app-icon">💻</div>
        <div className="active-info">
          <div className="active-label">App em foco agora</div>
          <div className="active-app">TimeTrack Development</div>
          <div className="active-project">→ Sistema de rastreamento iniciado</div>
        </div>
        <div>
          <div className="active-timer">00:00:00</div>
          <div className="active-timer-sub">aguardando vinculação</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Total Hoje</div>
          <div className="kpi-val">0h 0m</div>
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
          projects.map((project) => (
            <div key={project.id} className="proj-row">
              <div className="proj-color" style={{ background: project.color }}></div>
              <div className="proj-info">
                <div className="proj-name">
                  {project.name}
                  {project.subproject && ` › ${project.subproject}`}
                </div>
                <div className="proj-bar-wrap">
                  <div className="proj-bar" style={{ background: project.color, width: '0%' }}></div>
                </div>
              </div>
              <div>
                <div className="proj-time">0h 0m</div>
                <div className="proj-pct">0%</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
