import React, { useState, useEffect } from 'react';
import type { Project } from '../../shared/types';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getProjects();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
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
          <button className="btn">⬇ Exportar CSV</button>
          <button className="btn btn-primary">+ Novo Projeto</button>
        </div>
      </div>

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
