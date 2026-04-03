import React, { useState, useEffect } from 'react';
import { Project, AppSuggestion } from '../../shared/types';
import { UI_COLORS } from '../../shared/colors';

interface ProjectPopupProps {
  appName: string;
  processName: string;
  onSelect: (projectId: string) => void;
  onDismiss: () => void;
}

const ProjectPopup: React.FC<ProjectPopupProps> = ({
  appName,
  processName,
  onSelect,
  onDismiss
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [suggestion, setSuggestion] = useState<AppSuggestion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30); // 30 second auto-close

  useEffect(() => {
    loadData();
  }, [processName]);

  useEffect(() => {
    // Auto-close countdown
    if (countdown <= 0) {
      onDismiss();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onDismiss]);

  const loadData = async () => {
    try {
      // Load all projects
      const allProjects = await window.electron.getProjects();
      setProjects(allProjects.filter((p: Project) => p.isActive));

      // Get suggestion for this process
      const suggested = await window.electron.getSuggestion(processName);
      setSuggestion(suggested);

      if (suggested) {
        setSelectedProjectId(suggested.projectId);
      }
    } catch (error) {
      console.error('Failed to load popup data:', error);
    }
  };

  const handleConfirm = () => {
    if (selectedProjectId) {
      onSelect(selectedProjectId);
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.subproject && p.subproject.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '360px',
        background: UI_COLORS.bg.card,
        borderRadius: '12px',
        border: `1px solid ${UI_COLORS.border.primary}`,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${UI_COLORS.border.primary}`,
          background: UI_COLORS.bg.secondary,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: UI_COLORS.text.primary,
            }}>
              Vincular Projeto
            </h3>
            <button
              onClick={onDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                color: UI_COLORS.text.muted,
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
          <div style={{
            fontSize: '13px',
            color: UI_COLORS.text.secondary,
          }}>
            Detectado: <strong>{appName}</strong>
          </div>
          <div style={{
            fontSize: '11px',
            color: UI_COLORS.text.muted,
            marginTop: '4px',
          }}>
            Auto-fecha em {countdown}s
          </div>
        </div>

        {/* Suggestion */}
        {suggestion && (
          <div style={{
            padding: '12px 20px',
            background: `${UI_COLORS.brand.accent}15`,
            borderBottom: `1px solid ${UI_COLORS.border.primary}`,
          }}>
            <div style={{
              fontSize: '11px',
              color: UI_COLORS.brand.accent,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
            }}>
              💡 Sugestão
            </div>
            <div style={{
              fontSize: '14px',
              color: UI_COLORS.text.primary,
              fontWeight: '500',
            }}>
              {suggestion.projectName}
              {suggestion.subproject && (
                <span style={{
                  color: UI_COLORS.text.secondary,
                  fontSize: '13px',
                }}>
                  {' › '}{suggestion.subproject}
                </span>
              )}
            </div>
            <div style={{
              fontSize: '11px',
              color: UI_COLORS.text.muted,
              marginTop: '4px',
            }}>
              Usado {suggestion.useCount}× neste app
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ padding: '16px 20px' }}>
          <input
            type="text"
            placeholder="Buscar projeto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: UI_COLORS.bg.primary,
              border: `1px solid ${UI_COLORS.border.primary}`,
              borderRadius: '6px',
              color: UI_COLORS.text.primary,
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* Project List */}
        <div style={{
          maxHeight: '240px',
          overflowY: 'auto',
          padding: '0 20px',
        }}>
          {filteredProjects.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: UI_COLORS.text.muted,
              fontSize: '13px',
            }}>
              Nenhum projeto encontrado
            </div>
          ) : (
            filteredProjects.map(project => (
              <div
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                style={{
                  padding: '10px 12px',
                  marginBottom: '6px',
                  background: selectedProjectId === project.id
                    ? UI_COLORS.bg.hover
                    : 'transparent',
                  border: `1px solid ${
                    selectedProjectId === project.id
                      ? UI_COLORS.brand.accent
                      : UI_COLORS.border.primary
                  }`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    background: project.color,
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: UI_COLORS.text.primary,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {project.name}
                    </div>
                    {project.subproject && (
                      <div style={{
                        fontSize: '12px',
                        color: UI_COLORS.text.secondary,
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {project.subproject}
                      </div>
                    )}
                  </div>
                  {selectedProjectId === project.id && (
                    <div style={{
                      color: UI_COLORS.brand.accent,
                      fontSize: '16px',
                    }}>
                      ✓
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${UI_COLORS.border.primary}`,
          display: 'flex',
          gap: '10px',
        }}>
          <button
            onClick={onDismiss}
            style={{
              flex: 1,
              padding: '10px',
              background: 'transparent',
              border: `1px solid ${UI_COLORS.border.secondary}`,
              borderRadius: '6px',
              color: UI_COLORS.text.secondary,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedProjectId}
            style={{
              flex: 2,
              padding: '10px',
              background: selectedProjectId
                ? UI_COLORS.brand.accent
                : UI_COLORS.bg.hover,
              border: 'none',
              borderRadius: '6px',
              color: selectedProjectId
                ? '#FFFFFF'
                : UI_COLORS.text.muted,
              fontSize: '14px',
              fontWeight: '600',
              cursor: selectedProjectId ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            Iniciar Rastreamento
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectPopup;
