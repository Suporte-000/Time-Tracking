import React, { useState, useEffect, useRef } from 'react';
import AjustarModal from '../components/AjustarModal';
import type { TeamMember, TeamTimeEntry, TeamAuditLog, LocalUserConfig } from '../../shared/types';
import { useI18n } from '../i18nContext';

// ── helpers ──────────────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
function formatMins(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function calcDuration(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000));
}
function formatDatePT(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
function getInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().substring(0, 2);
}

const MEMBER_COLORS = ['#14919B','#1FB8A0','#8B5CF6','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444'];

// ── Change Password modal ─────────────────────────────────────────────────────
const ChangePinModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useI18n();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);

  const handleSave = async () => {
    if (!current) { setMsg(t('password.currentRequired')); return; }
    const valid = await window.electron.verifyManagerPin(current);
    if (!valid) { setMsg(t('password.currentIncorrect')); return; }
    if (!next || next.length < 4) { setMsg(t('password.tooShort')); return; }
    if (next !== confirm) { setMsg(t('password.noMatch')); return; }
    await window.electron.setManagerPin(next);
    setMsg(''); setOk(true);
    setTimeout(onClose, 1200);
  };

  const fields = [t('password.current'), t('password.new'), t('password.confirm')];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'14px', padding:'28px 32px', width:'340px' }}>
        <div style={{ fontSize:'16px', fontWeight:700, color:'#E8F6F5', marginBottom:'20px' }}>{t('password.changeTitle')}</div>
        {fields.map((label, i) => (
          <div key={i} style={{ marginBottom:'12px' }}>
            <label style={labelStyle}>{label}</label>
            <input type="password" value={[current,next,confirm][i]}
              onChange={e => [setCurrent,setNext,setConfirm][i](e.target.value)}
              onKeyDown={e => e.key==='Enter' && handleSave()}
              style={inputStyle} />
          </div>
        ))}
        {msg && <div style={{ fontSize:'12px', color:'#FC8181', marginBottom:'10px' }}>{msg}</div>}
        {ok  && <div style={{ fontSize:'12px', color:'#1FB8A0', marginBottom:'10px' }}>{t('password.updated')}</div>}
        <div style={{ display:'flex', gap:'10px', marginTop:'8px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'9px', background:'transparent', border:'1px solid #1E2530', borderRadius:'8px', color:'#718096', cursor:'pointer' }}>{t('common.cancel')}</button>
          <button onClick={handleSave} style={{ flex:2, padding:'9px', background:'#1FB8A0', border:'none', borderRadius:'8px', color:'#0B5563', fontWeight:700, cursor:'pointer' }}>{t('password.save')}</button>
        </div>
      </div>
    </div>
  );
};

// ── Add/Edit Project modal ───────────────────────────────────────────────────
const PROJECT_COLORS = ['#0B5563','#14919B','#1FB8A0','#8B5CF6','#EC4899','#F59E0B','#10B981','#3B82F6'];

const ProjectModal: React.FC<{
  project?: any;
  onSave: (name: string, subproject: string, color: string) => void;
  onClose: () => void;
}> = ({ project, onSave, onClose }) => {
  const { t } = useI18n();
  const [name, setName] = useState(project?.name || '');
  const [sub, setSub] = useState(project?.subproject || '');
  const [color, setColor] = useState(project?.color || PROJECT_COLORS[0]);
  const [err, setErr] = useState('');

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'14px', padding:'28px 32px', width:'380px' }}>
        <div style={{ fontSize:'16px', fontWeight:700, color:'#E8F6F5', marginBottom:'20px' }}>{project ? t('modal.editProject') : t('modal.newProject')}</div>
        <label style={labelStyle}>{t('modal.projectName')}</label>
        <input value={name} onChange={e=>{setName(e.target.value);setErr('');}} autoFocus style={{ ...inputStyle, marginBottom:'14px' }} />
        <label style={labelStyle}>{t('modal.subproject')}</label>
        <input value={sub} onChange={e=>setSub(e.target.value)} style={{ ...inputStyle, marginBottom:'14px' }} />
        <label style={labelStyle}>{t('modal.color')}</label>
        <div style={{ display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap' }}>
          {PROJECT_COLORS.map(c => (
            <div key={c} onClick={()=>setColor(c)} style={{ width:'28px', height:'28px', borderRadius:'7px', background:c, cursor:'pointer', border: color===c ? '3px solid #E8F6F5' : '3px solid transparent' }} />
          ))}
        </div>
        {err && <div style={{ fontSize:'12px', color:'#FC8181', marginBottom:'10px' }}>{err}</div>}
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'9px', background:'transparent', border:'1px solid #1E2530', borderRadius:'8px', color:'#718096', cursor:'pointer' }}>{t('common.cancel')}</button>
          <button onClick={()=>{ if(!name.trim()){setErr(t('modal.nameRequired'));return;} onSave(name.trim(), sub.trim(), color); }} style={{ flex:2, padding:'9px', background:'#1FB8A0', border:'none', borderRadius:'8px', color:'#0B5563', fontWeight:700, cursor:'pointer' }}>{t('common.save')}</button>
        </div>
      </div>
    </div>
  );
};

