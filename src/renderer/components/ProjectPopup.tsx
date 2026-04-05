import React, { useState, useEffect } from 'react';
import { Project, AppSuggestion } from '../../shared/types';
import { useI18n } from '../i18nContext';

interface ProjectPopupProps {
  appName: string;
  processName: string;
  activeProjectIds?: Set<string>;
  onSelect: (projectId: string) => void;
  onDismiss: () => void;
}

const APP_ICONS: Record<string, string> = {
  'visual studio code': '💻', 'code': '💻',
  'google chrome': '🌐', 'chrome': '🌐',
  'figma': '🎨',
  'microsoft teams': '💬', 'teams': '💬',
  'notion': '📝',
  'timetrack': '⏱',
  'browser': '🌐',
};

const getAppIcon = (name: string) => APP_ICONS[name.toLowerCase()] ?? '🖥️';

const ProjectPopup: React.FC<ProjectPopupProps> = ({
  appName,
  processName,
  activeProjectIds = new Set(),
  onSelect,
  onDismiss,
}) => {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [suggestion, setSuggestion] = useState<AppSuggestion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => { loadData(); }, [processName]);

  useEffect(() => {
    if (countdown <= 0) { onDismiss(); return; }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onDismiss]);

  const loadData = async () => {
    try {
      const allProjects = await window.electron.getProjects();
      const active = allProjects.filter((p: Project) => p.isActive);
      const suggested = await window.electron.getSuggestion(processName);

      const available = active.filter((p: Project) => !activeProjectIds.has(p.id));
      const hasSuggestion = suggested && !activeProjectIds.has(suggested.projectId);

      // Nothing to show — dismiss immediately
      if (!hasSuggestion && available.length === 0) {
        onDismiss();
        return;
      }

      setProjects(active);
      setSuggestion(suggested);
      if (suggested) setSelectedProjectId(suggested.projectId);
    } catch (error) { console.error('Failed to load popup data:', error); }
  };

  const availableProjects = projects.filter(p =>
    !activeProjectIds.has(p.id) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.appName && p.appName.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const suggestionProject = suggestion ? projects.find(p => p.id === suggestion.projectId) : null;

  return (
    <div style={{
      width: '340px',
      background: '#161C26',
      borderRadius: '14px',
      border: '1px solid #1E2A3A',
      boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
      overflow: 'hidden',
      fontFamily: 'inherit',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 14px', background: '#111722', position: 'relative' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1.2px', color: '#1FB8A0', marginBottom: '6px' }}>
          {t('popup.appDetected')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '26px' }}>{getAppIcon(appName)}</span>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#E2E8F0' }}>{appName}</span>
        </div>
        <button onClick={onDismiss} style={{
          position: 'absolute', top: '14px', right: '14px',
          background: 'transparent', border: 'none', color: '#718096',
          fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: 0,
        }}>×</button>
      </div>

      {/* Suggestion */}
      {suggestionProject && !activeProjectIds.has(suggestionProject.id) && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1E2A3A' }}>
          <div
            onClick={() => setSelectedProjectId(suggestionProject.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 14px', borderRadius: '10px',
              background: selectedProjectId === suggestionProject.id ? '#1A2535' : '#141B27',
              border: `1px solid ${selectedProjectId === suggestionProject.id ? '#1FB8A0' : '#1E3050'}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: suggestionProject.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '10px', color: '#1FB8A0', fontWeight: '600', marginBottom: '3px' }}>
                {t('popup.lastUsed')}
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {suggestion!.projectName}
              </div>
            </div>
            <div style={{
              width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
              background: selectedProjectId === suggestionProject.id ? '#1FB8A0' : '#1E2A3A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: selectedProjectId === suggestionProject.id ? '#fff' : '#4A5568', fontSize: '14px',
              transition: 'all 0.15s',
            }}>✓</div>
          </div>
        </div>
      )}

      {/* Divider + Search — only show if there are other projects to pick from */}
      {(availableProjects.length > 0 || searchTerm) && (
        <div style={{ padding: '10px 16px 6px', textAlign: 'center', fontSize: '11px', color: '#4A5568' }}>
          {t('popup.orSelect')}
        </div>
      )}

      {(availableProjects.length > 0 || searchTerm) && (
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0D1117', border: '1px solid #1E2A3A', borderRadius: '8px', padding: '8px 12px' }}>
            <span style={{ color: '#4A5568', fontSize: '13px' }}>🔍</span>
            <input
              type="text"
              placeholder={t('popup.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#E2E8F0', fontSize: '13px' }}
            />
          </div>
        </div>
      )}

      {/* Project list */}
      {availableProjects.length > 0 && (
        <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '0 16px 8px' }}>
          {availableProjects.map(project => (
            <div
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', marginBottom: '4px',
                borderRadius: '8px', cursor: 'pointer',
                background: selectedProjectId === project.id ? '#1A2535' : 'transparent',
                border: `1px solid ${selectedProjectId === project.id ? '#1E3A50' : 'transparent'}`,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (selectedProjectId !== project.id) e.currentTarget.style.background = '#111722'; }}
              onMouseLeave={e => { if (selectedProjectId !== project.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: project.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {project.name}
                </div>
                {project.appName && (
                  <div style={{ fontSize: '11px', color: '#4A5568', marginTop: '1px' }}>→ {project.appName}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer buttons */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #1E2A3A', display: 'flex', gap: '10px' }}>
        <button
          onClick={onDismiss}
          style={{
            flex: 1, padding: '11px', background: 'transparent',
            border: '1px solid #1E2A3A', borderRadius: '8px',
            color: '#A0AEC0', fontSize: '14px', fontWeight: '500', cursor: 'pointer',
          }}
        >
          {t('popup.skip')}
        </button>
        <button
          onClick={() => selectedProjectId && onSelect(selectedProjectId)}
          disabled={!selectedProjectId}
          style={{
            flex: 2, padding: '11px',
            background: selectedProjectId ? '#1FB8A0' : '#1E2A3A',
            border: 'none', borderRadius: '8px',
            color: selectedProjectId ? '#FFFFFF' : '#4A5568',
            fontSize: '14px', fontWeight: '600',
            cursor: selectedProjectId ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          {t('popup.confirm')}
        </button>
      </div>
    </div>
  );
};

export default ProjectPopup;
