import React, { useState, useEffect } from 'react';
import AjustarModal from '../components/AjustarModal';
import type { TeamMember, TeamTimeEntry, TeamAuditLog, LocalUserConfig } from '../../shared/types';

// ── helpers ──────────────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
function getInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().substring(0, 2);
}

const MEMBER_COLORS = ['#14919B','#1FB8A0','#8B5CF6','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444'];

// ── Change PIN modal ─────────────────────────────────────────────────────────
const ChangePinModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);

  const handleSave = async () => {
    if (!current) { setMsg('Enter current password.'); return; }
    const valid = await window.electron.verifyManagerPin(current);
    if (!valid) { setMsg('Current password is incorrect.'); return; }
    if (!next || next.length < 4) { setMsg('New password must be at least 4 characters.'); return; }
    if (next !== confirm) { setMsg('Passwords do not match.'); return; }
    await window.electron.setManagerPin(next);
    setMsg(''); setOk(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'14px', padding:'28px 32px', width:'340px' }}>
        <div style={{ fontSize:'16px', fontWeight:700, color:'#E8F6F5', marginBottom:'20px' }}>Change Manager Password</div>
        {['Current Password','New Password','Confirm New Password'].map((label, i) => (
          <div key={i} style={{ marginBottom:'12px' }}>
            <label style={labelStyle}>{label}</label>
            <input type="password" value={[current,next,confirm][i]}
              onChange={e => [setCurrent,setNext,setConfirm][i](e.target.value)}
              onKeyDown={e => e.key==='Enter' && handleSave()}
              style={inputStyle} />
          </div>
        ))}
        {msg && <div style={{ fontSize:'12px', color:'#FC8181', marginBottom:'10px' }}>{msg}</div>}
        {ok  && <div style={{ fontSize:'12px', color:'#1FB8A0', marginBottom:'10px' }}>✓ Password updated!</div>}
        <div style={{ display:'flex', gap:'10px', marginTop:'8px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'9px', background:'transparent', border:'1px solid #1E2530', borderRadius:'8px', color:'#718096', cursor:'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{ flex:2, padding:'9px', background:'#1FB8A0', border:'none', borderRadius:'8px', color:'#0B5563', fontWeight:700, cursor:'pointer' }}>Save</button>
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
  const [name, setName] = useState(project?.name || '');
  const [sub, setSub] = useState(project?.subproject || '');
  const [color, setColor] = useState(project?.color || PROJECT_COLORS[0]);
  const [err, setErr] = useState('');

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'14px', padding:'28px 32px', width:'380px' }}>
        <div style={{ fontSize:'16px', fontWeight:700, color:'#E8F6F5', marginBottom:'20px' }}>{project ? 'Edit Project' : 'New Project'}</div>
        <label style={labelStyle}>Project Name</label>
        <input value={name} onChange={e=>{setName(e.target.value);setErr('');}} autoFocus style={{ ...inputStyle, marginBottom:'14px' }} />
        <label style={labelStyle}>Subproject (optional)</label>
        <input value={sub} onChange={e=>setSub(e.target.value)} style={{ ...inputStyle, marginBottom:'14px' }} />
        <label style={labelStyle}>Color</label>
        <div style={{ display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap' }}>
          {PROJECT_COLORS.map(c => (
            <div key={c} onClick={()=>setColor(c)} style={{ width:'28px', height:'28px', borderRadius:'7px', background:c, cursor:'pointer', border: color===c ? '3px solid #E8F6F5' : '3px solid transparent' }} />
          ))}
        </div>
        {err && <div style={{ fontSize:'12px', color:'#FC8181', marginBottom:'10px' }}>{err}</div>}
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'9px', background:'transparent', border:'1px solid #1E2530', borderRadius:'8px', color:'#718096', cursor:'pointer' }}>Cancel</button>
          <button onClick={()=>{ if(!name.trim()){setErr('Name required');return;} onSave(name.trim(), sub.trim(), color); }} style={{ flex:2, padding:'9px', background:'#1FB8A0', border:'none', borderRadius:'8px', color:'#0B5563', fontWeight:700, cursor:'pointer' }}>Save</button>
        </div>
      </div>
    </div>
  );
};

