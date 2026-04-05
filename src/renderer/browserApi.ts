import type { Project, TimeEntry } from '../shared/types';
import { PROJECT_COLORS } from '../shared/colors';

/**
 * Browser fallback API using localStorage
 * Used when running outside Electron (e.g., in a web browser)
 */

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getStoredProjects(): Project[] {
  const data = localStorage.getItem('timetrack_projects');
  return data ? JSON.parse(data) : [];
}

function saveProjects(projects: Project[]) {
  localStorage.setItem('timetrack_projects', JSON.stringify(projects));
}

function getStoredTimeEntries(): TimeEntry[] {
  const data = localStorage.getItem('timetrack_entries');
  return data ? JSON.parse(data) : [];
}

function saveTimeEntries(entries: TimeEntry[]) {
  localStorage.setItem('timetrack_entries', JSON.stringify(entries));
}

export const browserApi = {
  getProjects: async (): Promise<Project[]> => {
    const projects = getStoredProjects();
    // Reassign distinct colors if projects have duplicate/similar colors
    let updated = false;
    const activeProjects = projects.filter(p => p.isActive);
    activeProjects.forEach((p, i) => {
      const newColor = PROJECT_COLORS[i % PROJECT_COLORS.length];
      const original = projects.find(op => op.id === p.id);
      if (original && original.color !== newColor) {
        original.color = newColor;
        updated = true;
      }
    });
    if (updated) saveProjects(projects);
    return activeProjects;
  },

  createProject: async (project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> => {
    const newProject: Project = {
      ...project,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const projects = getStoredProjects();
    projects.push(newProject);
    saveProjects(projects);
    return newProject;
  },

  updateProject: async (id: string, updates: Partial<Project>): Promise<boolean> => {
    const projects = getStoredProjects();
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) return false;
    projects[idx] = { ...projects[idx], ...updates };
    saveProjects(projects);
    return true;
  },

  deleteProject: async (id: string): Promise<boolean> => {
    const projects = getStoredProjects();
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) return false;
    projects[idx].isActive = false;
    saveProjects(projects);
    return true;
  },

  importProjects: async (_filePath: string): Promise<{ imported: number; errors: string[] }> => {
    return { imported: 0, errors: ['Importação de arquivo não suportada no navegador'] };
  },

  getTimeEntries: async (date?: string): Promise<TimeEntry[]> => {
    let entries = getStoredTimeEntries();
    if (date) {
      entries = entries.filter(e => e.startTime.startsWith(date));
    }
    return entries.sort((a, b) => b.startTime.localeCompare(a.startTime));
  },

  startTracking: async (data: {
    userId: string;
    projectId: string;
    appName: string;
    processName: string;
  }): Promise<TimeEntry> => {
    const now = new Date().toISOString();
    const entry: TimeEntry = {
      id: generateId(),
      ...data,
      startTime: now,
      endTime: null,
      duration: 0,
      status: 'manual',
      isManuallyAdjusted: false,
      syncedToServer: false,
      createdAt: now,
      updatedAt: now,
    };
    const entries = getStoredTimeEntries();
    entries.push(entry);
    saveTimeEntries(entries);
    return entry;
  },

  stopTracking: async (entryId: string): Promise<boolean> => {
    const entries = getStoredTimeEntries();
    const idx = entries.findIndex(e => e.id === entryId);
    if (idx === -1) return false;
    const endTime = new Date().toISOString();
    entries[idx].endTime = endTime;
    entries[idx].duration = Math.floor(
      (new Date(endTime).getTime() - new Date(entries[idx].startTime).getTime()) / 1000
    );
    entries[idx].updatedAt = endTime;
    saveTimeEntries(entries);
    return true;
  },

  deleteTimeEntry: async (entryId: string): Promise<boolean> => {
    const entries = getStoredTimeEntries();
    const filtered = entries.filter(e => e.id !== entryId);
    if (filtered.length === entries.length) return false;
    saveTimeEntries(filtered);
    return true;
  },

  getSuggestion: async (processName: string) => {
    const projects = getStoredProjects().filter(p => p.isActive);
    const matched = projects.find(p =>
      p.processName && p.processName.toLowerCase() === processName.toLowerCase()
    );
    if (!matched) return null;
    return {
      projectId: matched.id,
      projectName: matched.name,
      subproject: matched.appName || null,
      useCount: 1,
    };
  },

  getMonitoredApps: async () => [
    { id: 'app-1', name: 'Visual Studio Code', processName: 'Code', icon: '💻', isEnabled: true, createdAt: '' },
    { id: 'app-2', name: 'Google Chrome', processName: 'chrome', icon: '🌐', isEnabled: true, createdAt: '' },
    { id: 'app-3', name: 'Figma', processName: 'Figma', icon: '🎨', isEnabled: true, createdAt: '' },
    { id: 'app-4', name: 'Microsoft Teams', processName: 'Teams', icon: '💬', isEnabled: true, createdAt: '' },
    { id: 'app-5', name: 'Notion', processName: 'Notion', icon: '📝', isEnabled: true, createdAt: '' },
  ],
  updateMonitoredApp: async () => false,
  getConfig: async () => ({
    inactivityTimeout: 5,
    popupDelay: 2,
    popupAutoClose: 30,
    backupInterval: 60,
    startWithWindows: false,
    minimizeToTray: true,
    showNotifications: false,
  }),
  updateConfig: async () => true,

  minimizeToTray: () => {},
  onActiveWindowChanged: () => {},
  onUserInactive: () => {},
  onUserActive: () => {},
  removeAllListeners: () => {},
};