// ── Add Program modal ────────────────────────────────────────────────────────
const AddProgramModal: React.FC<{
  projectName?: string;
  onSave: (processName: string, displayName: string) => void;
  onClose: () => void;
}> = ({ projectName, onSave, onClose }) => {
  const { t } = useI18n();
  const [displayName, setDisplayName] = useState('');
  const [processName, setProcessName] = useState('');
  const [err, setErr] = useState('');
  const [runningApps, setRunningApps] = useState<{ processName: string; windowTitle: string }[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    window.electron.getRunningApps().then(apps => {
      setRunningApps(apps);
      setLoadingApps(false);
    }).catch(() => setLoadingApps(false));
  }, []);

  function selectApp(app: { processName: string; windowTitle: string }) {
    setProcessName(app.processName);
    setDisplayName(app.windowTitle !== 'N/A' ? app.windowTitle : app.processName);
    setErr('');
  }

  function handleSave() {
    if (!displayName.trim()) { setErr(t('modal.displayNameRequired')); return; }
    if (!processName.trim()) { setErr(t('modal.processNameRequired')); return; }
    onSave(processName.trim(), displayName.trim());
  }

  const filtered = runningApps.filter(a =>
    a.processName.toLowerCase().includes(search.toLowerCase()) ||
    a.windowTitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'14px', padding:'28px 32px', width:'420px' }}>
        <div style={{ fontSize:'16px', fontWeight:700, color:'#E8F6F5', marginBottom:'4px' }}>{t('modal.addProgram')}</div>
        {projectName && <div style={{ fontSize:'12px', color:'#718096', marginBottom:'16px' }}>{t('modal.linkedTo')}: {projectName}</div>}
        {!projectName && <div style={{ fontSize:'12px', color:'#4A5568', marginBottom:'16px' }}>{t('modal.noProject')}</div>}

        {/* Running apps picker */}
        <label style={labelStyle}>Select Running Program</label>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          style={{ ...inputStyle, marginBottom:'6px' }}
        />
        <div style={{ maxHeight:'160px', overflowY:'auto', marginBottom:'14px', border:'1px solid #1E2530', borderRadius:'7px' }}>
          {loadingApps ? (
            <div style={{ padding:'12px', color:'#4A5568', fontSize:'12px', textAlign:'center' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:'12px', color:'#4A5568', fontSize:'12px', textAlign:'center' }}>No running apps found</div>
          ) : filtered.map(app => (
            <div key={app.processName} onClick={() => selectApp(app)}
              style={{
                padding:'8px 12px', cursor:'pointer', display:'flex', gap:'8px', alignItems:'center',
                background: processName === app.processName ? '#1E2530' : 'transparent',
                borderBottom:'1px solid #111722',
              }}>
              <span style={{ fontSize:'13px' }}>🖥️</span>
              <div>
                <div style={{ fontSize:'13px', color: processName === app.processName ? '#1FB8A0' : '#CBD5E0' }}>{app.processName}</div>
                <div style={{ fontSize:'11px', color:'#4A5568' }}>{app.windowTitle}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Manual override */}
        <label style={labelStyle}>{t('modal.displayName')}</label>
        <input value={displayName} onChange={e=>{setDisplayName(e.target.value);setErr('');}} placeholder="e.g. Google Chrome" style={{ ...inputStyle, marginBottom:'10px' }} />
        <label style={labelStyle}>{t('modal.processName')}</label>
        <input value={processName} onChange={e=>{setProcessName(e.target.value);setErr('');}} placeholder="e.g. chrome"
          onKeyDown={e=>e.key==='Enter'&&handleSave()}
          style={{ ...inputStyle, marginBottom:'16px' }} />

        {err && <div style={{ fontSize:'12px', color:'#FC8181', marginBottom:'10px' }}>{err}</div>}
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'9px', background:'transparent', border:'1px solid #1E2530', borderRadius:'8px', color:'#718096', cursor:'pointer' }}>{t('common.cancel')}</button>
          <button onClick={handleSave} style={{ flex:2, padding:'9px', background:'#1FB8A0', border:'none', borderRadius:'8px', color:'#0B5563', fontWeight:700, cursor:'pointer' }}>{t('common.add')}</button>
        </div>
      </div>
    </div>
  );
};

