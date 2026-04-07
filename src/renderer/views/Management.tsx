import React, { useState, useEffect } from 'react';
import ManagerPinModal from '../components/ManagerPinModal';
import AjustarModal from '../components/AjustarModal';
import type { TeamMember, TeamTimeEntry, TeamAuditLog, LocalUserConfig } from '../../shared/types';
import { useI18n } from '../i18nContext';

const MEMBER_COLORS = [
  '#14919B', '#1FB8A0', '#8B5CF6', '#EC4899',
  '#F59E0B', '#10B981', '#3B82F6', '#EF4444',
];

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatAuditTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const Management: React.FC = () => {
  const { t } = useI18n();
  const [pinVerified, setPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pgConnected, setPgConnected] = useState(false);
  const [localUser, setLocalUser] = useState<LocalUserConfig | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamEntries, setTeamEntries] = useState<TeamTimeEntry[]>([]);
  const [auditLog, setAuditLog] = useState<TeamAuditLog[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; subproject?: string }[]>([]);
  const [adjustEntry, setAdjustEntry] = useState<TeamTimeEntry | null>(null);
  const [manualAdjustCount, setManualAdjustCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Add member form
  const [showAddMember, setShowAddMember] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(MEMBER_COLORS[0]);
  const [newGoal, setNewGoal] = useState('8');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    window.electron.getPostgresStatus().then(setPgConnected);
    window.electron.getLocalUser().then(setLocalUser);
    window.electron.getProjects().then(setProjects);
  }, []);

  useEffect(() => {
    if (pinVerified) loadData();
  }, [pinVerified]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, entries, audit] = await Promise.all([
        window.electron.getTeamMembers(),
        window.electron.getTeamEntries(today),
        window.electron.getAuditLog(today),
      ]);
      setMembers(m);
      setTeamEntries(entries);
      setAuditLog(audit);
      setManualAdjustCount(audit.length);
    } finally {
      setLoading(false);
    }
  };

  // Compute per-member totals
  const getMemberEntries = (userId: string) =>
    teamEntries.filter(e => e.user_id === userId && e.end_time);

  const getMemberTotal = (userId: string) =>
    getMemberEntries(userId).reduce((s, e) => s + e.duration, 0);

  const getProjectSummary = (userId: string): string => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const e of getMemberEntries(userId)) {
      if (e.project_name && !seen.has(e.project_name)) {
        seen.add(e.project_name);
        names.push(e.project_name);
      }
    }
    return names.slice(0, 2).join(' · ') || '—';
  };

  const handleAddMember = async () => {
    if (!newName.trim()) return;
    const initials = newName.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().substring(0, 2);
    await window.electron.addTeamMember({
      id: generateId(),
      name: newName.trim(),
      initials,
      color: newColor,
      goal_hours: parseFloat(newGoal) || 8,
    });
    setNewName(''); setNewColor(MEMBER_COLORS[0]); setNewGoal('8');
    setShowAddMember(false);
    await loadData();
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm('Remove this team member?')) return;
    await window.electron.removeTeamMember(id);
    await loadData();
  };

  const handleExportReport = async (member: TeamMember) => {
    await window.electron.exportWeeklyReport(member.id, member.name);
  };

  // ── PIN gate ──
  if (!pinVerified) {
    return (
      <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        {showPinModal && (
          <ManagerPinModal
            onSuccess={() => { setPinVerified(true); setShowPinModal(false); }}
            onCancel={() => setShowPinModal(false)}
          />
        )}
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👔</div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#E8F6F5', marginBottom: '8px' }}>Gestão da Equipe</div>
        <div style={{ fontSize: '13px', color: '#718096', marginBottom: '8px' }}>Acesso exclusivo para gestores</div>
        {!pgConnected && (
          <div style={{ fontSize: '12px', color: '#F6AD55', marginBottom: '16px', background: '#2A1A0A', border: '1px solid #C05621', padding: '8px 14px', borderRadius: '8px' }}>
            ⚠ PostgreSQL not connected — check your .env and PostgreSQL service
          </div>
        )}
        <button
          onClick={() => setShowPinModal(true)}
          disabled={!pgConnected}
          style={{
            padding: '10px 28px', background: pgConnected ? '#1FB8A0' : '#2D3748',
            border: 'none', borderRadius: '8px', color: pgConnected ? '#0B5563' : '#4A5568',
            fontWeight: 700, fontSize: '14px', cursor: pgConnected ? 'pointer' : 'not-allowed',
          }}
        >
          Enter PIN
        </button>
      </div>
    );
  }

  // ── Main page ──
  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      {adjustEntry && localUser && (
        <AjustarModal
          entry={adjustEntry}
          member={members.find(m => m.id === adjustEntry.user_id)!}
          projects={projects}
          managerId={localUser.id}
          managerName={localUser.name}
          onSave={async () => { setAdjustEntry(null); await loadData(); }}
          onClose={() => setAdjustEntry(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#E2E8F0' }}>Gestão da Equipe</div>
          <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
            Acesso exclusivo para gestores · Hoje, {new Date().toLocaleDateString('pt-BR')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="btn"
          >
            + Membro
          </button>
          <button
            onClick={loadData}
            className="btn"
          >
            ↻ Atualizar
          </button>
        </div>
      </div>

      {/* Manual adjustments alert */}
      {manualAdjustCount > 0 && (
        <div style={{
          background: '#2A1A0A', border: '1px solid #C05621', borderRadius: '10px',
          padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#F6AD55',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span>⚠</span>
          <span>
            <strong>{manualAdjustCount} ajuste{manualAdjustCount > 1 ? 's' : ''} manual{manualAdjustCount > 1 ? 'is' : ''}</strong> realizados hoje — todos registrados no audit log abaixo
          </span>
        </div>
      )}

      {/* Add member form */}
      {showAddMember && (
        <div style={{ background: '#161C26', border: '1px solid #1E2530', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0', marginBottom: '14px' }}>Add Team Member</div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Daily Goal (h)</label>
              <input type="number" value={newGoal} onChange={e => setNewGoal(e.target.value)} min="1" max="24" style={{ ...inputStyle, width: '80px' }} />
            </div>
            <div>
              <label style={labelStyle}>Color</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {MEMBER_COLORS.map(c => (
                  <div key={c} onClick={() => setNewColor(c)} style={{
                    width: '24px', height: '24px', borderRadius: '6px', background: c, cursor: 'pointer',
                    border: newColor === c ? '2px solid #E8F6F5' : '2px solid transparent',
                  }} />
                ))}
              </div>
            </div>
            <button onClick={handleAddMember} className="btn btn-primary" style={{ height: '32px' }}>Add</button>
            <button onClick={() => setShowAddMember(false)} className="btn" style={{ height: '32px' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#4A5568', fontSize: '14px', padding: '40px', textAlign: 'center' }}>Loading...</div>
      ) : (
        <>
          {/* Members table */}
          <div style={{ background: '#161C26', border: '1px solid #1E2530', borderRadius: '12px', marginBottom: '24px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #1A1F2B', display: 'grid', gridTemplateColumns: '180px 1fr 80px 70px 80px', gap: '12px' }}>
              {['MEMBRO', 'PROJETOS DE HOJE', 'TOTAL', 'META', 'AÇÃO'].map(h => (
                <div key={h} style={{ fontSize: '10px', fontWeight: 700, color: '#4A5568', letterSpacing: '0.8px' }}>{h}</div>
              ))}
            </div>

            {members.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#4A5568', fontSize: '13px' }}>
                No team members yet. Click "+ Membro" to add one.
              </div>
            ) : members.map(member => {
              const total = getMemberTotal(member.id);
              const goalSecs = member.goal_hours * 3600;
              const pct = Math.min(100, Math.round((total / goalSecs) * 100));
              const projects = getProjectSummary(member.id);

              return (
                <div key={member.id} style={{ padding: '14px 16px', borderBottom: '1px solid #1A1F2B', display: 'grid', gridTemplateColumns: '180px 1fr 80px 70px 80px', gap: '12px', alignItems: 'center' }}>
                  {/* Member */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px', background: member.color, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white',
                    }}>
                      {member.initials}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0' }}>{member.name}</div>
                    </div>
                  </div>

                  {/* Projects + progress */}
                  <div>
                    <div style={{ fontSize: '12px', color: '#A0AEC0', marginBottom: '5px' }}>{projects}</div>
                    <div style={{ height: '4px', background: '#1E2530', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: member.color, borderRadius: '2px', transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Total */}
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0' }}>{formatDuration(total)}</div>

                  {/* Goal % */}
                  <div style={{ fontSize: '13px', fontWeight: 700, color: pct >= 100 ? '#1FB8A0' : pct >= 75 ? '#F6AD55' : '#FC8181' }}>
                    {pct}%
                  </div>

                  {/* Action */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => {
                        const entries = getMemberEntries(member.id);
                        if (entries.length > 0) setAdjustEntry(entries[0]);
                      }}
                      className="btn"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                    >
                      Ajustar
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      style={{ background: 'none', border: 'none', color: '#4A5568', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                      title="Remove member"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audit log */}
          {auditLog.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#4A5568', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                AUDIT LOG — AJUSTES MANUAIS DE HOJE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {auditLog.map(log => (
                  <div key={log.id} style={{ background: '#161C26', border: '1px solid #1E2530', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#F6AD55', fontSize: '14px', marginTop: '1px' }}>✏</span>
                      <div>
                        <div style={{ fontSize: '13px', color: '#CBD5E0' }}>
                          <strong style={{ color: '#E2E8F0' }}>{log.manager_name}</strong> ajustou registro de{' '}
                          <strong style={{ color: '#E2E8F0' }}>{log.target_user_name}</strong> no projeto {log.project_name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#718096', marginTop: '3px' }}>
                          {log.old_start_time ? formatTime(log.old_start_time) : '?'}
                          {log.old_end_time ? `–${formatTime(log.old_end_time)}` : ''}
                          {' → '}
                          {log.new_start_time ? formatTime(log.new_start_time) : '?'}
                          {log.new_end_time ? `–${formatTime(log.new_end_time)}` : ''}
                          {log.new_project && log.new_project !== log.project_name ? ` · ${log.new_project}` : ''}
                          {' — Motivo: '}{log.motive}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#4A5568', flexShrink: 0 }}>{formatAuditTime(log.created_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: '#4A5568',
  textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '5px',
};

const inputStyle: React.CSSProperties = {
  padding: '7px 10px', background: '#0A0E14', border: '1px solid #1E2530',
  borderRadius: '7px', color: '#E2E8F0', fontSize: '13px', outline: 'none',
};

export default Management;
