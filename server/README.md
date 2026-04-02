# TimeTrack Server API

Node.js + Express + PostgreSQL server for multi-user time tracking.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm 10+

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
nano .env

# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed database with test data
npm run seed

# Start development server
npm run dev
```

Server will start on `http://localhost:5000`

---

## 📦 Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.ts      # Prisma client singleton
│   │   └── env.ts           # Environment validation
│   ├── controllers/
│   │   └── auth.controller.ts
│   ├── middleware/
│   │   └── auth.ts          # JWT authentication
│   ├── routes/
│   │   └── auth.routes.ts
│   ├── services/
│   │   └── auth.service.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts             # Main entry point
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data
├── .env                     # Environment variables
├── package.json
└── tsconfig.json
```

---

## 🔐 Authentication

### Test Credentials (after seeding)

```
Manager:
  Email: manager@timetrack.com
  Password: manager123

Developer 1:
  Email: rodrigo@timetrack.com
  Password: dev123

Developer 2:
  Email: ana@timetrack.com
  Password: dev123
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rodrigo@timetrack.com","password":"dev123"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "rodrigo@timetrack.com",
      "name": "Rodrigo C.",
      "role": "DEVELOPER"
    }
  }
}
```

### Get Current User

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📊 Database Schema

### Users
- id (UUID)
- email (unique)
- name
- passwordHash
- role (DEVELOPER | MANAGER)
- avatarUrl
- isActive
- timestamps

### Projects
- id (UUID)
- name
- subproject (optional)
- color
- isActive
- timestamps

### TimeEntries
- id (UUID)
- userId → users.id
- projectId → projects.id
- appName, processName
- startTime, endTime
- duration (seconds)
- status (AUTO | MANUAL | PAUSED)
- isManuallyAdjusted
- adjustedById, adjustmentReason
- clientId
- timestamps

### AuditLog
- id (UUID)
- userId (who made the change)
- targetUserId (whose data was changed)
- timeEntryId
- oldValue, newValue (JSON)
- reason
- timestamp

### SyncQueue
- id (UUID)
- userId
- entityType, entityId
- operation (CREATE | UPDATE | DELETE)
- payload (JSON)
- synced boolean
- timestamps

---

## 🔧 Environment Variables

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/timetrack
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=24h
ALLOWED_ORIGINS=http://localhost:5173
LOG_LEVEL=info
```

---

## 🛠️ Development Commands

```bash
# Start dev server with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database commands
npx prisma generate      # Generate Prisma Client
npx prisma db push       # Push schema to database
npx prisma studio        # Open Prisma Studio (GUI)
npm run seed             # Seed database

# TypeScript
npm run build            # Compile TypeScript
```

---

## 🌐 API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login with email/password |
| POST | `/api/auth/register` | No | Register new user |
| GET | `/api/auth/me` | Yes | Get current user info |

### Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Server health check |

---

## 🚀 VPS Deployment

### 1. Server Setup (Ubuntu 22.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In psql:
CREATE DATABASE timetrack;
CREATE USER timetrackuser WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE timetrack TO timetrackuser;
\q
```

### 3. Deploy Application

```bash
# Clone repository
git clone <your-repo>
cd TimeTrack/server

# Install dependencies
npm install

# Set up environment
cp .env.example .env
nano .env  # Edit DATABASE_URL and JWT_SECRET

# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed database
npm run seed

# Build application
npm run build

# Install PM2 for process management
sudo npm install -g pm2

# Start server with PM2
pm2 start dist/index.js --name timetrack-server
pm2 save
pm2 startup
```

### 4. Configure Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/timetrack
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/timetrack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 6. Firewall

```bash
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

---

## 🔒 Security Checklist

- [ ] Change JWT_SECRET to a secure random value
- [ ] Use strong PostgreSQL password
- [ ] Enable HTTPS (SSL certificate)
- [ ] Configure firewall (block port 5000 externally)
- [ ] Set NODE_ENV=production
- [ ] Enable rate limiting
- [ ] Regular backups of PostgreSQL database
- [ ] Keep dependencies updated
- [ ] Monitor server logs

---

## 📝 Testing

### Manual API Testing

```bash
# Health check
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rodrigo@timetrack.com","password":"dev123"}'

# Get user (with token)
TOKEN="your_jwt_token_here"
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U timetrackuser -d timetrack

# Check logs
sudo journalctl -u postgresql
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Prisma Issues

```bash
# Regenerate client
npx prisma generate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

---

## 📊 Monitoring

### PM2 Commands

```bash
# View logs
pm2 logs timetrack-server

# Monitor resources
pm2 monit

# Restart server
pm2 restart timetrack-server

# Stop server
pm2 stop timetrack-server
```

---

## 🔄 Updates

### Deploying Updates

```bash
# Pull latest code
git pull

# Install new dependencies
npm install

# Rebuild
npm run build

# Run migrations (if any)
npx prisma migrate deploy

# Restart
pm2 restart timetrack-server
```

---

## 📞 Support

For issues or questions, refer to:
- [Main README](../README.md)
- [Milestone 2 Plan](../MILESTONE_2_PLAN.md)
- Prisma Docs: https://www.prisma.io/docs
- Express Docs: https://expressjs.com

---

**TimeTrack Server** - Built with Node.js, Express, Prisma, and PostgreSQL