// ── PIN gate modal ───────────────────────────────────────────────────────────
const PinGateModal: React.FC<{ onSuccess: ()=>void; onCancel: ()=>void }> = ({ onSuccess, onCancel }) => {
  const { t } = useI18n();
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const verify = async () => {
    const ok = await window.electron.verifyManagerPin(pin);
    if (ok) onSuccess(); else { setErr(t('password.incorrect')); setPin(''); }
  };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'14px', padding:'32px 36px', width:'300px', textAlign:'center' }}>
        <div style={{ fontSize:'32px', marginBottom:'12px' }}>🔒</div>
        <div style={{ fontSize:'16px', fontWeight:700, color:'#E8F6F5', marginBottom:'6px' }}>{t('management.title')}</div>
        <div style={{ fontSize:'12px', color:'#718096', marginBottom:'20px' }}>{t('management.enterPassword')}</div>
        <input type="password" value={pin} onChange={e=>{setPin(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&verify()}
          placeholder={t('password.placeholder')} autoFocus
          style={{ width:'100%', padding:'10px', textAlign:'center', letterSpacing:'4px', background:'#0A0E14', border:`1px solid ${err?'#FC8181':'#1E2530'}`, borderRadius:'8px', color:'#E2E8F0', fontSize:'18px', outline:'none', marginBottom:'8px' }} />
        {err && <div style={{ fontSize:'12px', color:'#FC8181', marginBottom:'10px' }}>{err}</div>}
        <div style={{ display:'flex', gap:'10px', marginTop:'8px' }}>
          <button onClick={onCancel} style={{ flex:1, padding:'9px', background:'transparent', border:'1px solid #1E2530', borderRadius:'8px', color:'#718096', cursor:'pointer' }}>{t('common.cancel')}</button>
          <button onClick={verify} style={{ flex:2, padding:'9px', background:'#1FB8A0', border:'none', borderRadius:'8px', color:'#0B5563', fontWeight:700, cursor:'pointer' }}>{t('password.enter')}</button>
        </div>
      </div>
    </div>
  );
};

