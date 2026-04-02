================================================================================
  TimeTrack - Windows Deployment Package
  Version: 1.0.0 (Milestone 1)
  Date: April 2, 2026
================================================================================

WHAT'S IN THIS PACKAGE:
-----------------------
Complete TimeTrack source code ready for Windows testing.
Package size: ~85 KB (compressed)

PREREQUISITES FOR WINDOWS:
--------------------------
1. Windows 10 or Windows 11 (64-bit)
2. Node.js 20+ (download from: https://nodejs.org/)
3. PowerShell 5.1+ (built-in)

QUICK START (3 STEPS):
----------------------

Step 1: Extract Package
  - Extract TimeTrack-v1.0.0-source.tar.gz
  - Windows 10/11 can extract .tar.gz natively:
    * Right-click > Extract All
    * Or use 7-Zip if available

Step 2: Install Dependencies
  - Open PowerShell in TimeTrack folder
  - Run: npm install
  - Wait ~5 minutes for installation

Step 3: Run Application
  - Run: npx tsc --project tsconfig.node.json
  - Run: npm run dev
  - Electron window will open automatically!

DETAILED INSTRUCTIONS:
----------------------
See WINDOWS_TESTING_GUIDE.md for complete testing instructions.
See QUICKSTART.md for general usage guide.
See README.md for full documentation.

WHAT TO TEST ON WINDOWS:
------------------------
1. Active window detection (switches between apps)
2. Inactivity detection (idle time tracking)
3. PowerShell integration (process monitoring)
4. Database initialization (SQLite)
5. UI functionality (all 5 views)
6. Performance (memory, CPU usage)

EXPECTED BEHAVIOR:
------------------
- Application starts in 2-5 seconds
- Dashboard shows 4 default projects
- Window detection updates within 1-2 seconds
- Inactivity pause after 5 minutes idle
- Memory usage: 150-250 MB
- CPU usage: <5% idle, <15% active

TROUBLESHOOTING:
----------------

Problem: "npm install" fails
Solution: npm cache clean --force
          npm install

Problem: "Cannot find module 'better-sqlite3'"
Solution: npm rebuild better-sqlite3 --build-from-source

Problem: PowerShell execution policy error
Solution: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
          (Run PowerShell as Administrator)

Problem: Port 5173 already in use
Solution: Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force

DATABASE LOCATION:
------------------
After first run, database will be created at:
C:\Users\<YourUsername>\AppData\Roaming\timetrack\timetrack.db

WHAT'S BEEN IMPLEMENTED:
------------------------
✓ Electron 41 + React 19 + TypeScript 6
✓ SQLite database with offline support
✓ Windows process detection (PowerShell)
✓ Inactivity monitoring (idle time)
✓ Professional dark-themed UI
✓ Project management (Project › Subproject)
✓ CSV/TXT/XLSX project import
✓ Configurable system parameters
✓ 5 default monitored apps (VS Code, Chrome, Figma, Teams, Notion)
✓ 4 default projects with color coding

NEXT STEPS AFTER TESTING:
--------------------------
1. Complete all tests in WINDOWS_TESTING_GUIDE.md
2. Document results (screenshots, observations)
3. Report any issues or feedback
4. If all tests pass → Ready for Milestone 2
   (Server API + Multi-user sync)

SUPPORT & DOCUMENTATION:
-------------------------
- QUICKSTART.md - Quick start in 5 minutes
- WINDOWS_TESTING_GUIDE.md - Complete testing checklist
- DEPLOYMENT.md - Deployment options and troubleshooting
- README.md - Full project documentation
- TEST_RESULTS.md - Linux test results (reference)

MILESTONE 1 DELIVERABLES:
--------------------------
✓ Complete source code with build instructions
✓ Local tracking engine with Windows integration
✓ Professional UI matching design specifications
✓ SQLite database with full schema
✓ Comprehensive documentation
✓ Tested and verified on Linux (development)
⏳ Ready for Windows testing (production environment)

CONTACT & FEEDBACK:
-------------------
After testing, please provide:
1. Test results (pass/fail for each test)
2. Screenshots of running application
3. Performance metrics (memory, CPU)
4. Any issues encountered
5. Overall assessment (ready/needs fixes)

IMPORTANT NOTES:
----------------
- This is Milestone 1 (Local Tracking Engine)
- Milestone 2 will add server sync and multi-user support
- Milestone 3 will add full popup logic and installer
- Current version works offline (no server required)
- All data stored locally in SQLite

SYSTEM REQUIREMENTS:
--------------------
Minimum:
- Windows 10 64-bit
- 4 GB RAM
- 500 MB free disk space
- Node.js 20+

Recommended:
- Windows 11 64-bit
- 8 GB RAM
- 1 GB free disk space
- Node.js 20 (latest LTS)

FILE STRUCTURE:
---------------
TimeTrack/
├── src/                  # Source code
│   ├── main/             # Electron main process
│   ├── renderer/         # React UI
│   └── shared/           # Shared types
├── package.json          # Dependencies
├── tsconfig*.json        # TypeScript config
├── vite.config.ts        # Vite config
├── index.html            # Entry HTML
└── *.md                  # Documentation

THANK YOU FOR TESTING!
----------------------
Your feedback is crucial for ensuring TimeTrack works perfectly
on Windows production environments.

================================================================================
  For questions or issues, please refer to the documentation files
  or contact the development team.
================================================================================
