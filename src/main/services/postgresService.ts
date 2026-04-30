import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  goal_hours: number;
  created_at: string;
}

export interface TeamTimeEntry {
  id: string;
  user_id: string;
  user_name: string;
  user_color: string;
  project_id: string | null;
  project_name: string | null;
  project_subproject: string | null;
  app_name: string;
  process_name: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  status: string;
  is_manually_adjusted: boolean;
}

export interface AuditLogEntry {
  id: string;
  manager_name: string;
  target_user_name: string;
  project_name: string;
  old_start_time: string | null;
  old_end_time: string | null;
  old_project: string | null;
  new_start_time: string | null;
  new_end_time: string | null;
  new_project: string | null;
  motive: string;
  created_at: string;
}

export interface AdjustEntryData {
  entryId: string;
  managerId: string;
  managerName: string;
  targetUserId: string;
  targetUserName: string;
  projectName: string;
  oldStartTime: string;
  oldEndTime: string | null;
  oldProject: string | null;
  newStartTime: string;
  newEndTime: string | null;
  newProjectId: string | null;
  newProjectName: string | null;
  motive: string;
}

export class PostgresService {
  private pool: Pool | null = null;
  private connected = false;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    this.pool = new Pool(
      connectionString
        ? {
            connectionString,
            ssl: process.env.NODE_ENV === 'development'
              ? { rejectUnauthorized: false }
              : { rejectUnauthorized: false }, // Railway requires SSL
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: 10,
          }
        : {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            database: process.env.POSTGRES_DB || 'timetrack',
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'timetrack',
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: 10,
          }
    );
  }

  async connect(): Promise<boolean> {
    try {
      const client = await this.pool!.connect();
      client.release();
      this.connected = true;
      await this.initSchema();
      console.log('[Postgres] Connected successfully');
      return true;
    } catch (err: any) {
      console.error('[Postgres] Connection failed:', err.message || String(err));
      console.error('[Postgres] Error code:', err.code);
      console.error('[Postgres] Error detail:', err.detail || err.stack || '(no detail)');
      this.connected = false;
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async initSchema(): Promise<void> {
    await this.pool!.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#14919B',
        goal_hours REAL NOT NULL DEFAULT 8.0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subproject TEXT,
        color TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        project_id TEXT,
        app_name TEXT NOT NULL,
        process_name TEXT NOT NULL,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ,
        duration INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'auto',
        is_manually_adjusted BOOLEAN DEFAULT FALSE,
        adjusted_by TEXT,
        adjustment_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        manager_id TEXT NOT NULL,
        manager_name TEXT NOT NULL,
        target_user_id TEXT NOT NULL,
        target_user_name TEXT NOT NULL,
        time_entry_id TEXT NOT NULL,
        project_name TEXT NOT NULL,
        old_start_time TEXT,
        old_end_time TEXT,
        old_project TEXT,
        new_start_time TEXT,
        new_end_time TEXT,
        new_project TEXT,
        motive TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS manager_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        pin_hash TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      INSERT INTO manager_config (id) VALUES (1) ON CONFLICT DO NOTHING;

      CREATE TABLE IF NOT EXISTS project_programs (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        process_name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(process_name)
      );
    `);

    // Add foreign key constraints (safe to run multiple times)
    const fkQueries = [
      // time_entries.user_id → users.id
      `DO $$ BEGIN
         ALTER TABLE time_entries ADD CONSTRAINT fk_time_entries_user
           FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
       EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

      // time_entries.project_id → projects.id
      `DO $$ BEGIN
         ALTER TABLE time_entries ADD CONSTRAINT fk_time_entries_project
           FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
       EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

      // time_entries.adjusted_by → users.id
      `DO $$ BEGIN
         ALTER TABLE time_entries ADD CONSTRAINT fk_time_entries_adjusted_by
           FOREIGN KEY (adjusted_by) REFERENCES users(id) ON DELETE SET NULL;
       EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

      // project_programs.project_id → projects.id
      `DO $$ BEGIN
         ALTER TABLE project_programs ADD CONSTRAINT fk_project_programs_project
           FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
       EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

      // audit_log.manager_id → users.id
      `DO $$ BEGIN
         ALTER TABLE audit_log ADD CONSTRAINT fk_audit_log_manager
           FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;
       EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

      // audit_log.target_user_id → users.id
      `DO $$ BEGIN
         ALTER TABLE audit_log ADD CONSTRAINT fk_audit_log_target_user
           FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL;
       EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

      // audit_log.time_entry_id → time_entries.id
      `DO $$ BEGIN
         ALTER TABLE audit_log ADD CONSTRAINT fk_audit_log_time_entry
           FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE CASCADE;
       EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

      // projects.created_by → users.id
      `DO $$ BEGIN
         ALTER TABLE projects ADD CONSTRAINT fk_projects_created_by
           FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
       EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    ];

    for (const q of fkQueries) {
      await this.pool!.query(q).catch(e => console.warn('[Postgres] FK migration:', e.message));
    }
    // Migrate: add is_active to users if missing
    await this.pool!.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`
    ).catch(() => {});

    // Set default PIN (12345678) if none set
    const cfg = await this.pool!.query('SELECT pin_hash FROM manager_config WHERE id=1');
    if (!cfg.rows[0]?.pin_hash) {
      const hash = await bcrypt.hash('12345678', 10);
      await this.pool!.query('UPDATE manager_config SET pin_hash=$1 WHERE id=1', [hash]);
      console.log('[Postgres] Default manager password set (12345678)');
    }

    console.log('[Postgres] Schema initialized');
  }

  // ==================== USERS ====================

  async getTeamMembers(): Promise<TeamMember[]> {
    if (!this.connected) return [];
    const res = await this.pool!.query('SELECT * FROM users WHERE is_active=TRUE ORDER BY name');
    return res.rows;
  }

  async getTeamMemberByName(name: string): Promise<TeamMember | null> {
    if (!this.connected) return null;
    const res = await this.pool!.query(
      'SELECT * FROM users WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [name]
    );
    return res.rows[0] ?? null;
  }

  async addTeamMember(member: Omit<TeamMember, 'created_at'>): Promise<TeamMember> {
    const res = await this.pool!.query(
      `INSERT INTO users (id, name, initials, color, goal_hours)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET name=$2, initials=$3, color=$4, goal_hours=$5
       RETURNING *`,
      [member.id, member.name, member.initials, member.color, member.goal_hours]
    );
    return res.rows[0];
  }

  async updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (updates.name !== undefined) { fields.push(`name=$${i++}`); values.push(updates.name); }
    if (updates.initials !== undefined) { fields.push(`initials=$${i++}`); values.push(updates.initials); }
    if (updates.color !== undefined) { fields.push(`color=$${i++}`); values.push(updates.color); }
    if (updates.goal_hours !== undefined) { fields.push(`goal_hours=$${i++}`); values.push(updates.goal_hours); }
    if (fields.length === 0) return false;
    values.push(id);
    const res = await this.pool!.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id=$${i}`,
      values
    );
    return (res.rowCount ?? 0) > 0;
  }

  async removeTeamMember(id: string): Promise<boolean> {
    const res = await this.pool!.query('UPDATE users SET is_active=FALSE WHERE id=$1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  // ==================== PROJECTS (shared) ====================

  async getProjects(): Promise<any[]> {
    if (!this.connected) return [];
    const res = await this.pool!.query('SELECT * FROM projects WHERE is_active=TRUE ORDER BY name');
    return res.rows;
  }

  async upsertProject(project: any): Promise<void> {
    await this.pool!.query(
      `INSERT INTO projects (id, name, subproject, color, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET name=$2, subproject=$3, color=$4, is_active=$5`,
      [project.id, project.name, project.subproject ?? null, project.color, project.isActive !== false, project.createdBy ?? null]
    );
  }

  async deleteProject(id: string): Promise<void> {
    await this.pool!.query(`UPDATE projects SET is_active=FALSE WHERE id=$1`, [id]);
  }

  async deleteProjectProgram(id: string): Promise<void> {
    await this.pool!.query(`DELETE FROM project_programs WHERE id=$1`, [id]);
  }

  async getProjectPrograms(): Promise<any[]> {
    if (!this.connected) return [];
    const res = await this.pool!.query('SELECT * FROM project_programs ORDER BY display_name');
    return res.rows;
  }

  async upsertProjectProgram(program: { id: string; project_id: string | null; process_name: string; display_name: string }): Promise<void> {
    await this.pool!.query(
      `INSERT INTO project_programs (id, project_id, process_name, display_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (process_name) DO UPDATE SET display_name=$4, project_id=$2, id=$1`,
      [program.id, program.project_id, program.process_name, program.display_name]
    );
  }

  // ==================== TIME ENTRIES ====================

  async upsertTimeEntry(entry: any, userId: string): Promise<void> {
    if (!this.connected) return;
    await this.pool!.query(
      `INSERT INTO time_entries (id, user_id, project_id, app_name, process_name, start_time, end_time, duration, status, is_manually_adjusted, adjusted_by, adjustment_reason, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (id) DO UPDATE SET
         end_time=$7, duration=$8, status=$9, is_manually_adjusted=$10,
         adjusted_by=$11, adjustment_reason=$12, updated_at=NOW()`,
      [
        entry.id, userId, entry.projectId ?? null, entry.appName, entry.processName,
        entry.startTime, entry.endTime ?? null, entry.duration, entry.status,
        entry.isManuallyAdjusted ?? false, entry.adjustedBy ?? null, entry.adjustmentReason ?? null,
      ]
    );
  }

  async getTeamEntriesForDate(date: string): Promise<TeamTimeEntry[]> {
    return this.getTeamEntriesForRange(date, date);
  }

  async getTeamEntriesForRange(startDate: string, endDate: string, userId?: string): Promise<TeamTimeEntry[]> {
    if (!this.connected) return [];
    const conditions = [`DATE(te.start_time) >= $1`, `DATE(te.start_time) <= $2`];
    const params: any[] = [startDate, endDate];
    if (userId) { params.push(userId); conditions.push(`te.user_id = $${params.length}`); }
    const res = await this.pool!.query(
      `SELECT te.*, u.name as user_name, u.color as user_color,
              p.name as project_name, p.subproject as project_subproject
       FROM time_entries te
       JOIN users u ON te.user_id = u.id
       LEFT JOIN projects p ON te.project_id = p.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY te.start_time DESC`,
      params
    );
    return res.rows;
  }

  async adjustTimeEntry(data: AdjustEntryData): Promise<void> {
    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');

      // Update the time entry
      const newDuration = data.newEndTime
        ? Math.floor((new Date(data.newEndTime).getTime() - new Date(data.newStartTime).getTime()) / 1000)
        : 0;

      await client.query(
        `UPDATE time_entries SET
           start_time=$1, end_time=$2, duration=$3,
           project_id=$4, is_manually_adjusted=TRUE,
           adjusted_by=$5, adjustment_reason=$6, updated_at=NOW()
         WHERE id=$7`,
        [
          data.newStartTime, data.newEndTime, newDuration,
          data.newProjectId, data.managerId, data.motive, data.entryId,
        ]
      );

      // Create audit log entry
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await client.query(
        `INSERT INTO audit_log
           (id, manager_id, manager_name, target_user_id, target_user_name,
            time_entry_id, project_name, old_start_time, old_end_time, old_project,
            new_start_time, new_end_time, new_project, motive)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          id, data.managerId, data.managerName, data.targetUserId, data.targetUserName,
          data.entryId, data.projectName,
          data.oldStartTime, data.oldEndTime, data.oldProject,
          data.newStartTime, data.newEndTime, data.newProjectName,
          data.motive,
        ]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==================== AUDIT LOG ====================

  async getAuditLogForDate(date: string): Promise<AuditLogEntry[]> {
    return this.getAuditLogForRange(date, date);
  }

  async getAuditLogForRange(startDate: string, endDate: string): Promise<AuditLogEntry[]> {
    if (!this.connected) return [];
    const res = await this.pool!.query(
      `SELECT * FROM audit_log WHERE DATE(created_at) >= $1 AND DATE(created_at) <= $2 ORDER BY created_at DESC`,
      [startDate, endDate]
    );
    return res.rows;
  }

  // ==================== MANAGER PIN ====================

  async setManagerPin(pin: string): Promise<void> {
    const hash = await bcrypt.hash(pin, 10);
    await this.pool!.query(
      `UPDATE manager_config SET pin_hash=$1, updated_at=NOW() WHERE id=1`,
      [hash]
    );
  }

  async verifyManagerPin(pin: string): Promise<boolean> {
    if (!this.connected) return false;
    const res = await this.pool!.query('SELECT pin_hash FROM manager_config WHERE id=1');
    const hash = res.rows[0]?.pin_hash;
    if (!hash) return false;
    return bcrypt.compare(pin, hash);
  }

  async hasManagerPin(): Promise<boolean> {
    if (!this.connected) return false;
    const res = await this.pool!.query('SELECT pin_hash FROM manager_config WHERE id=1');
    return !!res.rows[0]?.pin_hash;
  }

  async close(): Promise<void> {
    await this.pool?.end();
  }
}
