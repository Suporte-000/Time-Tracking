import React, { useState, useEffect } from 'react';
import { TimeEntry, Project } from '../../shared/types';
import { useI18n } from '../i18nContext';

const LOCALE_MAP: Record<string, string> = { 'en': 'en-US', 'es': 'es-ES', 'pt-BR': 'pt-BR' };

const STATUS_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  auto:     { bg: '#1a3a2a', color: '#4ade80' },
  manual:   { bg: '#1a2a3a', color: '#60a5fa' },
  paused:   { bg: '#2a1a3a', color: '#a78bfa' },
  adjusted: { bg: '#3a2a1a', color: '#f59e0b' },
};

const History: React.FC = () => {
  const { t, lang } = useI18n();
  const locale = LOCALE_MAP[lang] || 'pt-BR';

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [entries, allProjects] = await Promise.all([
        window.electron.getTimeEntries(selectedDate),
        window.electron.getProjects(),
      ]);
      setTimeEntries(entries);
      setProjects(allProjects);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Last 5 days as tabs
  const dateTabs = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  const formatTabLabel = (dateStr: string): string => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const d = new Date(dateStr + 'T12:00:00');
    const dayMonth = d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
    if (dateStr === today) return `${t('history.today')}, ${dayMonth}`;
    if (dateStr === yesterday) return `${t('history.yesterday')}, ${dayMonth}`;
    const weekday = d.toLocaleDateString(locale, { weekday: 'short' });
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1, 3)}, ${dayMonth}`;
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  const formatDuration = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getProject = (id: string | null) => id ? projects.find(p => p.id === id) : undefined;

  const handleExportCSV = () => {
    if (timeEntries.length === 0) return;
    const headers = ['Horário início', 'Horário fim', 'Aplicativo', 'Projeto', 'Duração (s)', 'Origem'];
    const rows = timeEntries.map(e => {
      const p = getProject(e.projectId);
      return [formatTime(e.startTime), e.endTime ? formatTime(e.endTime) : '-', e.appName, p?.name || '-', e.duration, e.status];
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `timetrack_${selectedDate}.csv`; a.click();
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm(t('history.deleteConfirm'))) return;
    await window.electron.deleteTimeEntry(id);
    await loadData();
  };

  // KPIs
  const totalSecs = timeEntries.reduce((s, e) => s + e.duration, 0);
  const projectCount = new Set(timeEntries.map(e => e.projectId).filter(Boolean)).size;
  const linkedCount = timeEntries.filter(e => e.projectId).length;
  const linkedPct = timeEntries.length > 0 ? Math.round((linkedCount / timeEntries.length) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Sticky header ── */}
      <div style={{ flexShrink: 0, padding: '24px 28px 0', background: '#0B0F17', borderBottom: '1px solid #1A1F2B' }}>

        {/* Title row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#E2E8F0' }}>{t('history.title')}</h2>
            <div style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>{t('history.subtitle')}</div>
          </div>
          <button onClick={handleExportCSV} disabled={timeEntries.length === 0}
            style={{ padding: '9px 18px', background: timeEntries.length > 0 ? '#1FB8A0' : '#1E2A3A', border: 'none', borderRadius: '8px', color: timeEntries.length > 0 ? '#fff' : '#4A5568', fontSize: '13px', fontWeight: '600', cursor: timeEntries.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⬇ {t('history.exportCsv')}
          </button>
        </div>

        {/* Date tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {dateTabs.map(date => {
            const active = date === selectedDate;
            return (
              <button key={date} onClick={() => setSelectedDate(date)}
                style={{ padding: '8px 16px', borderRadius: '20px', border: `1px solid ${active ? '#1FB8A0' : '#1E2A3A'}`, background: active ? '#1FB8A0' : 'transparent', color: active ? '#fff' : '#A0AEC0', fontSize: '13px', fontWeight: active ? '600' : '400', cursor: 'pointer', transition: 'all 0.15s' }}>
                {formatTabLabel(date)}
              </button>
            );
          })}
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          {[
            { label: t('history.totalTime'), value: formatDuration(totalSecs), color: '#4ade80' },
            { label: t('history.projects'),  value: String(projectCount),       color: '#E2E8F0' },
            { label: t('history.entries'),   value: String(timeEntries.length), color: '#E2E8F0' },
            { label: t('history.linked'),    value: `${linkedPct}%`,            color: '#1FB8A0' },
          ].map(kpi => (
            <div key={kpi.label} style={{ padding: '18px 20px', background: '#161C26', borderRadius: '12px', border: '1px solid #1E2A3A' }}>
              <div style={{ fontSize: '11px', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>{kpi.label}</div>
              <div style={{ fontSize: '26px', fontWeight: '700', color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

      </div>{/* end sticky header */}

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>

      {/* Table */}
      <div style={{ background: '#161C26', borderRadius: '12px', border: '1px solid #1E2A3A', overflow: 'hidden' }}>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 90px 100px', padding: '10px 20px', borderBottom: '1px solid #1E2A3A' }}>
          {([
            t('history.col.time'),
            t('history.col.app'),
            t('history.col.project'),
            t('history.col.duration'),
            t('history.col.origin'),
          ]).map(h => (
            <div key={h} style={{ fontSize: '11px', fontWeight: '600', color: '#4A5568', letterSpacing: '0.6px' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#718096', fontSize: '14px' }}>{t('history.loading')}</div>
        ) : timeEntries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#4A5568', fontSize: '14px' }}>{t('history.noEntries')}</div>
        ) : (
          timeEntries.map((entry, i) => {
            const project = getProject(entry.projectId);
            const badgeStyle = STATUS_BADGE_STYLE[entry.status] || STATUS_BADGE_STYLE['manual'];
            const statusKey = `history.status.${entry.status}` as any;
            const badgeLabel = t(statusKey) || entry.status;
            const isLast = i === timeEntries.length - 1;
            return (
              <div key={entry.id}
                style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 90px 100px', padding: '13px 20px', borderBottom: isLast ? 'none' : '1px solid #1E2A3A', alignItems: 'center', transition: 'background 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#111722'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>

                {/* Time range */}
                <div style={{ fontSize: '13px', color: '#60a5fa', fontWeight: '500' }}>
                  {formatTime(entry.startTime)} – {entry.endTime ? formatTime(entry.endTime) : '…'}
                </div>

                {/* App */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: project?.color || '#4A5568', flexShrink: 0 }} />
                  <span style={{ fontSize: '14px', color: entry.appName ? '#E2E8F0' : '#4A5568' }}>
                    {entry.appName || '—'}
                  </span>
                </div>

                {/* Project */}
                <div style={{ fontSize: '14px', color: project ? '#E2E8F0' : '#4A5568', fontWeight: project ? '500' : '400' }}>
                  {project ? `${project.name}${project.subproject ? ` › ${project.subproject}` : ''}` : '—'}
                </div>

                {/* Duration */}
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#E2E8F0' }}>
                  {formatDuration(entry.duration)}
                </div>

                {/* Status badge */}
                <div>
                  <span style={{ padding: '3px 10px', borderRadius: '6px', background: badgeStyle.bg, color: badgeStyle.color, fontSize: '12px', fontWeight: '600' }}>
                    {badgeLabel}
                  </span>
                </div>

              </div>
            );
          })
        )}
      </div>
      </div>{/* end scrollable content */}
    </div>
  );
};

export default History;