// ── Add Program modal ────────────────────────────────────────────────────────
const AddProgramModal: React.FC<{
  projectName: string;
  onSave: (processName: string, displayName: string) => void;
  onClose: () => void;
}> = ({ projectName, onSave, onClose }) => {
  const [displayName, setDisplayName] = useState('');
  const [processName, setProcessName] = useState('');
  const [err, setErr] = useState('');

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'14px', padding:'28px 32px', width:'380px' }}>
        <div style={{ fontSize:'16px', fontWeight:700, color:'#E8F6F5', marginBottom:'4px' }}>Add Program</div>
        <div style={{ fontSize:'12px', color:'#718096', marginBottom:'20px' }}>Linked to: {projectName}</div>
        <label style={labelStyle}>Display Name</label>
        <input value={displayName} onChange={e=>{setDisplayName(e.target.value);setErr('');}} placeholder="e.g. Google Chrome" autoFocus style={{ ...inputStyle, marginBottom:'14px' }} />
        <label style={labelStyle}>Process Name (without .exe)</label>
        <input value={processName} onChange={e=>{setProcessName(e.target.value);setErr('');}} placeholder="e.g. chrome"
          onKeyDown={e=>e.key==='Enter'&&handleSave()}
          style={{ ...inputStyle, marginBottom:'6px' }} />
        <div style={{ fontSize:'11px', color:'#4A5568', marginBottom:'18px' }}>Check Task Manager → Details tab for the exact process name</div>
        {err && <div style={{ fontSize:'12px', color:'#FC8181', marginBottom:'10px' }}>{err}</div>}
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'9px', background:'transparent', border:'1px solid #1E2530', borderRadius:'8px', color:'#718096', cursor:'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{ flex:2, padding:'9px', background:'#1FB8A0', border:'none', borderRadius:'8px', color:'#0B5563', fontWeight:700, cursor:'pointer' }}>Add</button>
        </div>
      </div>
    </div>
  );

  function handleSave() {
    if (!displayName.trim()) { setErr('Display name required.'); return; }
    if (!processName.trim()) { setErr('Process name required.'); return; }
    onSave(processName.trim(), displayName.trim());
  }
};

