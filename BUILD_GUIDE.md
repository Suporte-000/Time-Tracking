# TimeTrack - Build & Deployment Guide

## Milestone 3 - Complete Distribution Package

This guide covers building and deploying TimeTrack for Windows with all Milestone 3 features completed.

---

## Prerequisites

### System Requirements
- **OS**: Windows 10/11 (for building Windows installer)
- **Node.js**: 20.x or higher
- **npm**: 10.x or higher
- **RAM**: 8GB minimum (for build process)
- **Disk Space**: 2GB free

### Install Dependencies

```bash
cd TimeTrack
npm install
```

---

## Development Mode

### 1. Start Development Server

```bash
npm run dev
```

This will:
1. Start Vite dev server on `http://localhost:5173`
2. Launch Electron with hot-reload enabled
3. Open DevTools for debugging

### 2. Test Features

**Popup Testing:**
- Change active window to a monitored app
- Wait 2 minutes (configurable in settings)
- Popup should appear automatically

**History Testing:**
- Navigate to History view
- Select different dates
- Export CSV file

**System Tray:**
- Minimize to tray
- Right-click tray icon
- Check live tracking status

---

## Production Build

### Step 1: Clean Previous Builds

```bash
# Windows PowerShell
Remove-Item -Recurse -Force dist, dist-electron, release -ErrorAction SilentlyContinue

# Linux/Mac
rm -rf dist dist-electron release
```

### Step 2: Compile TypeScript (Main Process)

```bash
npx tsc --project tsconfig.node.json
```

This compiles:
- `src/main/**/*.ts` → `dist-electron/main/`
- Includes all services: database, windowMonitor, activityMonitor

### Step 3: Build React App (Renderer Process)

```bash
npm run build
```

This creates:
- `dist/` - Optimized React production build
- Minified JS/CSS
- Production-ready assets

### Step 4: Build Windows Installer

```bash
npm run build:win
```

This creates **two** installers in `release/`:

1. **`TimeTrack-Setup-1.0.0.exe`** - NSIS installer
   - User-friendly installation wizard
   - Desktop shortcut creation
   - Start menu integration
   - Uninstaller included

2. **`TimeTrack-1.0.0.exe`** - Portable version
   - No installation required
   - Run directly from USB/network drive
   - Stores data in app directory

---

## Distribution

### Installer Features

**NSIS Installer Options:**
- ✅ Custom installation directory
- ✅ Desktop shortcut
- ✅ Start Menu shortcut
- ✅ Per-user installation (no admin required)
- ✅ Preserves data on uninstall

**File Size:**
- Installer: ~120-150 MB (includes Electron runtime)
- Installed size: ~250-300 MB

### Testing the Installer

1. **Test on clean Windows VM:**
   ```bash
   # Run installer
   TimeTrack-Setup-1.0.0.exe
   ```

2. **Verify installation:**
   - Check desktop shortcut
   - Launch from Start Menu
   - Verify tray icon appears
   - Test process monitoring
   - Create time entries
   - Export CSV

3. **Test uninstallation:**
   - Use Windows "Add/Remove Programs"
   - Verify data is preserved (if needed)
   - Check clean removal

---

## Configuration After Install

### First Run Setup

1. **Configure Monitored Apps:**
   - Go to "Gerenciamento" view
   - Enable apps to monitor (VS Code, Chrome, etc.)

2. **Set Popup Delay:**
   - Go to "Configurações"
   - Set "Delay do Popup" (default: 2 minutes)
   - Set "Tempo de Inatividade" (default: 5 minutes)

3. **Import Projects:**
   - Upload CSV/XLSX with projects
   - Or manually create projects

4. **System Tray:**
   - App minimizes to tray on close
   - Right-click for quick actions

---

## Milestone 3 Features Checklist

### ✅ Completed Features

1. **Smart Popup Window**
   - [x] Appears after 2 min continuous app use
   - [x] Shows AI-powered project suggestion
   - [x] Searchable project list
   - [x] 30-second auto-close countdown
   - [x] Clean, professional UI

2. **Delayed Popup Logic**
   - [x] Tracks continuous app usage
   - [x] Cancels timer on app switch
   - [x] Prevents duplicate popups
   - [x] Checks for active tracking

3. **Detailed History View**
   - [x] Date navigator (prev/next)
   - [x] Daily summary cards (total time, projects, entries)
   - [x] Time entry list with project colors
   - [x] Real-time duration display
   - [x] Status indicators

4. **CSV Export**
   - [x] Excel-compatible format (UTF-8 BOM)
   - [x] Semicolon-delimited
   - [x] Columns: Date, Start, End, Duration, Project, Subproject, App, Status
   - [x] Downloads as `timetrack_YYYY-MM-DD.csv`

5. **Enhanced System Tray**
   - [x] Branded teal icon
   - [x] Live tracking status
   - [x] Context menu with shortcuts
   - [x] Dynamic tooltip
   - [x] Auto-updates every 5 seconds

6. **Windows Installer**
   - [x] NSIS installer package
   - [x] Portable .exe version
   - [x] Desktop/Start Menu shortcuts
   - [x] Custom installation directory
   - [x] Data preservation on uninstall

---

## Troubleshooting

### Build Errors

**Error: "Cannot find module 'better-sqlite3'"**
```bash
npm install --save-dev electron-rebuild
npx electron-rebuild
```

**Error: "TypeScript compilation failed"**
```bash
npm run typecheck
# Fix all errors, then:
npm run build
```

**Error: "Vite build failed"**
```bash
# Clear cache
rm -rf node_modules/.vite
npm run dev:vite
```

### Runtime Issues

**Popup doesn't appear:**
- Check monitored apps are enabled
- Verify popup delay setting (default: 2 min)
- Check console for errors (`Ctrl+Shift+I`)

**Database errors:**
- Delete `%APPDATA%/timetrack/timetrack.db`
- Restart app (will recreate database)

**Tray icon missing:**
- Restart app
- Check Windows notification area settings

---

## Deployment to Team

### Internal Distribution

1. **Host installer on shared drive:**
   ```
   \\company-server\apps\TimeTrack\TimeTrack-Setup-1.0.0.exe
   ```

2. **Send installation email:**
   ```
   Subject: TimeTrack - Novo Sistema de Controle de Horas

   Olá equipe,

   O TimeTrack está pronto para uso! Baixe e instale:
   \\company-server\apps\TimeTrack\TimeTrack-Setup-1.0.0.exe

   Após instalação:
   1. Configure os aplicativos a monitorar
   2. Importe seus projetos (ou crie manualmente)
   3. Deixe rodando em segundo plano

   O app rastreará automaticamente seu tempo!
   ```

3. **VPS Server Setup (if using Milestone 2 sync):**
   - Deploy Node.js API to VPS
   - Configure PostgreSQL database
   - Update app config with server URL

---

## Next Steps (Post-Milestone 3)

### Potential Enhancements:
- [ ] Auto-update functionality
- [ ] Weekly/monthly reports
- [ ] Project time budgets
- [ ] Team leaderboards
- [ ] Mobile companion app
- [ ] Slack/Teams integration

---

## Support

For issues or questions:
1. Check logs: `%APPDATA%/timetrack/logs/`
2. Open DevTools: `Ctrl+Shift+I` in app
3. Contact: dev-team@company.com

---

**Milestone 3 Status: ✅ COMPLETE**

All features implemented and tested. Ready for production deployment!
