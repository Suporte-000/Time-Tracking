import React, { useState, useEffect } from 'react';
import { TimeEntry, Project, DailySummary } from '../../shared/types';
import { UI_COLORS } from '../../shared/colors';

const History: React.FC = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [entries, allProjects] = await Promise.all([
        window.electron.getTimeEntries(selectedDate),
        window.electron.getProjects(),
      ]);

      setTimeEntries(entries);
      setProjects(allProjects);
      calculateSummary(entries);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (entries: TimeEntry[]) => {
    const totalTime = entries.reduce((acc, entry) => acc + entry.duration, 0);
    const projectCount = new Set(entries.map(e => e.projectId).filter(Boolean)).size;
    const unlinkedTime = entries
      .filter(e => !e.projectId)
      .reduce((acc, e) => acc + e.duration, 0);
    const pauseTime = entries
      .filter(e => e.status === 'paused')
      .reduce((acc, e) => acc + e.duration, 0);

    setSummary({
      date: selectedDate,
      totalTime,
      projectCount,
      entryCount: entries.length,
      unlinkedTime,
      pauseTime,
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProjectById = (id: string | null): Project | undefined => {
    if (!id) return undefined;
    return projects.find(p => p.id === id);
  };

  const handleExportCSV = () => {
    // CSV headers
    const headers = [
      'Data',
      'Início',
      'Fim',
      'Duração',
      'Projeto',
      'Subprojeto',
      'Aplicativo',
      'Status',
    ];

    // CSV rows
    const rows = timeEntries.map(entry => {
      const project = getProjectById(entry.projectId);
      return [
        selectedDate,
        formatTime(entry.startTime),
        entry.endTime ? formatTime(entry.endTime) : '-',
        formatDuration(entry.duration),
        project?.name || 'Sem projeto',
        project?.subproject || '-',
        entry.appName,
        entry.status,
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';')),
    ].join('\n');

    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `timetrack_${selectedDate}.csv`;
    link.click();
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <div style={{ color: UI_COLORS.text.secondary }}>Carregando histórico...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: '600',
          color: UI_COLORS.text.primary,
        }}>
          Histórico Detalhado
        </h2>

        <button
          onClick={handleExportCSV}
          disabled={timeEntries.length === 0}
          style={{
            padding: '10px 20px',
            background: timeEntries.length > 0 ? UI_COLORS.brand.accent : UI_COLORS.bg.hover,
            border: 'none',
            borderRadius: '8px',
            color: timeEntries.length > 0 ? '#FFFFFF' : UI_COLORS.text.muted,
            fontSize: '14px',
            fontWeight: '600',
            cursor: timeEntries.length > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          📊 Exportar CSV
        </button>
      </div>

      {/* Date Navigator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        marginBottom: '24px',
        padding: '16px',
        background: UI_COLORS.bg.card,
        borderRadius: '12px',
        border: `1px solid ${UI_COLORS.border.primary}`,
      }}>
        <button
          onClick={() => changeDate(-1)}
          style={{
            padding: '8px 12px',
            background: UI_COLORS.bg.hover,
            border: `1px solid ${UI_COLORS.border.secondary}`,
            borderRadius: '6px',
            color: UI_COLORS.text.primary,
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          ←
        </button>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          style={{
            padding: '10px 16px',
            background: UI_COLORS.bg.primary,
            border: `1px solid ${UI_COLORS.border.primary}`,
            borderRadius: '8px',
            color: UI_COLORS.text.primary,
            fontSize: '14px',
            fontWeight: '500',
          }}
        />

        <button
          onClick={() => changeDate(1)}
          disabled={selectedDate >= new Date().toISOString().split('T')[0]}
          style={{
            padding: '8px 12px',
            background: UI_COLORS.bg.hover,
            border: `1px solid ${UI_COLORS.border.secondary}`,
            borderRadius: '6px',
            color: UI_COLORS.text.primary,
            cursor: selectedDate < new Date().toISOString().split('T')[0] ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            opacity: selectedDate >= new Date().toISOString().split('T')[0] ? 0.5 : 1,
          }}
        >
          →
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{
            padding: '20px',
            background: UI_COLORS.bg.card,
            borderRadius: '12px',
            border: `1px solid ${UI_COLORS.border.primary}`,
          }}>
            <div style={{
              fontSize: '12px',
              color: UI_COLORS.text.muted,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Tempo Total
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: UI_COLORS.brand.accent,
            }}>
              {formatDuration(summary.totalTime)}
            </div>
          </div>

          <div style={{
            padding: '20px',
            background: UI_COLORS.bg.card,
            borderRadius: '12px',
            border: `1px solid ${UI_COLORS.border.primary}`,
          }}>
            <div style={{
              fontSize: '12px',
              color: UI_COLORS.text.muted,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Projetos
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: UI_COLORS.text.primary,
            }}>
              {summary.projectCount}
            </div>
          </div>

          <div style={{
            padding: '20px',
            background: UI_COLORS.bg.card,
            borderRadius: '12px',
            border: `1px solid ${UI_COLORS.border.primary}`,
          }}>
            <div style={{
              fontSize: '12px',
              color: UI_COLORS.text.muted,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Entradas
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: UI_COLORS.text.primary,
            }}>
              {summary.entryCount}
            </div>
          </div>

          <div style={{
            padding: '20px',
            background: UI_COLORS.bg.card,
            borderRadius: '12px',
            border: `1px solid ${UI_COLORS.border.primary}`,
          }}>
            <div style={{
              fontSize: '12px',
              color: UI_COLORS.text.muted,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Sem Projeto
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: UI_COLORS.status.warning,
            }}>
              {formatDuration(summary.unlinkedTime)}
            </div>
          </div>
        </div>
      )}

      {/* Time Entries List */}
      <div style={{
        background: UI_COLORS.bg.card,
        borderRadius: '12px',
        border: `1px solid ${UI_COLORS.border.primary}`,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${UI_COLORS.border.primary}`,
          fontWeight: '600',
          fontSize: '14px',
          color: UI_COLORS.text.primary,
        }}>
          Entradas de Tempo ({timeEntries.length})
        </div>

        {timeEntries.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: UI_COLORS.text.muted,
          }}>
            Nenhuma entrada de tempo para esta data
          </div>
        ) : (
          <div>
            {timeEntries.map((entry) => {
              const project = getProjectById(entry.projectId);
              return (
                <div
                  key={entry.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: `1px solid ${UI_COLORS.border.primary}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  {/* Project Color */}
                  <div style={{
                    width: '4px',
                    height: '40px',
                    borderRadius: '2px',
                    background: project?.color || UI_COLORS.text.muted,
                    flexShrink: 0,
                  }} />

                  {/* Time Range */}
                  <div style={{ minWidth: '100px' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: UI_COLORS.text.primary,
                    }}>
                      {formatTime(entry.startTime)}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: UI_COLORS.text.muted,
                    }}>
                      {entry.endTime ? formatTime(entry.endTime) : 'Em andamento'}
                    </div>
                  </div>

                  {/* Project Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: UI_COLORS.text.primary,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {project?.name || 'Sem projeto'}
                      {project?.subproject && (
                        <span style={{
                          color: UI_COLORS.text.secondary,
                          fontWeight: '400',
                        }}>
                          {' › '}{project.subproject}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: UI_COLORS.text.muted,
                      marginTop: '2px',
                    }}>
                      {entry.appName}
                    </div>
                  </div>

                  {/* Duration */}
                  <div style={{
                    minWidth: '80px',
                    textAlign: 'right',
                  }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: UI_COLORS.brand.accent,
                    }}>
                      {formatDuration(entry.duration)}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: UI_COLORS.text.muted,
                      textTransform: 'uppercase',
                      marginTop: '2px',
                    }}>
                      {entry.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
