# Milestone 2 - Server and Multi-User Implementation Plan

**Goal**: Add centralized server (VPS) with multi-user support, authentication, and real-time synchronization.

---

## 🎯 Objectives

Based on client requirements:
- **15 simultaneous users** supported
- **VPS-hosted** PostgreSQL database
- **Real-time synchronization** from desktop clients
- **Manager dashboard** with team overview
- **Audit log** for manual adjustments
- **Offline-first** with automatic sync when online

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     DESKTOP CLIENTS (15 users)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Client 1   │  │   Client 2   │  │   Client N   │     │
│  │  (Employee)  │  │  (Employee)  │  │  (Manager)   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         │  SQLite Cache    │  SQLite Cache    │              │
│         │  (Offline)       │  (Offline)       │              │
│         └──────────────────┴──────────────────┘              │
│                           │                                   │
│                    HTTPS + JWT Auth                          │
│                           │                                   │
└───────────────────────────┼───────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    VPS SERVER (Client's VPS)                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              Node.js + Express API                     │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  /auth       - Login, JWT tokens                │  │ │
│  │  │  /users      - User management                   │  │ │
│  │  │  /projects   - CRUD projects (sync)             │  │ │
│  │  │  /entries    - Time entries sync                │  │ │
│  │  │  /dashboard  - Manager team view                │  │ │
│  │  │  /audit      - Audit log queries                │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              PostgreSQL Database                       │ │
│  │  • users                                               │ │
│  │  • projects                                            │ │
│  │  • time_entries                                        │ │
│  │  • audit_log                                           │ │
│  │  • sync_queue                                          │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Technology Stack (Server)

| Component | Technology | Reason |
|-----------|------------|--------|
| **Runtime** | Node.js 20 | Same as client, easy maintenance |
| **Framework** | Express.js | Lightweight, battle-tested |
| **Database** | PostgreSQL 15+ | Robust, ACID compliant, multi-user |
| **ORM** | Prisma | Type-safe, migrations, great DX |
| **Authentication** | JWT + bcrypt | Stateless, secure tokens |
| **Validation** | Zod | TypeScript-first validation |
| **API Docs** | Swagger/OpenAPI | Auto-generated documentation |

---

## 🗄️ Database Schema (PostgreSQL)

### **users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('developer', 'manager')),
  avatar_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### **projects**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subproject VARCHAR(255),
  color VARCHAR(7) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### **time_entries**
```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  app_name VARCHAR(255) NOT NULL,
  process_name VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration INTEGER NOT NULL DEFAULT 0, -- seconds
  status VARCHAR(20) NOT NULL DEFAULT 'auto' CHECK (status IN ('auto', 'manual', 'paused')),
  is_manually_adjusted BOOLEAN NOT NULL DEFAULT false,
  adjusted_by UUID REFERENCES users(id),
  adjustment_reason TEXT,
  client_id VARCHAR(255), -- for tracking which client created it
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_time_entries_user_id (user_id),
  INDEX idx_time_entries_project_id (project_id),
  INDEX idx_time_entries_start_time (start_time),
  INDEX idx_time_entries_created_at (created_at)
);
```

### **audit_log**
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_user_id UUID NOT NULL REFERENCES users(id),
  time_entry_id UUID NOT NULL REFERENCES time_entries(id),
  project_name VARCHAR(255) NOT NULL,
  old_value JSONB NOT NULL,
  new_value JSONB NOT NULL,
  reason TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_audit_log_user_id (user_id),
  INDEX idx_audit_log_timestamp (timestamp)
);
```

### **sync_queue** (for offline support)
```sql
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  entity_type VARCHAR(50) NOT NULL, -- 'time_entry', 'project', etc.
  entity_id UUID NOT NULL,
  operation VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
  payload JSONB NOT NULL,
  synced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,

  INDEX idx_sync_queue_user_id (user_id),
  INDEX idx_sync_queue_synced (synced)
);
```

---

## 🔌 API Endpoints

### **Authentication**

```typescript
POST   /api/auth/login
  Body: { email, password }
  Response: { token, user: { id, name, email, role } }

