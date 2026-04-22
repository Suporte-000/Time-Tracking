TimeTrack

TimeTrack is a desktop application for Windows that tracks working time per project automatically. It monitors which program has focus on your screen and records time against projects without requiring manual timers.


What it does

TimeTrack watches the active window in the background. When you use a registered program for a set period of time, it either starts tracking automatically or asks which project to assign the time to. When you switch programs, the previous session stops and the new one begins after the same delay. If you spend time on a program that is not registered, tracking stops after the delay expires.

All data is stored locally in a SQLite database. The application syncs with a shared PostgreSQL database so that managers can view the team's time from a central location.


Technology

The client is built with Electron, React, and TypeScript. The local database uses better-sqlite3. The build system is Vite. Focus detection on Windows uses a small native helper (fg-window.exe) that calls the Win32 GetForegroundWindow API. Inactivity detection uses GetLastInputInfo via the Electron powerMonitor and a native hook.


Project structure

    src/main/              Electron main process
      main.ts              Application entry point
      preload.ts           IPC bridge
      services/
        database.ts        SQLite service
        windowMonitor.ts   Active window detection
        activityMonitorImproved.ts   Inactivity detection
        postgresService.ts PostgreSQL connection
        syncService.ts     Sync logic

    src/renderer/          React application
      App.tsx              Root component
      views/               Dashboard, History, Configuration, Management, PopupDemo
      components/          TitleBar, Sidebar, ProjectPopup, and others

    src/shared/            Types and constants shared between processes
    src/helpers/           fg-window.cs source and compiled fg-window.exe


Available scripts

    npm run dev            Start development with hot-reload
    npm run build          Production build (renderer and main)
    npm run build:win      Build and package for Windows
    npm run typecheck      TypeScript type check without building


Building and packaging

See BUILD_GUIDE.md for the full build and packaging process, including how to handle fg-window.exe and distribute to users.


Data collected

TimeTrack records the process name of the active window, the window title, start and end timestamps, and the project selected by the user. It does not capture screenshots, keystrokes, file contents, or browser history. Network communication goes only to the PostgreSQL server configured by the team.


Requirements

Node.js 20 or higher is required to build the project. For full functionality, the application must run on Windows 10 or Windows 11. Running on Linux works for UI development, but process monitoring returns mock data.
