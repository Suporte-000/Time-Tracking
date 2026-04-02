# Railway.com Database Setup Guide for TimeTrack

Complete guide to set up your Railway PostgreSQL database for TimeTrack.

---

## 🎯 What You Need to Do on Railway.com

You mentioned you have PostgreSQL connected on Railway but nothing is set up. Here's the complete step-by-step process:

---

## 📋 Step 1: Access Your Railway Dashboard

1. Go to https://railway.com
2. Login to your account
3. Open your project (where PostgreSQL is connected)

---

## 🗄️ Step 2: Verify Database Connection

In Railway dashboard:

1. Click on your **PostgreSQL service**
2. Go to **Variables** tab
3. You should see these variables:
   ```
   DATABASE_URL
   PGDATABASE
   PGHOST
   PGPASSWORD
   PGPORT
   PGUSER
   ```

4. **Copy the DATABASE_URL** - It should look like:
   ```
   postgresql://postgres:xpxdkKRODOoKyrxkhcthOwKUNgxdVcAF@gondola.proxy.rlwy.net:42169/railway
   ```

**✅ This is already in your server/.env file, so you're good!**

---

## 🚀 Step 3: Deploy TimeTrack Server to Railway

### Option A: Deploy from GitHub (Recommended)

1. **Push your code to GitHub first**:
   ```bash
   cd /home/ubuntu/project1/TimeTrack
   git add server/
   git commit -m "Add server implementation"
   git push origin main
   ```

2. **In Railway Dashboard**:
   - Click **"New Service"** → **"GitHub Repo"**
   - Select your TimeTrack repository
   - Railway will detect it's a Node.js project

3. **Configure Build Settings**:
   - Root Directory: `server`
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npx prisma db push --accept-data-loss && npm start`
   - Or use this Start Command to avoid data loss: `npm start`

4. **Set Environment Variables** (in Railway):
   Click **Variables** tab and add:
   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=timetrack-production-secret-key-2026-super-secure-random-string-change-this
   JWT_EXPIRES_IN=24h
   ALLOWED_ORIGINS=*
   LOG_LEVEL=info
   ```

   **Important**: Railway automatically injects `${{Postgres.DATABASE_URL}}` to link to your PostgreSQL database!

5. **Deploy**:
   - Click **"Deploy"**
   - Railway will build and start your server
   - You'll get a public URL like: `https://your-app.up.railway.app`

### Option B: Deploy via Railway CLI

1. **Install Railway CLI**:
   ```bash
   npm install -g railway
   ```

2. **Login**:
   ```bash
   railway login
   ```

3. **Link to project**:
   ```bash
   cd /home/ubuntu/project1/TimeTrack/server
   railway link
   # Select your existing Railway project
   ```

4. **Deploy**:
   ```bash
   railway up
   ```

---

## 🗃️ Step 4: Initialize Database Schema

After deploying the server, you need to create tables:

### Method 1: Via Railway Dashboard (Easiest)

1. In Railway, click your **Server service**
2. Go to **Settings** → **Deploy**
3. Add this to **Start Command**:
   ```
   npx prisma db push --accept-data-loss && npm start
   ```
4. **Redeploy** - This will create all tables on first run

### Method 2: Via Railway CLI

```bash
cd /home/ubuntu/project1/TimeTrack/server
railway run npx prisma db push
```

### Method 3: Via Direct Connection (If Needed)

If you have `psql` installed locally:

```bash
# Connect to Railway database
psql postgresql://postgres:xpxdkKRODOoKyrxkhcthOwKUNgxdVcAF@gondola.proxy.rlwy.net:42169/railway

# Then manually run the schema (not recommended, use Prisma instead)
```

---

## 🌱 Step 5: Seed Database with Test Data

After schema is created:

### Via Railway CLI:
```bash
cd /home/ubuntu/project1/TimeTrack/server
railway run npm run seed
```

### Via Dashboard:
1. Go to your server service in Railway
2. Open **Deployments** tab
3. Click on the latest deployment
4. Click **"View Logs"**
5. In the service, you can run one-time commands:
   ```bash
   npm run seed
   ```

This will create:
- 1 Manager user: `manager@timetrack.com` / `manager123`
- 2 Developer users: `rodrigo@timetrack.com` / `dev123`, `ana@timetrack.com` / `dev123`
- 4 Projects (matching the desktop app defaults)
- Sample time entries

---

## ✅ Step 6: Test Your Deployment

Once deployed, test the API:

```bash
# Replace with your Railway URL
export API_URL="https://your-app.up.railway.app"

# Health check
curl $API_URL/health

# Login test
curl -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rodrigo@timetrack.com","password":"dev123"}'
```

You should get a JWT token back!

---

## 🔧 Step 7: Update Desktop Client

Update the desktop app to connect to your Railway server:

1. **Create config in desktop app** (`/src/shared/config.ts`):
   ```typescript
   export const config = {
     apiUrl: process.env.API_URL || 'https://your-app.up.railway.app',
   };
   ```