POST   /api/auth/register (admin only)
  Body: { email, name, password, role }
  Response: { user }

GET    /api/auth/me
  Headers: { Authorization: Bearer <token> }
  Response: { user }
```

### **Users**

```typescript
GET    /api/users
  Query: { role?, isActive? }
  Response: { users[] }

GET    /api/users/:id
  Response: { user }

PATCH  /api/users/:id (manager only)
  Body: { name?, role?, isActive? }
  Response: { user }
```

### **Projects**

```typescript
GET    /api/projects
  Query: { isActive? }
  Response: { projects[] }

POST   /api/projects
  Body: { name, subproject?, color }
  Response: { project }

PATCH  /api/projects/:id
  Body: { name?, subproject?, color?, isActive? }
  Response: { project }

POST   /api/projects/import
  Body: { projects: Array<{name, subproject, color}> }
  Response: { imported, errors }
```

### **Time Entries**

```typescript
GET    /api/entries
  Query: { userId?, date?, startDate?, endDate? }
  Response: { entries[] }

POST   /api/entries
  Body: { userId, projectId, appName, processName, startTime }
  Response: { entry }

PATCH  /api/entries/:id
  Body: { endTime?, duration?, projectId? }
  Response: { entry }

PATCH  /api/entries/:id/adjust (manager only)
  Body: { duration, reason }
  Response: { entry, auditLog }
```

### **Sync**

```typescript
POST   /api/sync/entries
  Body: { entries: Array<TimeEntry> }
  Response: { synced, conflicts? }

GET    /api/sync/status
  Query: { userId, since }
  Response: { pendingChanges[] }
```

### **Dashboard (Manager)**

```typescript
GET    /api/dashboard/team
  Query: { date }
  Response: {
    users: Array<{
      user,
      totalTime,
      projectBreakdown,
      activeProjects
    }>
  }

GET    /api/dashboard/summary
  Query: { userId, date }
  Response: {
    totalTime,
    projectCount,
    entryCount,
    unlinkedTime,
    pauseTime
  }
```

### **Audit Log**

```typescript
GET    /api/audit
  Query: { userId?, startDate?, endDate? }
  Response: { logs[] }
```

---

## 🔐 Authentication Flow

```
1. User Login
   Desktop App → POST /api/auth/login { email, password }
   ← JWT token + user info

2. Store Token
   Desktop App stores JWT in electron-store (encrypted)

