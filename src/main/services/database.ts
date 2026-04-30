import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import * as fs from 'fs';
import type {
  Project,
  MonitoredApp,
  TimeEntry,
  SystemConfig,
  AppSuggestion,
} from '../../shared/types';

/**
 * DatabaseService - Manages local SQLite database
 * Handles all CRUD operations for projects, time entries, config, etc.
 */
export class DatabaseService {
  private db: Database.Database;

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'timetrack.db');

    console.log('Database path:', dbPath);

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Better performance

    this.initializeTables();
    this.seedDefaultData();
  }

  /**
   * Initialize database tables
   */
  private initializeTables() {
    // Projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subproject TEXT,
        color TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        isActive INTEGER NOT NULL DEFAULT 1
      )
    `);

    // Monitored apps table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS monitored_apps (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        processName TEXT NOT NULL UNIQUE,
        icon TEXT,
        isEnabled INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL
      )
    `);

    // Time entries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        projectId TEXT,
        appName TEXT NOT NULL,
        processName TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT,
        duration INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'auto',
        isManuallyAdjusted INTEGER NOT NULL DEFAULT 0,
        adjustedBy TEXT,
        adjustmentReason TEXT,
        syncedToServer INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (projectId) REFERENCES projects(id)
      )
    `);

    // System config table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        inactivityTimeout INTEGER NOT NULL DEFAULT 5,
        popupDelay INTEGER NOT NULL DEFAULT 2,
        popupAutoClose INTEGER NOT NULL DEFAULT 30,
        backupInterval INTEGER NOT NULL DEFAULT 60,
        startWithWindows INTEGER NOT NULL DEFAULT 0,
        minimizeToTray INTEGER NOT NULL DEFAULT 1,
        showNotifications INTEGER NOT NULL DEFAULT 0,
        language TEXT NOT NULL DEFAULT 'en'
      )
    `);

    // Audit log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        userName TEXT NOT NULL,
        targetUserId TEXT NOT NULL,
        targetUserName TEXT NOT NULL,
        timeEntryId TEXT NOT NULL,
        projectName TEXT NOT NULL,
        oldValue TEXT NOT NULL,
        newValue TEXT NOT NULL,
        reason TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);

    // Project programs table (admin links process names to projects, projectId optional)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS project_programs (
        id TEXT PRIMARY KEY,
        projectId TEXT,
        processName TEXT NOT NULL,
        displayName TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        UNIQUE(processName)
      )
    `);

    // Migrate: drop old NOT NULL constraint if upgrading (recreate table)
    try {
      const info = this.db.prepare("PRAGMA table_info(project_programs)").all() as any[];
      const col = info.find((c: any) => c.name === 'projectId');
      if (col && col.notnull === 1) {
        this.db.exec(`
          ALTER TABLE project_programs RENAME TO project_programs_old;
          CREATE TABLE project_programs (
            id TEXT PRIMARY KEY,
            projectId TEXT,
            processName TEXT NOT NULL,
            displayName TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            UNIQUE(processName)
          );
          INSERT OR IGNORE INTO project_programs SELECT id, projectId, processName, displayName, createdAt FROM project_programs_old;
          DROP TABLE project_programs_old;
        `);
      }
    } catch { /* already migrated */ }

    // Team members table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS team_members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#14919B',
        goal_hours REAL NOT NULL DEFAULT 8.0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_time_entries_userId ON time_entries(userId);
      CREATE INDEX IF NOT EXISTS idx_time_entries_projectId ON time_entries(projectId);
      CREATE INDEX IF NOT EXISTS idx_time_entries_startTime ON time_entries(startTime);
      CREATE INDEX IF NOT EXISTS idx_time_entries_processName ON time_entries(processName);
      CREATE INDEX IF NOT EXISTS idx_project_programs_processName ON project_programs(processName);
    `);

    // Migrate: add language column if missing
    try {
      this.db.exec(`ALTER TABLE config ADD COLUMN language TEXT NOT NULL DEFAULT 'en'`);
    } catch { /* column already exists */ }

    // Migrate: add system parameter columns if missing
    try { this.db.exec(`ALTER TABLE config ADD COLUMN inactivityTimeout INTEGER NOT NULL DEFAULT 5`); } catch {}
    try { this.db.exec(`ALTER TABLE config ADD COLUMN popupDelay INTEGER NOT NULL DEFAULT 2`); } catch {}
    try { this.db.exec(`ALTER TABLE config ADD COLUMN popupAutoClose INTEGER NOT NULL DEFAULT 30`); } catch {}
    try { this.db.exec(`ALTER TABLE config ADD COLUMN backupInterval INTEGER NOT NULL DEFAULT 60`); } catch {}

    // Migrate: enable startWithWindows for existing installs
    try {
      this.db.exec(`UPDATE config SET startWithWindows = 1 WHERE id = 1 AND startWithWindows = 0`);
    } catch { /* ignore */ }

    // Migrate: add is_active to team_members if missing
    try { this.db.exec(`ALTER TABLE team_members ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`); } catch {}

    // Migrate: strip .exe suffix from stored processNames
    this.db.exec(`UPDATE project_programs SET processName = SUBSTR(processName, 1, LENGTH(processName) - 4) WHERE processName LIKE '%.exe' OR processName LIKE '%.EXE'`);

    console.log('Database tables initialized');
  }

  /**
   * Seed default data for testing
   */
  private seedDefaultData() {
    // Check if config exists
    const config = this.db.prepare('SELECT * FROM config WHERE id = 1').get();
    if (!config) {
      this.db
        .prepare(
          `INSERT INTO config (id, inactivityTimeout, popupDelay, popupAutoClose, backupInterval, startWithWindows, minimizeToTray, showNotifications)
           VALUES (1, 5, 2, 30, 60, 1, 1, 0)`
        )
        .run();
      console.log('Default config created');
    }

    // Check if monitored apps exist
    // No default projects — user creates their own
  }

  // ==================== PROJECTS ====================

  getProjects(): Project[] {
    const rows = this.db.prepare('SELECT * FROM projects WHERE isActive = 1 ORDER BY name').all();
    return rows as Project[];
  }

  createProject(project: Omit<Project, 'id' | 'createdAt'>): Project {
    const id = this.generateId();
    const createdAt = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO projects (id, name, subproject, color, createdAt, isActive)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, project.name, project.subproject ?? null, project.color, createdAt, 1);

    return {
      id,
      name: project.name,
      subproject: project.subproject,
      color: project.color,
      isActive: project.isActive,
      createdAt,
    };
  }

  updateProject(id: string, updates: Partial<Project>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.subproject !== undefined) {
      fields.push('subproject = ?');
      values.push(updates.subproject);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.isActive !== undefined) {
      fields.push('isActive = ?');
      values.push(updates.isActive ? 1 : 0);
    }

    if (fields.length === 0) return false;

    values.push(id);

    const result = this.db
      .prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`)
      .run(...values);

    return result.changes > 0;
  }

  deleteProject(id: string): boolean {
    const result = this.db.prepare('UPDATE projects SET isActive = 0 WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // Upsert a project from PostgreSQL (used during pull sync)
  upsertProject(project: { id: string; name: string; subproject?: string; color: string; isActive: boolean }): void {
    this.db.prepare(
      `INSERT INTO projects (id, name, subproject, color, createdAt, isActive)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, subproject=excluded.subproject,
         color=excluded.color, isActive=excluded.isActive`
    ).run(project.id, project.name, project.subproject ?? null, project.color,
          new Date().toISOString(), project.isActive ? 1 : 0);
  }

  // Upsert a project program from PostgreSQL (used during pull sync)
  upsertProjectProgram(prog: { id: string; projectId: string | null; processName: string; displayName: string }): void {
    this.db.prepare(
      `INSERT INTO project_programs (id, projectId, processName, displayName, createdAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(processName) DO UPDATE SET displayName=excluded.displayName, projectId=excluded.projectId, id=excluded.id`
    ).run(prog.id, prog.projectId ?? null, prog.processName, prog.displayName, new Date().toISOString());
  }

  /**
   * Import projects from CSV/TXT/XLSX
   * Format: "ProjectName\tSubproject" (one per line)
   */
  importProjects(filePath: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      const colors = ['#0B5563', '#14919B', '#1FB8A0', '#0EA5A5', '#0D7E7E', '#20C9B5'];

      for (const line of lines) {
        try {
          const parts = line.split('\t');
          const name = parts[0]?.trim();
          const subproject = parts[1]?.trim() || undefined;

          if (!name) {
            errors.push(`Invalid line: ${line}`);
            continue;
          }

          const color = colors[imported % colors.length];

          this.createProject({
            name,
            subproject,
            color,
            isActive: true,
          });

          imported++;
        } catch (err) {
          errors.push(`Error importing line: ${line}`);
        }
      }
    } catch (err) {
      errors.push(`Error reading file: ${(err as Error).message}`);
    }

    return { imported, errors };
  }

  // ==================== MONITORED APPS ====================

  getMonitoredApps(): MonitoredApp[] {
    const rows = this.db.prepare('SELECT * FROM monitored_apps ORDER BY name').all();
    return rows.map((row: any) => ({
      ...row,
      isEnabled: Boolean(row.isEnabled),
    })) as MonitoredApp[];
  }

  getMonitoredAppByProcess(processName: string): MonitoredApp | null {
    const row = this.db
      .prepare('SELECT * FROM monitored_apps WHERE processName = ? COLLATE NOCASE')
      .get(processName);
    if (!row) return null;
    return {
      ...(row as any),
      isEnabled: Boolean((row as any).isEnabled),
    } as MonitoredApp;
  }

  updateMonitoredApp(app: MonitoredApp): boolean {
    const result = this.db
      .prepare('UPDATE monitored_apps SET isEnabled = ? WHERE id = ?')
      .run(app.isEnabled ? 1 : 0, app.id);
    return result.changes > 0;
  }

  // ==================== CONFIG ====================

  getConfig(): SystemConfig | null {
    const row = this.db.prepare('SELECT * FROM config WHERE id = 1').get();
    if (!row) return null;
    return {
      ...(row as any),
      startWithWindows: Boolean((row as any).startWithWindows),
      minimizeToTray: Boolean((row as any).minimizeToTray),
      showNotifications: Boolean((row as any).showNotifications),
      language: (row as any).language || 'en',
    } as SystemConfig;
  }

  updateConfig(config: Partial<SystemConfig>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (config.inactivityTimeout !== undefined) {
      fields.push('inactivityTimeout = ?');
      values.push(config.inactivityTimeout);
    }
    if (config.popupDelay !== undefined) {
      fields.push('popupDelay = ?');
      values.push(config.popupDelay);
    }
    if (config.popupAutoClose !== undefined) {
      fields.push('popupAutoClose = ?');
      values.push(config.popupAutoClose);
    }
    if (config.backupInterval !== undefined) {
      fields.push('backupInterval = ?');
      values.push(config.backupInterval);
    }
    if (config.startWithWindows !== undefined) {
      fields.push('startWithWindows = ?');
      values.push(config.startWithWindows ? 1 : 0);
    }
    if (config.minimizeToTray !== undefined) {
      fields.push('minimizeToTray = ?');
      values.push(config.minimizeToTray ? 1 : 0);
    }
    if (config.showNotifications !== undefined) {
      fields.push('showNotifications = ?');
      values.push(config.showNotifications ? 1 : 0);
    }
    if (config.language !== undefined) {
      fields.push('language = ?');
      values.push(config.language);
    }

    if (fields.length === 0) return false;

    const result = this.db
      .prepare(`UPDATE config SET ${fields.join(', ')} WHERE id = 1`)
      .run(...values);

    return result.changes > 0;
  }

  // ==================== TIME TRACKING ====================

  startTracking(data: {
    userId: string;
    projectId: string | null;
    appName: string;
    processName: string;
  }): TimeEntry {
    const id = this.generateId();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO time_entries
         (id, userId, projectId, appName, processName, startTime, duration, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'auto', ?, ?)`
      )
      .run(id, data.userId, data.projectId, data.appName, data.processName, now, now, now);

    return {
      id,
      ...data,
      startTime: now,
      endTime: null,
      duration: 0,
      status: 'auto',
      isManuallyAdjusted: false,
      syncedToServer: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  stopTracking(entryId: string, status?: string): boolean {
    const entry = this.db.prepare('SELECT * FROM time_entries WHERE id = ?').get(entryId) as any;
    if (!entry) return false;

    const endTime = new Date().toISOString();
    const duration = Math.floor(
      (new Date(endTime).getTime() - new Date(entry.startTime).getTime()) / 1000
    );
    const finalStatus = status ?? entry.status ?? 'auto';

    const result = this.db
      .prepare(
        `UPDATE time_entries SET endTime = ?, duration = ?, status = ?, updatedAt = ? WHERE id = ?`
      )
      .run(endTime, duration, finalStatus, new Date().toISOString(), entryId);

    return result.changes > 0;
  }

  getTimeEntries(date?: string): TimeEntry[] {
    let query = 'SELECT * FROM time_entries';
    const params: any[] = [];

    if (date) {
      query += ' WHERE DATE(startTime) = DATE(?)';
      params.push(date);
    }

    query += ' ORDER BY startTime DESC';

    const rows = this.db.prepare(query).all(...params);
    return rows.map((row: any) => ({
      ...row,
      isManuallyAdjusted: Boolean(row.isManuallyAdjusted),
      syncedToServer: Boolean(row.syncedToServer),
    })) as TimeEntry[];
  }

  // ==================== SUGGESTIONS ====================

  getSuggestion(processName: string): AppSuggestion | null {
    // Get the most recently used project for this process
    const row = this.db
      .prepare(
        `
      SELECT
        p.id as projectId,
        p.name as projectName,
        p.subproject,
        MAX(te.startTime) as lastUsed,
        COUNT(*) as useCount
      FROM time_entries te
      JOIN projects p ON te.projectId = p.id
      WHERE te.processName = ? COLLATE NOCASE
        AND p.isActive = 1
      GROUP BY p.id
      ORDER BY lastUsed DESC
      LIMIT 1
    `
      )
      .get(processName);

    if (!row) return null;

    return row as AppSuggestion;
  }

  // ==================== PROJECT PROGRAMS ====================

  getProjectPrograms(projectId?: string): any[] {
    if (projectId) {
      return this.db.prepare('SELECT * FROM project_programs WHERE projectId = ? ORDER BY displayName').all(projectId) as any[];
    }
    return this.db.prepare(`
      SELECT pp.*, p.name as projectName, p.color as projectColor
      FROM project_programs pp
      LEFT JOIN projects p ON pp.projectId = p.id
      ORDER BY p.name NULLS LAST, pp.displayName
    `).all() as any[];
  }

  getProjectByProcess(processName: string): { projectId: string | null; projectName: string | null; displayName: string } | null {
    const normalizedProcess = processName.replace(/\.exe$/i, '');
    const row = this.db.prepare(`
      SELECT pp.projectId, p.name as projectName, pp.displayName
      FROM project_programs pp
      LEFT JOIN projects p ON pp.projectId = p.id
      WHERE LOWER(pp.processName) = LOWER(?)
      LIMIT 1
    `).get(normalizedProcess) as any;
    return row || null;
  }

  addProjectProgram(projectId: string | null, processName: string, displayName: string): any {
    const id = this.generateId();
    const createdAt = new Date().toISOString();
    const normalizedProcess = processName.replace(/\.exe$/i, '');
    this.db.prepare('INSERT OR REPLACE INTO project_programs (id, projectId, processName, displayName, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(id, projectId ?? null, normalizedProcess, displayName, createdAt);
    return { id, projectId: projectId ?? null, processName: normalizedProcess, displayName, createdAt };
  }

  removeProjectProgram(id: string): boolean {
    return this.db.prepare('DELETE FROM project_programs WHERE id = ?').run(id).changes > 0;
  }

  // ==================== TEAM MEMBERS ====================

  getTeamMembers(): any[] {
    return this.db.prepare('SELECT * FROM team_members WHERE is_active = 1 ORDER BY name').all();
  }

  upsertTeamMember(member: { id: string; name: string; initials: string; color: string; goal_hours: number }): void {
    this.db.prepare(`
      INSERT INTO team_members (id, name, initials, color, goal_hours)
      VALUES (@id, @name, @initials, @color, @goal_hours)
      ON CONFLICT(id) DO UPDATE SET name=@name, initials=@initials, color=@color, goal_hours=@goal_hours
    `).run(member);
  }

  deleteTeamMember(id: string): boolean {
    const result = this.db.prepare('UPDATE team_members SET is_active = 0 WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // ==================== HELPERS ====================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  close() {
    this.db.close();
  }
}