// ── Entry Picker modal ───────────────────────────────────────────────────────
const EntryPickerModal: React.FC<{
  member: TeamMember;
  entries: TeamTimeEntry[];
  onPick: (entry: TeamTimeEntry) => void;
  onClose: () => void;
}> = ({ member, entries, onPick, onClose }) => {
  const { t } = useI18n();
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'14px', padding:'28px 32px', width:'480px', maxHeight:'70vh', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div>
            <div style={{ fontSize:'15px', fontWeight:700, color:'#E8F6F5' }}>{t('adjust.title')}</div>
            <div style={{ fontSize:'12px', color:'#718096', marginTop:'2px' }}>{member.name} — {t('adjust.pickEntry')}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#718096', fontSize:'18px', cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          {entries.length === 0 ? (
            <div style={{ textAlign:'center', color:'#4A5568', padding:'24px', fontSize:'13px' }}>{t('adjust.noEntries')}</div>
          ) : entries.map(e => {
            const dur = e.end_time
              ? Math.floor((new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 1000)
              : null;
            const fmt = (secs: number) => { const h = Math.floor(secs/3600); const m = Math.floor((secs%3600)/60); return h>0?`${h}h${m}m`:`${m}m`; };
            const fmtT = (iso: string) => new Date(iso).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
            return (
              <div key={e.id} onClick={() => onPick(e)}
                style={{ padding:'12px 14px', borderRadius:'8px', border:'1px solid #1E2530', marginBottom:'8px', cursor:'pointer', background:'#0A0E14', transition:'border-color 0.15s' }}
                onMouseEnter={ev => (ev.currentTarget.style.borderColor = '#1FB8A0')}
                onMouseLeave={ev => (ev.currentTarget.style.borderColor = '#1E2530')}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#E2E8F0' }}>
                    {e.project_name ? <span style={{ color:'#1FB8A0' }}>{e.project_name}</span> : <span style={{ color:'#4A5568' }}>{t('adjust.noProject')}</span>}
                    <span style={{ color:'#4A5568', fontWeight:400 }}> · {e.app_name}</span>
                  </div>
                  {dur !== null && <span style={{ fontSize:'12px', color:'#A0AEC0' }}>{fmt(dur)}</span>}
                </div>
                <div style={{ fontSize:'11px', color:'#718096', marginTop:'4px' }}>
                  {fmtT(e.start_time)} — {e.end_time ? fmtT(e.end_time) : '●'}
                  {e.is_manually_adjusted && <span style={{ marginLeft:'8px', color:'#F6AD55' }}>✏ {t('adjust.adjusted')}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={onClose} style={{ marginTop:'14px', padding:'9px', background:'transparent', border:'1px solid #1E2530', borderRadius:'8px', color:'#718096', cursor:'pointer', fontSize:'13px' }}>{t('common.cancel')}</button>
      </div>
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
const Management: React.FC = () => {
  const { t } = useI18n();
  const importRef = useRef<HTMLInputElement>(null);
  const [pinVerified, setPinVerified] = useState(false);
  const [showPinGate, setShowPinGate] = useState(false);
  const [pgConnected, setPgConnected] = useState(false);
  const [localUser, setLocalUser] = useState<LocalUserConfig | null>(null);

  // modals
  const [showChangePin, setShowChangePin] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editProject, setEditProject] = useState<any | null>(null);
  const [showAddStandaloneProgram, setShowAddStandaloneProgram] = useState(false);
  const [adjustEntry, setAdjustEntry] = useState<TeamTimeEntry | null>(null);
  const [adjustMember, setAdjustMember] = useState<TeamMember | null>(null);

  // data
  const [projects, setProjects] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamEntries, setTeamEntries] = useState<TeamTimeEntry[]>([]);
  const [auditLog, setAuditLog] = useState<TeamAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'team'|'projects'>('projects');

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    window.electron.getPostgresStatus().then(setPgConnected);
    window.electron.getLocalUser().then(setLocalUser);
  }, []);

  useEffect(() => {
    if (pinVerified) loadAll(selectedDate, true);
  }, [pinVerified]);

  useEffect(() => {
    if (pinVerified) loadDateData(selectedDate);
  }, [selectedDate]);

  const [syncing, setSyncing] = useState(false);

  const loadAll = async (date: string = selectedDate, sync = false) => {
    // Step 1: Load from SQLite cache immediately (fast — no network)
    setLoading(true);
    try {
      const [proj, prog, m, entries, audit] = await Promise.all([
        window.electron.getProjects(),
        window.electron.getProjectPrograms(),
        window.electron.getTeamMembers(),
        window.electron.getTeamEntries(date),
        window.electron.getAuditLog(date),
      ]);
      setProjects(proj);
      setPrograms(prog);
      setMembers(m);
      setTeamEntries(entries);
      setAuditLog(audit);
    } finally { setLoading(false); }

    // Step 2: Sync with PostgreSQL in the background (slow — network)
    if (sync && pgConnected) {
      setSyncing(true);
      try {
        await Promise.all([
          window.electron.pushToPostgres(),
          window.electron.pullFromPostgres(),
        ]);
        // Silently refresh data after sync completes
        const [proj, prog, m, entries, audit] = await Promise.all([
          window.electron.getProjects(),
          window.electron.getProjectPrograms(),
          window.electron.getTeamMembers(),
          window.electron.getTeamEntries(date),
          window.electron.getAuditLog(date),
        ]);
        setProjects(proj);
        setPrograms(prog);
        setMembers(m);
        setTeamEntries(entries);
        setAuditLog(audit);
      } finally { setSyncing(false); }
    }
  };

  const loadDateData = async (date: string) => {
    setLoading(true);
    try {
      const [entries, audit] = await Promise.all([
        window.electron.getTeamEntries(date),
        window.electron.getAuditLog(date),
      ]);
      setTeamEntries(entries);
      setAuditLog(audit);
    } finally { setLoading(false); }
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // ── Project helpers ──
  const handleCreateProject = async (name: string, subproject: string, color: string) => {
    await window.electron.createProject({ name, subproject: subproject || undefined, color, isActive: true });
    setShowProjectModal(false);
    setEditProject(null);
    await loadAll(selectedDate);
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Delete this project? Programs linked to it will also be removed.')) return;
    await window.electron.deleteProject(id);
    await loadAll(selectedDate);
  };

  const handleAddProgram = async (processName: string, displayName: string) => {
    await window.electron.addProjectProgram(null, processName, displayName);
    setShowAddStandaloneProgram(false);
    await loadAll(selectedDate);
  };

  const handleRemoveProgram = async (id: string) => {
    await window.electron.removeProjectProgram(id);
    await loadAll(selectedDate);
  };

  // ── Import CSV ──
  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let count = 0;
    const colors = PROJECT_COLORS;
    for (const line of lines) {
      const parts = line.split('\t');
      const name = parts[0]?.trim();
      if (!name) continue;
      const subproject = parts[1]?.trim() || undefined;
      await window.electron.createProject({ name, subproject, color: colors[count % colors.length], isActive: true });
      count++;
    }
    e.target.value = '';
    await loadAll(selectedDate);
  };

  // ── Team helpers ──
  const getMemberTotal = (userId: string) =>
    teamEntries.filter(e => e.user_id === userId && e.end_time).reduce((s, e) => s + e.duration, 0);

  const getMemberProjects = (userId: string): string => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const e of teamEntries.filter(e => e.user_id === userId && e.end_time)) {
      if (e.project_name && !seen.has(e.project_name)) { seen.add(e.project_name); names.push(e.project_name); }
    }
    return names.slice(0, 2).join(' · ') || '—';
  };

  // ── Not verified yet ──
  if (!pinVerified) {
    return (
      <div style={{ padding:'40px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%' }}>
        {showPinGate && (
          <PinGateModal
            onSuccess={() => { setPinVerified(true); setShowPinGate(false); }}
            onCancel={() => setShowPinGate(false)}
          />
        )}
        <div style={{ fontSize:'48px', marginBottom:'16px' }}>👔</div>
        <div style={{ fontSize:'20px', fontWeight:700, color:'#E8F6F5', marginBottom:'8px' }}>{t('management.title')}</div>
        <div style={{ fontSize:'13px', color:'#718096', marginBottom:'16px' }}>{t('management.description')}</div>
        {!pgConnected && (
          <div style={{ fontSize:'12px', color:'#F6AD55', marginBottom:'16px', background:'#2A1A0A', border:'1px solid #C05621', padding:'8px 14px', borderRadius:'8px' }}>
            ⚠ {t('management.pgNotConnected')}
          </div>
        )}
        <button onClick={()=>setShowPinGate(true)} disabled={!pgConnected}
          style={{ padding:'10px 28px', background: pgConnected ? '#1FB8A0' : '#2D3748', border:'none', borderRadius:'8px', color: pgConnected ? '#0B5563' : '#4A5568', fontWeight:700, fontSize:'14px', cursor: pgConnected ? 'pointer' : 'not-allowed' }}>
          {t('password.enter')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Modals */}
      {showChangePin && <ChangePinModal onClose={() => setShowChangePin(false)} />}
      {(showProjectModal || editProject) && (
        <ProjectModal project={editProject} onSave={handleCreateProject} onClose={() => { setShowProjectModal(false); setEditProject(null); }} />
      )}
      {showAddStandaloneProgram && (
        <AddProgramModal onSave={handleAddProgram} onClose={() => setShowAddStandaloneProgram(false)} />
      )}
      {adjustMember && !adjustEntry && (
        <EntryPickerModal
          member={adjustMember}
          entries={teamEntries.filter(e => e.user_id === adjustMember.id && e.end_time)}
          onPick={entry => { setAdjustEntry(entry); setAdjustMember(null); }}
          onClose={() => setAdjustMember(null)}
        />
      )}
      {adjustEntry && localUser && (
        <AjustarModal
          entry={adjustEntry}
          member={members.find(m => m.id === adjustEntry.user_id) || { id:'', name:'Unknown', initials:'?', color:'#718096', goal_hours:8, created_at:'' }}
          projects={projects}
          managerId={localUser.id}
          managerName={localUser.name}
          onSave={async () => { setAdjustEntry(null); await loadAll(selectedDate); }}
          onClose={() => setAdjustEntry(null)}
        />
      )}

      {/* ── Sticky header ── */}
      <div style={{ flexShrink:0, padding:'20px 24px 0', background:'#0B0F17', borderBottom:'1px solid #1A1F2B' }}>

        {/* Title row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700, color:'#E2E8F0' }}>{t('management.title')}</div>
            <div style={{ fontSize:'12px', color:'#718096', marginTop:'4px' }}>
              {t('management.subtitle')} · {t('management.today')}, {formatDatePT(new Date())}
            </div>
          </div>
          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
            <button onClick={() => localUser && window.electron.exportWeeklyReport(localUser.id, localUser.name, selectedDate)} className="btn btn-primary" style={{ fontSize:'12px' }}>
              ↓ {t('management.weeklyReport')}
            </button>
            <button onClick={() => setShowChangePin(true)} className="btn" style={{ fontSize:'12px' }}>{t('management.changePassword')}</button>
            <button onClick={() => loadAll(selectedDate, true)} className="btn" style={{ fontSize:'12px' }} title="Refresh & sync">
              <span style={{ display:'inline-block', animation: syncing ? 'spin 1s linear infinite' : 'none' }}>↻</span>
            </button>
            {syncing && <span style={{ fontSize:'11px', color:'#4A5568' }}>sync...</span>}
          </div>
        </div>

        {/* Tabs + Date picker row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: tab === 'projects' ? '0' : '16px' }}>
          <div style={{ display:'flex', gap:'4px', background:'#0A0E14', borderRadius:'10px', padding:'4px', width:'fit-content' }}>
            {(['projects','team'] as const).map(tabKey => (
              <button key={tabKey} onClick={() => setTab(tabKey)} style={{
                padding:'7px 20px', borderRadius:'7px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:600,
                background: tab===tabKey ? '#161C26' : 'transparent',
                color: tab===tabKey ? '#E2E8F0' : '#4A5568',
              }}>
                {tabKey === 'projects' ? t('management.tabProjects') : t('management.tabTeam')}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <button onClick={() => shiftDate(-1)} style={{ padding:'5px 12px', background:'#161C26', border:'1px solid #1E2530', borderRadius:'7px', color:'#A0AEC0', cursor:'pointer', fontSize:'14px' }}>‹</button>
            <input type="date" value={selectedDate} max={today} onChange={e => setSelectedDate(e.target.value)}
              style={{ padding:'5px 10px', background:'#161C26', border:'1px solid #1E2530', borderRadius:'7px', color:'#E2E8F0', fontSize:'13px', outline:'none', cursor:'pointer' }} />
            <button onClick={() => shiftDate(1)} disabled={selectedDate >= today} style={{ padding:'5px 12px', background:'#161C26', border:'1px solid #1E2530', borderRadius:'7px', color: selectedDate >= today ? '#2D3748' : '#A0AEC0', cursor: selectedDate >= today ? 'not-allowed' : 'pointer', fontSize:'14px' }}>›</button>
            {selectedDate !== today && (
              <button onClick={() => setSelectedDate(today)} style={{ padding:'5px 10px', background:'transparent', border:'1px solid #1E2530', borderRadius:'7px', color:'#1FB8A0', cursor:'pointer', fontSize:'12px' }}>
                {t('management.today')}
              </button>
            )}
          </div>
        </div>

        {/* Projects tab action buttons — fixed in header */}
        {tab === 'projects' && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0 0' }}>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="btn btn-primary" onClick={() => setShowProjectModal(true)} style={{ fontSize:'12px' }}>+ {t('management.newProject')}</button>
              <button className="btn" onClick={() => importRef.current?.click()} style={{ fontSize:'12px' }}>{t('management.importCsv')}</button>
              <input ref={importRef} type="file" accept=".txt,.csv" style={{ display:'none' }} onChange={handleImportCSV} />
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddStandaloneProgram(true)} style={{ fontSize:'12px' }}>
              🖥 {t('management.registerProgram')}
            </button>
          </div>
        )}

      </div>{/* end sticky header */}

      {/* ── Scrollable content ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

      {loading ? (
        <div style={{ color:'#4A5568', textAlign:'center', padding:'40px' }}>{t('common.loading')}</div>
      ) : tab === 'projects' ? (

        /* ── PROJECTS TAB — two-column layout ── */
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', alignItems:'start' }}>

          {/* ── LEFT: Projects ── */}
          <div>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#4A5568', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:'12px' }}>{t('management.tabProjects')}</div>

            {projects.length === 0 ? (
              <div style={{ color:'#4A5568', textAlign:'center', padding:'40px', background:'#161C26', borderRadius:'12px', border:'1px solid #1E2530' }}>{t('management.noProjects')}</div>
            ) : (
              <div style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'12px', overflow:'hidden' }}>
                {projects.map((proj, i) => {
                  const isLast = i === projects.length - 1;
                  return (
                    <div key={proj.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom: isLast ? 'none' : '1px solid #1A1F2B' }}>
                      <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:proj.color, flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'13px', fontWeight:600, color:'#E2E8F0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {proj.name}{proj.subproject ? <span style={{ color:'#718096' }}> › {proj.subproject}</span> : ''}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteProject(proj.id)} style={{ background:'none', border:'none', color:'#4A5568', cursor:'pointer', fontSize:'14px', padding:'4px', flexShrink:0 }} title="Delete">✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT: Programs ── */}
          <div>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#4A5568', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:'12px' }}>{t('management.programs')}</div>

            {programs.length === 0 ? (
              <div style={{ color:'#4A5568', textAlign:'center', padding:'40px', background:'#161C26', borderRadius:'12px', border:'1px solid #1E2530' }}>
                {t('management.noPrograms')}
              </div>
            ) : (
              <div style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'12px', overflow:'hidden' }}>
                {programs.map((prog, i) => {
                  const isLast = i === programs.length - 1;
                  return (
                    <div key={prog.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom: isLast ? 'none' : '1px solid #1A1F2B' }}>
                      <span style={{ fontSize:'16px', flexShrink:0 }}>🖥️</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'13px', color:'#CBD5E0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{prog.displayName}</div>
                        <div style={{ fontSize:'11px', color:'#4A5568', marginTop:'2px' }}>{prog.processName}.exe</div>
                      </div>
                      <button onClick={() => handleRemoveProgram(prog.id)} style={{ background:'none', border:'none', color:'#4A5568', cursor:'pointer', fontSize:'13px', flexShrink:0 }} title="Remove">✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      ) : (

        /* ── TEAM TAB ── */
        <div>
          {/* Manual adjustments alert */}
          {auditLog.length > 0 && (
            <div style={{ background:'#2A1A0A', border:'1px solid #C05621', borderRadius:'10px', padding:'12px 16px', marginBottom:'20px', fontSize:'13px', color:'#F6AD55', display:'flex', alignItems:'center', gap:'8px' }}>
              <span>⚠</span>
              <span>
                <strong>{auditLog.length} {auditLog.length === 1 ? t('management.manualAdjustSingle') : t('management.manualAdjustPlural')}</strong>
                {' '}{t('management.manualAdjustSuffix')}
              </span>
            </div>
          )}

          {/* Members table */}
          <div style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'12px', marginBottom:'24px', overflow:'hidden' }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid #1A1F2B', display:'grid', gridTemplateColumns:'180px 1fr 80px 70px 80px', gap:'12px' }}>
              {[t('management.colMember'),t('management.colProjects'),t('management.colTotal'),t('management.colGoal'),t('management.colAction')].map(h => (
                <div key={h} style={{ fontSize:'10px', fontWeight:700, color:'#4A5568', letterSpacing:'0.8px' }}>{h}</div>
              ))}
            </div>
            {members.length === 0 ? (
              <div style={{ padding:'32px', textAlign:'center', color:'#4A5568', fontSize:'13px' }}>
                {t('management.noMembers')}
              </div>
            ) : members.map(member => {
              const total = getMemberTotal(member.id);
              const goalSecs = member.goal_hours * 3600;
              const pct = Math.min(100, Math.round((total / goalSecs) * 100));
              return (
                <div key={member.id} style={{ padding:'14px 16px', borderBottom:'1px solid #1A1F2B', display:'grid', gridTemplateColumns:'180px 1fr 80px 70px 80px', gap:'12px', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:member.color, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:'white' }}>
                      {member.initials}
                    </div>
                    <div style={{ fontSize:'13px', fontWeight:600, color:'#E2E8F0' }}>{member.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:'12px', color:'#A0AEC0', marginBottom:'5px' }}>{getMemberProjects(member.id)}</div>
                    <div style={{ height:'4px', background:'#1E2530', borderRadius:'2px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:member.color, borderRadius:'2px' }} />
                    </div>
                  </div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#E2E8F0' }}>{formatDuration(total)}</div>
                  <div style={{ fontSize:'13px', fontWeight:700, color: pct>=100?'#1FB8A0':pct>=75?'#F6AD55':'#FC8181' }}>{pct}%</div>
                  <div>
                    <button onClick={() => setAdjustMember(member)} className="btn" style={{ fontSize:'11px', padding:'4px 10px' }}>{t('management.adjust')}</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audit log */}
          {auditLog.length > 0 && (
            <div>
              <div style={{ fontSize:'10px', fontWeight:700, color:'#4A5568', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'10px' }}>
                {t('management.auditLog')}
              </div>
              {auditLog.map(log => {
                const oldDur = calcDuration(log.old_start_time, log.old_end_time);
                const newDur = calcDuration(log.new_start_time, log.new_end_time);
                return (
                  <div key={log.id} style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'10px', padding:'12px 16px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div style={{ display:'flex', gap:'12px' }}>
                      <span style={{ color:'#F6AD55', fontSize:'15px', marginTop:'1px' }}>✏</span>
                      <div>
                        <div style={{ fontSize:'13px', color:'#CBD5E0' }}>
                          <strong style={{ color:'#E2E8F0' }}>{log.manager_name}</strong>
                          {' '}{t('management.adjustedRecord')}{' '}
                          <strong style={{ color:'#E2E8F0' }}>{log.target_user_name}</strong>
                          {' '}{t('management.inProject')}{' '}
                          <strong style={{ color:'#1FB8A0' }}>{log.project_name}</strong>
                        </div>
                        <div style={{ fontSize:'11px', color:'#718096', marginTop:'4px' }}>
                          <span style={{ color:'#FC8181' }}>{formatMins(oldDur)}</span>
                          {' → '}
                          <span style={{ color:'#1FB8A0' }}>{formatMins(newDur)}</span>
                          {' ('}
                          {log.old_start_time ? formatTime(log.old_start_time) : '?'}
                          {'–'}
                          {log.old_end_time ? formatTime(log.old_end_time) : '?'}
                          {' → '}
                          {log.new_start_time ? formatTime(log.new_start_time) : '?'}
                          {'–'}
                          {log.new_end_time ? formatTime(log.new_end_time) : '?'}
                          {') — '}
                          <span style={{ color:'#A0AEC0' }}>{t('management.motive')}: {log.motive}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize:'12px', color:'#4A5568', flexShrink:0, paddingLeft:'12px' }}>{formatTime(log.created_at)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>{/* end scrollable content */}
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display:'block', fontSize:'11px', fontWeight:600, color:'#4A5568',
  textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'5px',
};
const inputStyle: React.CSSProperties = {
  width:'100%', padding:'8px 10px', background:'#0A0E14',
  border:'1px solid #1E2530', borderRadius:'7px', color:'#E2E8F0',
  fontSize:'13px', outline:'none',
};

export default Management;