// ── PIN gate modal ───────────────────────────────────────────────────────────
const PinGateModal: React.FC<{ onSuccess: ()=>void; onCancel: ()=>void }> = ({ onSuccess, onCancel }) => {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const verify = async () => {
    const ok = await window.electron.verifyManagerPin(pin);
    if (ok) onSuccess(); else { setErr('Incorrect password.'); setPin(''); }
  };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'14px', padding:'32px 36px', width:'300px', textAlign:'center' }}>
        <div style={{ fontSize:'32px', marginBottom:'12px' }}>🔒</div>
        <div style={{ fontSize:'16px', fontWeight:700, color:'#E8F6F5', marginBottom:'6px' }}>Manager Access</div>
        <div style={{ fontSize:'12px', color:'#718096', marginBottom:'20px' }}>Default password: 12345678</div>
        <input type="password" value={pin} onChange={e=>{setPin(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&verify()}
          placeholder="Password" autoFocus
          style={{ width:'100%', padding:'10px', textAlign:'center', letterSpacing:'4px', background:'#0A0E14', border:`1px solid ${err?'#FC8181':'#1E2530'}`, borderRadius:'8px', color:'#E2E8F0', fontSize:'18px', outline:'none', marginBottom:'8px' }} />
        {err && <div style={{ fontSize:'12px', color:'#FC8181', marginBottom:'10px' }}>{err}</div>}
        <div style={{ display:'flex', gap:'10px', marginTop:'8px' }}>
          <button onClick={onCancel} style={{ flex:1, padding:'9px', background:'transparent', border:'1px solid #1E2530', borderRadius:'8px', color:'#718096', cursor:'pointer' }}>Cancel</button>
          <button onClick={verify} style={{ flex:2, padding:'9px', background:'#1FB8A0', border:'none', borderRadius:'8px', color:'#0B5563', fontWeight:700, cursor:'pointer' }}>Enter</button>
        </div>
      </div>
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
const Management: React.FC = () => {
  const [pinVerified, setPinVerified] = useState(false);
  const [showPinGate, setShowPinGate] = useState(false);
  const [pgConnected, setPgConnected] = useState(false);
  const [localUser, setLocalUser] = useState<LocalUserConfig | null>(null);

  // modals
  const [showChangePin, setShowChangePin] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editProject, setEditProject] = useState<any | null>(null);
  const [addProgramFor, setAddProgramFor] = useState<any | null>(null);
  const [adjustEntry, setAdjustEntry] = useState<TeamTimeEntry | null>(null);

  // data
  const [projects, setProjects] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamEntries, setTeamEntries] = useState<TeamTimeEntry[]>([]);
  const [auditLog, setAuditLog] = useState<TeamAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'team'|'projects'>('projects');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    window.electron.getPostgresStatus().then(setPgConnected);
    window.electron.getLocalUser().then(setLocalUser);
  }, []);

  useEffect(() => {
    if (pinVerified) loadAll();
  }, [pinVerified]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [proj, prog, m, entries, audit] = await Promise.all([
        window.electron.getProjects(),
        window.electron.getProjectPrograms(),
        window.electron.getTeamMembers(),
        window.electron.getTeamEntries(today),
        window.electron.getAuditLog(today),
      ]);
      setProjects(proj);
      setPrograms(prog);
      setMembers(m);
      setTeamEntries(entries);
      setAuditLog(audit);
    } finally { setLoading(false); }
  };

  // ── Project helpers ──
  const handleCreateProject = async (name: string, subproject: string, color: string) => {
    await window.electron.createProject({ name, subproject: subproject || undefined, color, isActive: true });
    setShowProjectModal(false);
    setEditProject(null);
    await loadAll();
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Delete this project? Programs linked to it will also be removed.')) return;
    await window.electron.deleteProject(id);
    await loadAll();
  };

  const handleAddProgram = async (processName: string, displayName: string) => {
    await window.electron.addProjectProgram(addProgramFor.id, processName, displayName);
    setAddProgramFor(null);
    await loadAll();
  };

  const handleRemoveProgram = async (id: string) => {
    await window.electron.removeProjectProgram(id);
    await loadAll();
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
    await loadAll();
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
        <div style={{ fontSize:'20px', fontWeight:700, color:'#E8F6F5', marginBottom:'8px' }}>Gestão da Equipe</div>
        <div style={{ fontSize:'13px', color:'#718096', marginBottom:'16px' }}>Acesso exclusivo para gestores</div>
        {!pgConnected && (
          <div style={{ fontSize:'12px', color:'#F6AD55', marginBottom:'16px', background:'#2A1A0A', border:'1px solid #C05621', padding:'8px 14px', borderRadius:'8px' }}>
            ⚠ PostgreSQL not connected
          </div>
        )}
        <button onClick={()=>setShowPinGate(true)} disabled={!pgConnected}
          style={{ padding:'10px 28px', background: pgConnected ? '#1FB8A0' : '#2D3748', border:'none', borderRadius:'8px', color: pgConnected ? '#0B5563' : '#4A5568', fontWeight:700, fontSize:'14px', cursor: pgConnected ? 'pointer' : 'not-allowed' }}>
          Enter
        </button>
      </div>
    );
  }

  const importRef = React.createRef<HTMLInputElement>();

  return (
    <div style={{ padding:'20px 24px', overflowY:'auto', height:'100%' }}>

      {/* Modals */}
      {showChangePin && <ChangePinModal onClose={() => setShowChangePin(false)} />}
      {(showProjectModal || editProject) && (
        <ProjectModal project={editProject} onSave={handleCreateProject} onClose={() => { setShowProjectModal(false); setEditProject(null); }} />
      )}
      {addProgramFor && (
        <AddProgramModal projectName={addProgramFor.name} onSave={handleAddProgram} onClose={() => setAddProgramFor(null)} />
      )}
      {adjustEntry && localUser && (
        <AjustarModal
          entry={adjustEntry}
          member={members.find(m => m.id === adjustEntry.user_id) || { id:'', name:'Unknown', initials:'?', color:'#718096', goal_hours:8, created_at:'' }}
          projects={projects}
          managerId={localUser.id}
          managerName={localUser.name}
          onSave={async () => { setAdjustEntry(null); await loadAll(); }}
          onClose={() => setAdjustEntry(null)}
        />
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
        <div>
          <div style={{ fontSize:'22px', fontWeight:700, color:'#E2E8F0' }}>Gestão da Equipe</div>
          <div style={{ fontSize:'12px', color:'#718096', marginTop:'4px' }}>
            Acesso exclusivo para gestores · Hoje, {new Date().toLocaleDateString('pt-BR')}
          </div>
        </div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={() => setShowChangePin(true)} className="btn" style={{ fontSize:'12px' }}>🔒 Change Password</button>
          <button onClick={loadAll} className="btn" style={{ fontSize:'12px' }}>↻ Refresh</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'20px', background:'#0A0E14', borderRadius:'10px', padding:'4px', width:'fit-content' }}>
        {(['projects','team'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'7px 20px', borderRadius:'7px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:600,
            background: tab===t ? '#161C26' : 'transparent',
            color: tab===t ? '#E2E8F0' : '#4A5568',
          }}>
            {t === 'projects' ? '📁 Projects' : '👥 Team'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color:'#4A5568', textAlign:'center', padding:'40px' }}>Loading...</div>
      ) : tab === 'projects' ? (

        /* ── PROJECTS TAB ── */
        <div>
          <div style={{ display:'flex', gap:'10px', marginBottom:'16px' }}>
            <button className="btn btn-primary" onClick={() => setShowProjectModal(true)}>+ New Project</button>
            <button className="btn" onClick={() => importRef.current?.click()}>⬆ Import CSV</button>
            <input ref={importRef} type="file" accept=".txt,.csv" style={{ display:'none' }} onChange={handleImportCSV} />
          </div>

          {projects.length === 0 ? (
            <div style={{ color:'#4A5568', textAlign:'center', padding:'40px' }}>No projects yet. Create one above.</div>
          ) : projects.map(proj => {
            const projPrograms = programs.filter(p => p.projectId === proj.id);
            return (
              <div key={proj.id} style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'12px', marginBottom:'12px', overflow:'hidden' }}>
                {/* Project header */}
                <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', borderBottom: projPrograms.length > 0 ? '1px solid #1A1F2B' : 'none' }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:proj.color, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'14px', fontWeight:600, color:'#E2E8F0' }}>
                      {proj.name}{proj.subproject ? <span style={{ color:'#718096' }}> › {proj.subproject}</span> : ''}
                    </div>
                    <div style={{ fontSize:'11px', color:'#4A5568' }}>{projPrograms.length} program{projPrograms.length !== 1 ? 's' : ''} linked</div>
                  </div>
                  <button onClick={() => setAddProgramFor(proj)} className="btn" style={{ fontSize:'11px', padding:'4px 10px' }}>+ Program</button>
                  <button onClick={() => handleDeleteProject(proj.id)} style={{ background:'none', border:'none', color:'#4A5568', cursor:'pointer', fontSize:'14px', padding:'4px' }} title="Delete">✕</button>
                </div>

                {/* Programs list */}
                {projPrograms.map(prog => (
                  <div key={prog.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'9px 16px 9px 36px', borderBottom:'1px solid #111722' }}>
                    <span style={{ fontSize:'13px' }}>🖥️</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', color:'#CBD5E0' }}>{prog.displayName}</div>
                      <div style={{ fontSize:'11px', color:'#4A5568' }}>{prog.processName}.exe</div>
                    </div>
                    <button onClick={() => handleRemoveProgram(prog.id)} style={{ background:'none', border:'none', color:'#4A5568', cursor:'pointer', fontSize:'13px' }} title="Remove">✕</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

      ) : (

        /* ── TEAM TAB ── */
        <div>
          {/* Manual adjustments alert */}
          {auditLog.length > 0 && (
            <div style={{ background:'#2A1A0A', border:'1px solid #C05621', borderRadius:'10px', padding:'12px 16px', marginBottom:'20px', fontSize:'13px', color:'#F6AD55', display:'flex', alignItems:'center', gap:'10px' }}>
              ⚠ <span><strong>{auditLog.length} ajuste{auditLog.length>1?'s':''} manual{auditLog.length>1?'is':''}</strong> realizados hoje</span>
            </div>
          )}

          {/* Members table */}
          <div style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'12px', marginBottom:'24px', overflow:'hidden' }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid #1A1F2B', display:'grid', gridTemplateColumns:'180px 1fr 80px 70px 80px', gap:'12px' }}>
              {['MEMBRO','PROJETOS DE HOJE','TOTAL','META','AÇÃO'].map(h => (
                <div key={h} style={{ fontSize:'10px', fontWeight:700, color:'#4A5568', letterSpacing:'0.8px' }}>{h}</div>
              ))}
            </div>
            {members.length === 0 ? (
              <div style={{ padding:'32px', textAlign:'center', color:'#4A5568', fontSize:'13px' }}>
                No team members yet. Members are registered automatically on first launch.
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
                    <button onClick={() => {
                      const entries = teamEntries.filter(e => e.user_id === member.id && e.end_time);
                      if (entries.length > 0) setAdjustEntry(entries[0]);
                    }} className="btn" style={{ fontSize:'11px', padding:'4px 10px' }}>Ajustar</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audit log */}
          {auditLog.length > 0 && (
            <div>
              <div style={{ fontSize:'10px', fontWeight:700, color:'#4A5568', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'10px' }}>
                AUDIT LOG — AJUSTES MANUAIS DE HOJE
              </div>
              {auditLog.map(log => (
                <div key={log.id} style={{ background:'#161C26', border:'1px solid #1E2530', borderRadius:'10px', padding:'12px 16px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ display:'flex', gap:'10px' }}>
                    <span style={{ color:'#F6AD55' }}>✏</span>
                    <div>
                      <div style={{ fontSize:'13px', color:'#CBD5E0' }}>
                        <strong style={{ color:'#E2E8F0' }}>{log.manager_name}</strong> ajustou registro de <strong style={{ color:'#E2E8F0' }}>{log.target_user_name}</strong> · {log.project_name}
                      </div>
                      <div style={{ fontSize:'11px', color:'#718096', marginTop:'3px' }}>
                        {log.old_start_time ? formatTime(log.old_start_time) : '?'}
                        {log.old_end_time ? `–${formatTime(log.old_end_time)}` : ''}
                        {' → '}
                        {log.new_start_time ? formatTime(log.new_start_time) : '?'}
                        {log.new_end_time ? `–${formatTime(log.new_end_time)}` : ''}
                        {' — '}{log.motive}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize:'12px', color:'#4A5568', flexShrink:0 }}>{formatTime(log.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
