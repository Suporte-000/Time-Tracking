# TimeTrack

**Automatic Project Time Tracker for Windows**

TimeTrack runs in the background and tracks which program you are using, recording time against your projects automatically. No manual timers. No forgetting to clock in or out.

---

## Table of Contents

- [What TimeTrack Does](#what-timetrack-does)
- [Installation](#installation)
- [First Run](#first-run)
- [Main Views](#main-views)
- [How Automatic Tracking Works](#how-automatic-tracking-works)
- [Project Selection Popup](#project-selection-popup)
- [Settings](#settings)
- [Manager Panel](#manager-panel)
- [Team Sync](#team-sync)
- [Data and Backup](#data-and-backup)
- [Language](#language)
- [Building from Source](#building-from-source)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting](#troubleshooting)

---

## What TimeTrack Does

TimeTrack watches the active window on your screen. When you switch to a registered program, it waits a configurable delay (default 2 minutes) and then either:

- **Starts tracking automatically** if the program is linked to a specific project.
- **Shows a popup** asking which project to assign the time to, if the program is standalone.

When you switch to a different registered program, the previous session stops and the new one begins after the same delay. If you leave a registered program for an unregistered one long enough, tracking stops automatically.

All data is stored locally on each machine in a SQLite database and synced to a shared PostgreSQL database so managers can view the whole team from one place.

---

## Installation

1. Extract the `TimeTrack-win-x64.tar.gz` archive to any folder on your Windows machine.
2. Open the `win-unpacked` folder and run `TimeTrack.exe`.
3. The app will start and appear in the system tray.

No installer is required. The app starts automatically with Windows after the first run.

---

## First Run

The first time you open the app, a setup screen will ask for your **name** and **role**. This identifies you in the shared team database. Enter your information and click Save to continue.

If your manager has already registered your name in the system, your existing time history will be available immediately after setup.

---

## Main Views

### Dashboard

The main screen. Shows:

- The currently tracked program and project, with a live timer.
- Total time worked today.
- All projects with a time bar for today's hours.
- A **Stop** button to end the current session.
- A **Stop All** button to end all active sessions at once.

### History

Browse time entries by date. Use the arrow buttons to move between days. Each entry shows the program, project, start time, end time, and duration. You can also see entries that were adjusted by a manager.

### Popup Demo

Shows the status of the automatic detection system. If a registered program is running but not yet being tracked, a button appears here to open the project selection popup manually. This button is disabled while a session is already active.

### Settings

System configuration. See the [Settings](#settings) section below.

### Management

The administration panel. Used to manage projects, registered programs, and team members. Some actions require a manager PIN. See the [Manager Panel](#manager-panel) section.

---

## How Automatic Tracking Works

TimeTrack checks the active window continuously. When you focus a registered program:

1. A background timer starts for the configured **popup delay** (default 2 minutes).
2. If you stay on that program until the timer expires:
   - If it is linked to a project, tracking starts silently.
   - If it is standalone, a popup appears asking you to choose a project.
3. If you switch away before the timer expires, the timer is cancelled with no effect.

**Switching between two registered programs:**
When you move from one registered program to another, the first program's session stops after the delay and a popup for the second one appears (if you stay on it long enough).

**Switching to an unregistered program:**
If you focus a program that is not registered (e.g. File Explorer, Notepad) for the full delay period, any active tracking session stops automatically.

**Brief interruptions:**
Quick switches to the desktop, task switcher (Alt+Tab), or file explorer do not reset a pending timer. Only focusing a different registered program or staying on an unregistered one for the full delay will interrupt tracking.

**Inactivity:**
If there is no keyboard or mouse activity for the configured inactivity timeout (default 5 minutes), tracking pauses until you return.

---

## Registering Programs

Programs must be registered before TimeTrack will track them. Registration is done in the **Management** panel under the **Programs** section.

1. Click **Register Program**.
2. A scanner shows all programs currently running. Select one.
3. Optionally link it to a specific project. If left unlinked, the popup will appear asking which project to assign time to each session.
4. Click Save.

From that point forward, TimeTrack will detect that program when it is in focus.

> The process name used for detection is the exact name the operating system reports — for example, Visual Studio Code is `Code`, Google Chrome is `chrome`.

---

## Project Selection Popup

When auto-tracking detects a registered standalone program, a small popup appears in the bottom-right corner of the screen, above all other windows.

- Select the project you are working on and click **Track**.
- If you do not want to track that session, click **Dismiss** or close the popup.
- The popup closes automatically after the auto-close timeout (default 30 seconds) if no action is taken.
- When switching between two registered programs, the popup shows which program you were using before, giving you context.

---

## Settings

Open the **Settings** view from the sidebar.

| Setting | Description | Default |
|---|---|---|
| Inactivity pause | Minutes without keyboard/mouse input before tracking pauses | 5 min |
| Popup after minimum time | How long you must stay on a program before the popup or auto-track fires | 2 min |
| Auto-close popup | Seconds before an unanswered popup closes on its own | 30 s |
| Automatic backup | Hours between automatic local database backups | 1 hr |
| Start with Windows | Launch TimeTrack automatically at login | On |
| Minimize to tray | Closing the window hides it to the tray instead of exiting | On |
| Show notifications | Display a system notification when tracking starts automatically | Off |

---

## Manager Panel

Open **Management** from the sidebar. Manager-only actions require a PIN. The PIN is set the first time a manager clicks **Change Password** in the Management header.

### Projects

- **New Project** — Create a project with a name and optional subproject label.
- **Import CSV** — Bulk-import projects from a CSV file.
- **Register Program** — Associate a running program with a project or add it as standalone.

### Team

Displays all active team members with their name, color, goal hours, and today's tracked time.

**Editing a member:**
Click the edit icon (pencil) next to any member to change their name, color, or daily goal hours.

**Deleting a member:**
Click the delete icon (X) next to any member. The member is deactivated and will no longer appear in the team list. Their historical entries remain in the database.

**Per-member export:**
Click the download icon (↓) next to any member to export their history. A date range picker will appear. Select a start and end date and click Export. A CSV file is saved to your Documents folder.

**Today Report:**
Click **Today Report** in the Management header to export all team members' entries for the currently selected date.

**Export date range:**
Click the calendar icon next to Today Report to export entries for a custom date range across all team members or a specific member.

### Adjusting Time Entries

From the Team view, managers can view and adjust any team member's time entries. All adjustments are recorded in an audit log with the manager's identity and a timestamp.

---

## Team Sync

TimeTrack syncs automatically with the shared PostgreSQL database:

- **Every 5 minutes** — Active entries and completed entries are uploaded.
- **On session start/stop** — The entry is synced immediately when tracking begins or ends.
- **On pull/push** — A manager can manually sync all data using the buttons in the Management panel.

The sync indicator in the top-right of the Management panel shows the last sync status.

---

## Data and Backup

**Local database:**
```
C:\Users\[your name]\AppData\Roaming\timetrack\timetrack.db
```

**Automatic backups:**
```
C:\Users\[your name]\AppData\Roaming\timetrack\backups\
```
Up to 10 backups are kept. The oldest is deleted when a new one is created.

**Log file:**
```
C:\Users\[your name]\AppData\Roaming\timetrack\timetrack.log
```

To move your data to another machine, copy `timetrack.db` to the same path on the new machine before launching the app.

---

## Language

The interface is available in **English**, **Spanish**, and **Portuguese (Brazil)**. The language selector is at the bottom of the left sidebar.

---

## Building from Source

### Build Environment Requirements

You can build TimeTrack on **Windows 10 / 11** or on **Linux**. The Windows path is recommended for clients because it produces a ready-to-run package without any manual file-copying afterwards.

#### Common requirements (both platforms)

| Tool | Minimum version | Why it is needed |
|---|---|---|
| Node.js | 20.x LTS or higher | Runs the build scripts |
| npm | 10.x or higher | Installs dependencies |
| Python | 3.x | Required by `node-gyp` to compile `better-sqlite3` |
| C/C++ build tools | latest | Required to compile `better-sqlite3` |
| Git | any recent | To clone the repository |

Verify your versions before starting:
```
node -v
npm -v
python --version
```

#### Windows-specific requirements

- **Visual Studio Build Tools 2019 or 2022** with the "Desktop development with C++" workload installed. The standalone "Build Tools for Visual Studio" installer is sufficient — the full IDE is not required.
- **.NET Framework 4.x** (already included with Windows 10/11) — only needed if you want to recompile `fg-window.exe`.
- Run all `npm` commands from **Command Prompt** or **PowerShell**, not Git Bash, to avoid path issues with native modules.

The easiest way to install the Windows build prerequisites in one step:
```
npm install --global windows-build-tools
```
This installs Python and the Visual Studio C++ Build Tools automatically. After it finishes, restart your terminal.

#### Linux-specific requirements

- `build-essential` package (provides gcc, g++, make).
- For Ubuntu/Debian:
  ```bash
  sudo apt install build-essential python3 nodejs npm
  ```

> When building on Linux, the resulting Windows package will not contain `fg-window.exe`. You must copy it manually before distributing — see the [Package for Windows](#package-for-windows) section.

### Setup

```
git clone <repo-url>
cd TimeTrack
npm install
```

The `npm install` step compiles `better-sqlite3` natively. This takes 2–5 minutes the first time. If it fails, see [Troubleshooting](#troubleshooting).

### Development

```
npm run dev
```

Starts the Vite dev server and launches Electron with hot-reload. The renderer reloads automatically on frontend changes. Main process changes require a full restart.

### Production Build

```
npm run build
```

Output:
```
dist/             React renderer
dist-electron/    Electron main process and preload
```

### Package for Windows

Run on a Windows machine for a fully working build:
```
npm run build:win
```

This produces:
```
release/win-unpacked/    complete application folder
```

When building on Windows, `fg-window.exe` and the `.env` are included automatically if they exist in the source tree. When building on Linux, copy them manually:
```bash
cp src/helpers/fg-window.exe release/win-unpacked/resources/
cp .env release/win-unpacked/resources/
```

Create the distribution archive (Linux/macOS):
```bash
tar -czf release/TimeTrack-win-x64.tar.gz -C release win-unpacked
```

On Windows, use 7-Zip or PowerShell:
```powershell
Compress-Archive -Path release\win-unpacked -DestinationPath release\TimeTrack-win-x64.zip
```

The archive is approximately 150 MB.

### Type Check

```
npm run typecheck
```

### Rebuilding fg-window.exe

`fg-window.exe` reads the foreground window via the Win32 API. The source is at `src/helpers/fg-window.cs`. To recompile on a Windows machine:

```
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /out:fg-window.exe fg-window.cs
```

Copy the result back to `src/helpers/` and to `release/win-unpacked/resources/`.

---

## Environment Configuration

The app reads database credentials from a `.env` file. The file contains one line:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

**Bundling with the build:**
Place `.env` in `release/win-unpacked/resources/` before packaging. On first run, the app copies this file to the user's AppData folder.

**Updating an existing install:**
Edit the file directly at:
```
C:\Users\Administrator\AppData\Roaming\timetrack\.env
```
Restart the app after editing.

> The `.env` file must never be committed to the repository.

---

## Troubleshooting

**The app does not start or focus detection does not work**
Check that `fg-window.exe` is present in the `resources` folder inside the app directory. If missing, copy it from `src/helpers/`. The app falls back to a slower PowerShell method if the file is not found.

**better-sqlite3 fails to load at runtime**
The native module was built for a different Node or Electron version. Run:
```
npx electron-rebuild
```
Then rebuild with `npm run build:win`.

**`npm install` fails with "gyp ERR! find Python" or "MSB4019" on Windows**
The C++ build toolchain or Python is missing. Install the Visual Studio Build Tools 2019/2022 with the "Desktop development with C++" workload, then restart your terminal and try again. Confirm Python is on the PATH with `python --version`.

**`npm install` fails on Linux with "Python not found" or "g++ not found"**
Install build-essential and Python 3:
```bash
sudo apt install build-essential python3
```

**Popup does not appear for a registered program**
- Confirm the program is listed in Management under Programs.
- Make sure you stayed on the program for the full popup delay without switching away.
- If the program was registered with a `.exe` suffix (e.g. `Code.exe`), the app normalizes it automatically on startup. Restart the app to apply the fix.

**Cannot connect to the team database**
Check the `DATABASE_URL` in the `.env` file. The value must use the public proxy address of the PostgreSQL host, not an internal hostname that is only reachable within the server network.

**The database is corrupted**
Delete the database file and restart. A fresh one will be created automatically. Any entries previously synced to PostgreSQL can be pulled back by using the Pull button in the Management panel.

**Main process changes are not reflected**
The main process is not hot-reloaded. Restart the Electron process after editing any file under `src/main/`.

**CSV export fails with file in use error**
If the previous export file is open in Excel or WPS Office, the app will automatically save to a new timestamped file in your Documents folder instead.
