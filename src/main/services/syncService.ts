import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { PostgresService } from './postgresService';
import type { DatabaseService } from './database';

export interface LocalUserConfig {
  id: string;
  name: string;
  initials: string;
  color: string;
  goalHours: number;
}

const USER_COLORS = [
  '#14919B', '#1FB8A0', '#0B5563', '#0EA5A5',
  '#8B5CF6', '#EC4899', '#F59E0B', '#10B981',
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export class SyncService {
  private configPath: string;
  private localUser: LocalUserConfig | null = null;

  constructor(
    private pg: PostgresService,
    private db: DatabaseService,
  ) {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'user-config.json');
  }

  // ==================== LOCAL USER ====================

  getLocalUser(): LocalUserConfig | null {
    if (this.localUser) return this.localUser;
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        this.localUser = JSON.parse(raw);
        return this.localUser;
      }
    } catch { /* ignore */ }
    return null;
  }

  async saveLocalUser(config: Omit<LocalUserConfig, 'id'> & { id?: string }): Promise<LocalUserConfig> {
    const user: LocalUserConfig = {
      id: config.id || generateId(),
      name: config.name,
      initials: config.initials || getInitials(config.name),
      color: config.color || USER_COLORS[0],
      goalHours: config.goalHours || 8,
    };
    fs.writeFileSync(this.configPath, JSON.stringify(user, null, 2));
    this.localUser = user;

    // Register in PostgreSQL
    if (this.pg.isConnected()) {
      await this.pg.addTeamMember({
        id: user.id,
        name: user.name,
        initials: user.initials,
        color: user.color,
        goal_hours: user.goalHours,
      });
    }
    return user;
  }

  isFirstRun(): boolean {
    return !fs.existsSync(this.configPath);
  }

  // ==================== SYNC TIME ENTRY ====================

  async syncEntry(entryId: string): Promise<void> {
    if (!this.pg.isConnected()) return;
    const user = this.getLocalUser();
    if (!user) return;

    try {
      const entries = this.db.getTimeEntries();
      const entry = entries.find(e => e.id === entryId);
      if (entry) {
        await this.pg.upsertTimeEntry(entry, user.id);
      }
    } catch (err: any) {
      console.error('[Sync] Failed to sync entry:', err.message);
    }
  }

  async syncAllTodayEntries(): Promise<void> {
    if (!this.pg.isConnected()) return;
    const user = this.getLocalUser();
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const entries = this.db.getTimeEntries(today);
      for (const entry of entries) {
        await this.pg.upsertTimeEntry(entry, user.id);
      }
      console.log(`[Sync] Synced ${entries.length} entries`);
    } catch (err: any) {
      console.error('[Sync] Sync failed:', err.message);
    }
  }

  async syncAllProjects(): Promise<void> {
    if (!this.pg.isConnected()) return;
    try {
      const projects = this.db.getProjects();
      for (const p of projects) {
        await this.pg.upsertProject(p);
      }
      console.log(`[Sync] Synced ${projects.length} projects`);
    } catch (err: any) {
      console.error('[Sync] Project sync failed:', err.message);
    }
  }

  // Pull projects and project_programs from PostgreSQL into local SQLite
  async pullFromPostgres(): Promise<void> {
    if (!this.pg.isConnected()) return;
    try {
      // Pull projects
      const pgProjects = await this.pg.getProjects();
      for (const p of pgProjects) {
        this.db.upsertProject({
          id: p.id,
          name: p.name,
          subproject: p.subproject ?? undefined,
          color: p.color,
          isActive: p.is_active,
        });
      }

      // Pull project_programs
      const pgPrograms = await this.pg.getProjectPrograms();
      for (const prog of pgPrograms) {
        this.db.upsertProjectProgram({
          id: prog.id,
          projectId: prog.project_id,
          processName: prog.process_name,
          displayName: prog.display_name,
        });
      }

      console.log(`[Sync] Pulled ${pgProjects.length} projects, ${pgPrograms.length} programs from PostgreSQL`);
    } catch (err: any) {
      console.error('[Sync] Pull from PostgreSQL failed:', err.message);
    }
  }

  getAvailableColors(): string[] {
    return USER_COLORS;
  }
}
