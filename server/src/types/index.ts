// Shared types for TimeTrack Server

import { Request } from 'express';

// Extend Express Request to include authenticated user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Sync types
export interface SyncEntry {
  id: string;
  userId: string;
  projectId: string | null;
  appName: string;
  processName: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  status: 'auto' | 'manual' | 'paused';
  clientId?: string;
}

export interface SyncRequest {
  entries: SyncEntry[];
}

export interface SyncResponse {
  synced: number;
  conflicts?: Array<{
    clientId: string;
    reason: string;
  }>;
}

// Dashboard types
export interface DashboardSummary {
  totalTime: number;
  projectCount: number;
  entryCount: number;
  unlinkedTime: number;
  pauseTime: number;
}

export interface TeamMemberStats {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  totalTime: number;
  projectBreakdown: Array<{
    projectId: string;
    projectName: string;
    time: number;
  }>;
  activeProjects: string[];
}
