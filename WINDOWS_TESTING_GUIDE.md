# TimeTrack - Windows Testing Guide

Complete guide for testing TimeTrack on Windows 10/11 environment.

---

## 🎯 Prerequisites for Windows Testing

### Required Software
- ✅ **Windows 10 or Windows 11** (64-bit)
- ✅ **Node.js 20+** - Download from [nodejs.org](https://nodejs.org/)
- ✅ **Git** (optional) - For cloning repository
- ✅ **PowerShell 5.1+** (Built-in on Windows 10/11)

### Verify Installation
Open PowerShell and run:
```powershell
# Check Node.js
node --version
# Should show: v20.x.x or higher

# Check npm
npm --version
# Should show: 10.x.x or higher

# Check PowerShell version
$PSVersionTable.PSVersion
# Should show: 5.1.x or higher
```

---

## 📦 Step 1: Transfer Project to Windows

### Option A: Using Git (Recommended)
```powershell
git clone <repository-url>
cd TimeTrack
```

### Option B: Manual Transfer
1. Copy the entire `/home/ubuntu/project1/TimeTrack` folder to Windows
2. Transfer via:
   - Network share (SMB)
   - USB drive
   - Cloud storage (OneDrive, Dropbox, etc.)
   - SCP/SFTP client (WinSCP, FileZilla)

### Option C: Direct Download (ZIP)
1. Create a ZIP archive on Linux:
```bash
cd /home/ubuntu/project1
tar -czf TimeTrack.tar.gz TimeTrack/
```

2. Transfer and extract on Windows:
```powershell
# Extract (if .tar.gz)
tar -xzf TimeTrack.tar.gz

# Or use 7-Zip for .zip files
```

---

## 🚀 Step 2: Install & Build on Windows

Open **PowerShell** or **Command Prompt** in the TimeTrack directory:

```powershell
# 1. Install dependencies
npm install

# 2. Compile TypeScript (Main process)
npx tsc --project tsconfig.node.json

# 3. Run development mode
npm run dev
```

**Expected Result**: Electron window opens with TimeTrack interface

---

## 🧪 Step 3: Test Windows-Specific Features

### Test 1: Active Window Detection

**What to Test:**
- Switch between different applications
- Verify TimeTrack detects the active window

**How to Test:**
1. Open TimeTrack
2. Open **VS Code** (or any monitored app)
3. Switch to VS Code
4. Check PowerShell console in TimeTrack for logs:
   ```
   Active window changed: { processName: 'Code', windowTitle: '...', timestamp: '...' }
   ```

**Expected Behavior:**
- Console logs show "Active window changed" when switching apps
- Process name detected: `Code`, `chrome`, `Figma`, `Teams`, `Notion`

**✅ Pass Criteria:** Window detection works within 1-2 seconds of switching

---

### Test 2: Inactivity Detection

**What to Test:**
- User inactivity triggers pause

**How to Test:**
1. Open TimeTrack
2. Leave computer idle for 5 minutes (default inactivity timeout)
3. Check console for:
   ```
   User inactive: { idleTime: 300000, timestamp: '...' }
   ```
4. Move mouse or press keyboard
5. Check console for:
   ```
   User active again: { timestamp: '...' }
   ```

**Expected Behavior:**
- After 5 min idle: "User inactive" message appears
- After activity resumes: "User active again" message appears
- Title bar shows "Pausado" instead of "Rastreando"

**✅ Pass Criteria:** Idle detection works accurately

---

### Test 3: PowerShell Integration

**What to Test:**
- PowerShell commands execute without errors

**How to Test:**
Run these PowerShell commands manually to verify they work:

#### Get Active Window:
```powershell
Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1 | Select-Object ProcessName, MainWindowTitle | ConvertTo-Json
```

**Expected Output:**
```json
{
  "ProcessName": "Code",
  "MainWindowTitle": "WINDOWS_TESTING_GUIDE.md - TimeTrack - Visual Studio Code"
}
```

#### Get Idle Time:
```powershell
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class IdleTime {
    [DllImport("user32.dll")]
    public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
    public struct LASTINPUTINFO {
        public uint cbSize;
        public uint dwTime;
    }
    public static uint GetIdleTime() {
        LASTINPUTINFO lastInputInfo = new LASTINPUTINFO();
        lastInputInfo.cbSize = (uint)Marshal.SizeOf(lastInputInfo);
        GetLastInputInfo(ref lastInputInfo);
        return ((uint)Environment.TickCount - lastInputInfo.dwTime);
    }
}
'@
[IdleTime]::GetIdleTime()
```

**Expected Output:** Number in milliseconds (e.g., `5234` = 5.2 seconds idle)

**✅ Pass Criteria:** Both PowerShell commands return valid data

---

### Test 4: Database Initialization

**What to Test:**
- SQLite database creates successfully
- Default data is seeded

**How to Test:**
1. Open TimeTrack for the first time
2. Check database location:
   ```
   C:\Users\<YourUsername>\AppData\Roaming\timetrack\timetrack.db
   ```
3. Open database with SQLite browser or run:
   ```powershell
   # Install sqlite3 if needed
   # Then query:
   sqlite3 "C:\Users\$env:USERNAME\AppData\Roaming\timetrack\timetrack.db" "SELECT COUNT(*) FROM projects;"
   ```

**Expected Result:**
- Database file exists
- 4 default projects created
- 5 monitored apps created
- 1 config row created

**✅ Pass Criteria:** Database created with all default data

---

### Test 5: UI Functionality

**What to Test:**
- All views load correctly
- Navigation works
- Data displays properly

**Test Checklist:**

#### Dashboard View
- [ ] Active tracking card visible
- [ ] 4 KPI cards display (Total Today, Projects, Pauses, Unlinked)
- [ ] Project list shows 4 default projects
- [ ] Each project has correct color indicator
- [ ] "Exportar CSV" button present
- [ ] "+ Novo Projeto" button present

#### Configurações View
- [ ] Monitored apps list shows 5 apps
- [ ] Toggle switches present for each app
- [ ] System parameters display:
  - [ ] Inactivity timeout: 5 minutes
  - [ ] Popup delay: 2 minutes
  - [ ] Auto-close popup: 30 seconds
- [ ] All values are configurable

#### Other Views
- [ ] Popup Demo loads
- [ ] Histórico loads
- [ ] Gestão loads (manager view)

#### Title Bar
- [ ] Shows "TimeTrack — Controle de Horas por Projeto"
- [ ] Tracking indicator shows "Rastreando" with green pulse
- [ ] Current time displays and updates every second
- [ ] Window controls (minimize, maximize, close) work

#### Sidebar
- [ ] Logo displays "TimeTrack"
- [ ] All 5 navigation items visible
- [ ] Active view highlighted with blue border
- [ ] User avatar shows "RC"
- [ ] User name shows "Rodrigo C."

**✅ Pass Criteria:** All UI elements render correctly without visual bugs

---

### Test 6: Performance & Stability

**What to Test:**
- Application performance on Windows
- Memory usage
- CPU usage

**How to Test:**
1. Open Task Manager (Ctrl+Shift+Esc)
2. Find "TimeTrack" or "Electron" process
3. Monitor for 5-10 minutes of normal use

**Expected Metrics:**
- **Memory Usage**: 150-250 MB (typical for Electron)
- **CPU Usage**: <5% when idle, <15% when detecting windows
- **Startup Time**: 2-5 seconds
- **No crashes** during extended use

**✅ Pass Criteria:** Application runs smoothly without excessive resource usage

---

## 🐛 Common Issues & Solutions

### Issue 1: PowerShell Execution Policy Error
```
Error: running scripts is disabled on this system
```

**Solution:**
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue 2: Node Modules Installation Failed
```
Error: EACCES permission denied
```

**Solution:**
```powershell
# Clear npm cache
npm cache clean --force

# Reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

### Issue 3: Port 5173 Already in Use
```
Error: Port 5173 is already in use
```

**Solution:**
```powershell
# Find and kill process using port 5173
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force

# Or change port in vite.config.ts
```

### Issue 4: TypeScript Compilation Errors
```
Error: Cannot find module 'better-sqlite3'
```

**Solution:**
```powershell
# Rebuild native modules for Windows
npm rebuild better-sqlite3 --build-from-source
```

### Issue 5: Electron Won't Start
```
Error: spawn ENOENT
```

**Solution:**
```powershell
# Reinstall Electron
npm install electron --save-dev

# Clear Electron cache
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron\Cache"
```

---

## 📊 Test Results Template

Copy this template and fill in your results:

```
# TimeTrack Windows Testing Results

**Tester:** [Your Name]
**Date:** [Date]
**Windows Version:** [10/11]
**Node Version:** [x.x.x]

## Test Results

### Test 1: Active Window Detection
- [ ] Pass
- [ ] Fail
- Issues: [Describe any issues]

### Test 2: Inactivity Detection
- [ ] Pass
- [ ] Fail
- Issues: [Describe any issues]

### Test 3: PowerShell Integration
- [ ] Pass
- [ ] Fail
- Issues: [Describe any issues]

### Test 4: Database Initialization
- [ ] Pass
- [ ] Fail
- Issues: [Describe any issues]

### Test 5: UI Functionality
- [ ] Pass
- [ ] Fail
- Issues: [Describe any issues]

### Test 6: Performance & Stability
- Memory Usage: [X MB]
- CPU Usage: [X%]
- Startup Time: [X seconds]
- [ ] Pass
- [ ] Fail
- Issues: [Describe any issues]

## Screenshots
[Attach screenshots of the running application]

## Overall Assessment
- [ ] Ready for production
- [ ] Needs minor fixes
- [ ] Needs major fixes

## Additional Notes
[Any other observations or feedback]
```

---

## 📸 Screenshots to Capture

Please capture these screenshots for verification:

1. **Dashboard View** - Full window showing projects
2. **Configurações View** - Showing monitored apps and settings
3. **Task Manager** - Showing TimeTrack process resource usage
4. **PowerShell Console** - Showing window detection logs
5. **Database Location** - File Explorer showing timetrack.db
6. **Title Bar** - Showing tracking status indicator

---

## 🎯 Acceptance Criteria

For the application to pass Windows testing:

### Critical (Must Pass)
- ✅ Application starts without errors
- ✅ UI renders correctly
- ✅ Database initializes successfully
- ✅ Active window detection works
- ✅ No crashes during normal use

### Important (Should Pass)
- ✅ Inactivity detection works accurately
- ✅ All navigation works
- ✅ Performance is acceptable (<250 MB RAM, <15% CPU)
- ✅ PowerShell commands execute without errors

### Nice to Have (Can be fixed later)
- ⚠️ Minor UI inconsistencies
- ⚠️ Slight performance optimization needed
- ⚠️ Console warning messages (non-breaking)

---

## 📝 Next Steps After Testing

### If All Tests Pass ✅
1. Document any observations
2. Proceed to Milestone 2 development (Server + Sync)
3. Begin user acceptance testing with team

### If Issues Found ⚠️
1. Document all issues with screenshots
2. Create issue list with priority levels
3. Fix critical issues before proceeding
4. Re-test after fixes

---

## 🔧 Advanced Testing (Optional)

### Test Multiple Monitored Apps
1. Open VS Code, Chrome, Figma simultaneously
2. Switch between them rapidly
3. Verify each switch is detected
4. Check for any lag or missed detections

### Test Database Persistence
1. Create a new project via UI (when implemented)
2. Close TimeTrack
3. Reopen TimeTrack
4. Verify project still exists

### Test Long-Running Stability
1. Leave TimeTrack running overnight
2. Check memory usage doesn't grow (memory leak test)
3. Verify still responsive the next morning

### Test Windows-Specific Edge Cases
1. Lock computer (Win+L) - should pause tracking
2. Sleep/Resume - should resume tracking correctly
3. Multiple monitors - verify window detection works
4. High DPI displays - verify UI scales properly

---

## 📞 Support

If you encounter issues during testing:

1. Check [QUICKSTART.md](QUICKSTART.md) troubleshooting section
2. Review console logs for error messages
3. Check `%APPDATA%\timetrack\logs\` for detailed logs (if logging implemented)
4. Document issue with screenshots and error messages

---

## ✅ Completion Checklist

Before marking Windows testing as complete:

- [ ] All 6 main tests completed
- [ ] Test results template filled out
- [ ] Screenshots captured
- [ ] Issues documented (if any)
- [ ] Overall assessment provided
- [ ] Next steps identified

---

**Ready to test on Windows!** 🚀

Transfer the project to your Windows machine and follow this guide step-by-step.