2. **Update sync service** to use the API URL

3. **Test sync** from desktop app to Railway database

---

## 📊 Database Management on Railway

### View Database Data

**Option 1: Prisma Studio** (GUI)
```bash
cd /home/ubuntu/project1/TimeTrack/server
railway run npx prisma studio
```
Opens a browser GUI at http://localhost:5555

**Option 2: Railway Database Tab**
1. In Railway dashboard
2. Click PostgreSQL service
3. Go to **Data** tab
4. Browse tables and data

**Option 3: Direct psql Connection**
```bash
psql postgresql://postgres:xpxdkKRODOoKyrxkhcthOwKUNgxdVcAF@gondola.proxy.rlwy.net:42169/railway
```

### Common SQL Queries

```sql
-- View all users
SELECT id, email, name, role, is_active FROM users;

-- View all projects
SELECT id, name, subproject, color FROM projects;

-- View recent time entries
SELECT
  te.id,
  u.name as user_name,
  p.name as project_name,
  te.app_name,
  te.duration,
  te.start_time
FROM time_entries te
JOIN users u ON te.user_id = u.id
LEFT JOIN projects p ON te.project_id = p.id
ORDER BY te.start_time DESC
LIMIT 10;
```

---

## 🔐 Security Best Practices

Before going to production:

1. **Change JWT_SECRET** to a random 64+ character string:
   ```bash
   # Generate secure random string
   openssl rand -base64 64
   ```

2. **Update ALLOWED_ORIGINS** to only your desktop app:
   ```
   ALLOWED_ORIGINS=electron://your-app,https://your-domain.com
   ```

3. **Enable SSL** (Railway provides this automatically)

4. **Set strong PostgreSQL password** (Railway does this)

5. **Regular backups** - Railway provides automatic backups in paid plan

---

## 💰 Railway Pricing

- **Free Tier**: $5 credit/month (enough for testing)
- **Hobby Plan**: $5/month (recommended for production)
- **Pro Plan**: $20/month (for larger teams)

Your current setup (PostgreSQL + Node.js server) will consume:
- PostgreSQL: ~$2-3/month
- Server: ~$2-3/month
- **Total**: ~$5-6/month

---

## 🐛 Troubleshooting

### "Can't reach database server"

**Problem**: Connection timeout or firewall issue

**Solution**:
1. Check Railway PostgreSQL is running (green status)
2. Verify DATABASE_URL in environment variables
3. Ensure your IP is not blocked (Railway allows all IPs by default)

### "Error: P3009 - migrate.lock file"

**Problem**: Migration lock file exists

**Solution**:
```bash
railway run npx prisma migrate resolve --applied <migration-name>
```

### "Port already in use"

**Problem**: Railway tries to use occupied port

**Solution**: Railway automatically assigns PORT via environment variable. Don't hardcode port 5000, use `process.env.PORT`

We already have this in `server/src/config/env.ts`:
```typescript
port: parseInt(env.PORT, 10)
```

---

## 📈 Monitoring

### View Logs in Railway

1. Go to your server service
2. Click **Deployments** → Latest deployment
3. Click **View Logs**
4. See real-time logs from your server

### Metrics

Railway provides:
- CPU usage
- Memory usage
- Network traffic
- Request count

---

## 🚀 Quick Summary - What You Need to Do:

### Minimal Steps (Testing):

1. **In Railway Dashboard**:
   - Verify PostgreSQL is running ✓ (you already have this)
   - Note the DATABASE_URL ✓ (already in your .env)

2. **Deploy Server to Railway**:
   ```bash
   # Push code to GitHub
   git add server/
   git commit -m "Add server"
   git push

   # Or use Railway CLI
   npm install -g railway
   railway login
   cd server
   railway up
   ```

3. **Initialize Database**:
   ```bash
   railway run npx prisma db push
   railway run npm run seed
   ```

4. **Test**:
   ```bash
   curl https://your-railway-url/health
   ```

That's it! Your database will be live and accessible.

---

## 📞 Need Help?

If you encounter issues:

1. **Check Railway Logs** - Most errors show here
2. **Verify Environment Variables** - DATABASE_URL must be set
3. **Test Database Connection** - Use `psql` or Prisma Studio
4. **Check Server Status** - Ensure it's running (green status)

---

## ✅ Checklist

- [ ] Railway PostgreSQL is running
- [ ] DATABASE_URL is set in .env
- [ ] Server deployed to Railway (or running locally)
- [ ] Prisma schema pushed (`npx prisma db push`)
- [ ] Database seeded (`npm run seed`)
- [ ] Health endpoint working (`/health`)
- [ ] Login endpoint working (`/api/auth/login`)
- [ ] Test users can login
- [ ] Desktop app can connect to server (next step)

---

**You're ready to deploy!** 🎉

The database credentials you have are correct. You just need to:
1. Deploy the server to Railway
2. Run `prisma db push` to create tables
3. Run seed to create test users
4. Start syncing from desktop app!
