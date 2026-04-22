TimeTrack User Manual


Overview

TimeTrack monitors which programs you use and records working time per project. It runs in the background and tracks activity automatically. You do not need to start or stop timers manually in most cases.


Installation

Extract the TimeTrack archive to any folder and run TimeTrack.exe. The application starts minimized to the system tray. It will start automatically with Windows after the first run.

The first time you open the application, a setup screen will ask for your name and role. This information is used to identify your entries in the shared team database.


Main Views

Dashboard
Shows the currently tracked program and project, total time worked today, and a list of all projects with their time bars. If a tracking session is active, a running timer is displayed with a Stop button. A Stop All button is available to end all active sessions at once.

History
Shows time entries by date. You can browse past days to review what was tracked.

Popup Demo
Shows the status of automatic detection. When a registered program is running and not yet being tracked, a button appears to open the project selection window manually. This button is disabled while tracking is already active.

Settings
Contains system parameters and toggles. See the Settings section below.

Management
The administration panel. Requires a manager PIN to access certain actions. Used to manage projects, team members, and registered programs.


How Automatic Tracking Works

TimeTrack watches which program has focus on your screen. When you switch to a program that is registered in the system, a timer begins in the background. If you continue using that program for the minimum popup delay period (default 3 minutes), one of two things happens:

- If the program is linked to a project, tracking starts automatically.
- If the program is not linked to a project, a popup window appears asking you to select which project to assign the time to.

When you switch from one registered program to another, the first program stops and the popup for the second program appears after the same delay, provided you stay on the new program long enough.

If you switch to a program that is not registered and stay there for the full delay period, any active tracking session stops automatically.

Brief switches to the desktop, file explorer, or other unregistered windows do not interrupt a pending timer. The timer only resets when you switch to a different registered program.


Project Selection Popup

The popup shows the name of the detected program and a list of available projects. Select the project you are working on and confirm. If you do not want to track that session, dismiss the popup. The popup closes automatically after the auto-close timeout (default 30 seconds) if no action is taken.

When switching between two registered programs, the popup shows which program you were using before, so you have context when selecting a project.


Registering Programs

Programs must be registered before TimeTrack will track them. Registration is done in the Management panel under the Programs section. The scan tool shows all programs currently running on the machine. Select a program from the list, optionally link it to a specific project, and save. From that point forward, TimeTrack will detect that program when it is in focus.

The process name shown in the scan is the exact name used for detection. For example, Visual Studio Code appears as Code, Google Chrome appears as chrome.


Settings

System Parameters

Inactivity pause: How many minutes of no keyboard or mouse activity before tracking is paused. Default is 5 minutes.

Popup after minimum time: How long you must stay on a program before the popup or auto-tracking activates. Default is 3 minutes.

Auto-close popup in: How many seconds before an unanswered popup closes on its own. Default is 30 seconds.

Automatic backup: How often the local database is copied to a backup file, in hours. Default is 1 hour. Up to 10 backups are kept.

System Toggles

Start with Windows: Launches TimeTrack automatically when you log in.

Minimize to tray: Closing the window sends it to the system tray rather than exiting.

Show notifications: Displays a system notification when tracking starts automatically.


Team and Sync

TimeTrack syncs with a shared PostgreSQL database. Your time entries are uploaded automatically every 5 minutes and whenever a session starts or ends. The database is also checked for project and program updates at the same interval and when a network connection is restored.

When you register your name for the first time, all existing data from the shared database associated with your account is downloaded to the local database.


Manager Functions

The Management panel contains functions that require a manager PIN. These include adding or removing team members, adjusting time entries with an audit trail, and exporting weekly reports. The PIN is set by the manager on first use.


Data and Backup

All data is stored locally in a SQLite database at:
  C:\Users\[username]\AppData\Roaming\timetrack\timetrack.db

Backups are saved to:
  C:\Users\[username]\AppData\Roaming\timetrack\backups\

If you need to move your data to another machine, copy the timetrack.db file to the same location on the new machine before launching the application.


Language

The interface is available in English, Spanish, and Portuguese (Brazil). The language selector is in the left sidebar at the bottom of the main window.
