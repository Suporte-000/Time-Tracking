import React, { useState } from 'react';
import type { TeamTimeEntry, TeamMember } from '../../shared/types';
import { useI18n } from '../i18nContext';

interface Props {
  entry: TeamTimeEntry;
  member: TeamMember;
  projects: { id: string; name: string; subproject?: string }[];
  managerId: string;
  managerName: string;
  onSave: () => void;
  onClose: () => void;
}

function toLocalInput(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

const AjustarModal: React.FC<Props> = ({ entry, member, projects, managerId, managerName, onSave, onClose }) => {
  const { t } = useI18n();
  const [startTime, setStartTime] = useState(toLocalInput(entry.start_time));
  const [endTime, setEndTime] = useState(toLocalInput(entry.end_time));
  const [projectId, setProjectId] = useState(entry.project_id || '');
  const [motive, setMotive] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const newDuration = startTime && endTime
    ? Math.max(0, Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000))
    : 0;

  const handleSave = async () => {
    if (!startTime) { setError(t('adjust.startRequired')); return; }
    if (!motive.trim()) { setError(t('adjust.motiveRequired')); return; }
    if (endTime && new Date(endTime) <= new Date(startTime)) {
      setError(t('adjust.endAfterStart')); return;
    }

    setSaving(true);
    try {
      const selectedProject = projects.find(p => p.id === projectId);
      await window.electron.adjustTimeEntry({
        entryId: entry.id,
        managerId,
        managerName,
        targetUserId: entry.user_id,
        targetUserName: entry.user_name,
        projectName: entry.project_name || 'No Project',
        oldStartTime: entry.start_time,
        oldEndTime: entry.end_time,
        oldProject: entry.project_name,
        newStartTime: new Date(startTime).toISOString(),
        newEndTime: endTime ? new Date(endTime).toISOString() : null,
        newProjectId: projectId || null,
        newProjectName: selectedProject?.name ?? null,
        motive: motive.trim(),
      });
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save adjustment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: '#161C26', border: '1px solid #1E2530', borderRadius: '14px',
        padding: '28px 32px', width: '460px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#E8F6F5' }}>{t('adjust.title')}</div>
            <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>
              {member.name} · {entry.app_name}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#718096', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Original values */}
        <div style={{ background: '#0A0E14', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '12px', color: '#4A5568' }}>
          <span style={{ color: '#718096' }}>{t('adjust.original')}: </span>
          {toLocalInput(entry.start_time).replace('T', ' ')} → {entry.end_time ? toLocalInput(entry.end_time).replace('T', ' ') : t('adjust.active')}
          {' · '}{entry.project_name || t('adjust.noProject')}
          {entry.is_manually_adjusted && entry.adjustment_reason && (
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #1E2530', color: '#F6AD55' }}>
              <span style={{ color: '#718096' }}>{t('adjust.motive')}: </span>
              {entry.adjustment_reason}
            </div>
          )}
        </div>

        {/* Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div>
            <label style={labelStyle}>{t('adjust.startTime')}</label>
            <input type="datetime-local" value={startTime} onChange={e => { setStartTime(e.target.value); setError(''); }} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('adjust.endTime')}</label>
            <input type="datetime-local" value={endTime} onChange={e => { setEndTime(e.target.value); setError(''); }} style={inputStyle} />
          </div>
        </div>

        {startTime && endTime && (
          <div style={{ fontSize: '12px', color: '#1FB8A0', marginBottom: '14px' }}>
            {t('adjust.newDuration')}: {formatDuration(newDuration)}
          </div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>{t('adjust.project')}</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">{t('adjust.noProject')}</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.subproject ? ` › ${p.subproject}` : ''}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>{t('adjust.motive')} <span style={{ color: '#FC8181' }}>*</span></label>
          <textarea
            value={motive}
            onChange={e => { setMotive(e.target.value); setError(''); }}
            placeholder={t('adjust.motivePlaceholder')}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {error && <div style={{ color: '#FC8181', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', background: 'transparent', border: '1px solid #1E2530', borderRadius: '8px', color: '#718096', fontSize: '13px', cursor: 'pointer' }}>
            {t('common.cancel')}
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '9px', background: '#1FB8A0', border: 'none', borderRadius: '8px', color: '#0B5563', fontWeight: 700, fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? t('adjust.saving') : t('adjust.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: '#4A5568',
  textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '5px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: '#0A0E14',
  border: '1px solid #1E2530', borderRadius: '7px', color: '#E2E8F0',
  fontSize: '13px', outline: 'none',
};

export default AjustarModal;