3. Authenticated Requests
   Desktop App → GET/POST/PATCH /api/*
   Headers: { Authorization: Bearer <token> }

4. Token Validation
   Server validates JWT on every request
   Extracts user info from token

5. Token Refresh (optional)
   If token expires → re-login required
   (or implement refresh token pattern)
```

---

## 🔄 Sync Strategy

### **Client-Side (Desktop App)**

1. **Track Locally First**
   - All time entries saved to local SQLite
   - Mark as `syncedToServer: false`

2. **Background Sync**
   - Every 30 seconds: check for unsynced entries
   - POST /api/sync/entries with batch of entries
   - On success: mark `syncedToServer: true`

3. **Conflict Resolution**
   - Server timestamp wins (CRDT-like)
   - If local entry modified after server: create new entry
   - Show notification to user on conflicts

4. **Offline Support**
   - Queue all changes in local database
   - When online: sync queue automatically
   - Show "Offline" indicator in title bar

### **Server-Side**

1. **Receive Sync Request**
   - Validate all entries
   - Check for duplicates (by client_id + timestamp)
   - Insert/update in PostgreSQL

2. **Return Conflicts**
   - If entry already exists with different data
   - Return conflict list to client
   - Client decides how to resolve

---

## 📊 Manager Dashboard Features

### **Team Overview**
- List all team members
- Total hours per person (today/week/month)
- Active projects per person
- Real-time status (tracking/paused/offline)

### **Project Analytics**
- Total time per project across all users
- Project allocation (who's working on what)
- Time trends (daily/weekly charts)

### **Manual Adjustments**
- View all time entries
- Edit duration/project for any user
- Requires reason for audit log
- Shows original vs adjusted values

---

## 🛠️ Implementation Steps

### **Phase 1: Server Setup** (Day 1-2)
1. Initialize Node.js + Express project
2. Set up PostgreSQL with Prisma
3. Create database migrations
4. Implement JWT authentication
5. Build basic CRUD endpoints

### **Phase 2: Sync System** (Day 3-4)
1. Implement sync queue on server
2. Build /api/sync/* endpoints
3. Update client to send sync requests
4. Add offline detection in client
5. Test sync with multiple clients

### **Phase 3: Manager Features** (Day 5-6)
1. Build dashboard API endpoints
2. Implement audit log system
3. Add manual adjustment functionality
4. Create manager UI components in client
5. Test multi-user scenarios

### **Phase 4: Testing & Deployment** (Day 7)
1. Integration testing (15 users)
2. Performance testing (concurrent requests)
3. Security audit (JWT, SQL injection, etc.)
4. VPS deployment guide
5. Client update to connect to VPS

---

## 🔧 Project Structure (Server)

```
server/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config/
│   │   ├── database.ts          # Prisma client
│   │   └── env.ts               # Environment config
│   ├── middleware/
│   │   ├── auth.ts              # JWT validation
│   │   ├── errorHandler.ts     # Global error handling
│   │   └── validate.ts          # Request validation
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── projects.routes.ts
│   │   ├── entries.routes.ts
│   │   ├── sync.routes.ts
│   │   ├── dashboard.routes.ts
│   │   └── audit.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   ├── projects.controller.ts
│   │   ├── entries.controller.ts
│   │   ├── sync.controller.ts
│   │   ├── dashboard.controller.ts
│   │   └── audit.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── sync.service.ts
│   │   └── analytics.service.ts
│   └── types/
│       └── index.ts
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Migration files
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 🌐 VPS Deployment

### **Requirements**
- Ubuntu 22.04 LTS
- Node.js 20+
- PostgreSQL 15+
- Nginx (reverse proxy)
- SSL certificate (Let's Encrypt)

### **Deployment Steps**
1. SSH into VPS
2. Install Node.js, PostgreSQL, Nginx
3. Clone server repository
4. Set up `.env` with database credentials
5. Run Prisma migrations
6. Start server with PM2
7. Configure Nginx reverse proxy
8. Set up SSL with certbot
9. Configure firewall (allow 80, 443, block 5000)

---

## ✅ Acceptance Criteria

### **Functional**
- [ ] 15 users can connect simultaneously
- [ ] Authentication works (login/logout)
- [ ] Time entries sync in real-time (<5 sec delay)
- [ ] Offline mode queues changes
- [ ] Manager can view all team data
- [ ] Manual adjustments create audit logs
- [ ] No data loss during sync conflicts

### **Performance**
- [ ] API response time <500ms (p95)
- [ ] Supports 100 req/min sustained
- [ ] Database queries optimized (indexed)
- [ ] Handles 1000+ time entries per user

### **Security**
- [ ] JWT tokens expire (24 hours)
- [ ] Passwords hashed with bcrypt (12 rounds)
- [ ] SQL injection protected (Prisma)
- [ ] HTTPS only (no HTTP)
- [ ] CORS configured properly
- [ ] Rate limiting on auth endpoints

---

## 📝 Environment Variables

```env
# Server
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/timetrack

# JWT
JWT_SECRET=<random-256-bit-secret>
JWT_EXPIRES_IN=24h

# CORS
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com

# Logging
LOG_LEVEL=info
```

---

## 🚀 Ready to Start!

Next steps:
1. Create `/server` directory
2. Initialize Node.js + Prisma project
3. Set up PostgreSQL schema
4. Implement authentication
5. Build API endpoints

Let's begin! 🎉
