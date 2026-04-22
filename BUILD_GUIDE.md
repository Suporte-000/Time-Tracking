TimeTrack Build Guide


Requirements

The build runs on Linux or Windows. You need Node.js 20 or higher and npm 10 or higher. To verify:

    node -v
    npm -v

The project uses better-sqlite3, which is a native Node module. It requires Python 3 and a C++ build toolchain to compile during npm install. On most systems this is already present. If it is missing, the install step will tell you.


Setup

Clone or extract the project, then install dependencies:

    cd TimeTrack
    npm install

This takes a minute or two the first time.


Development

To run the app locally for development:

    npm run dev

This starts the Vite dev server and launches Electron. The renderer reloads automatically when you change frontend files. Main process changes require a restart.

The log file is written to the userData directory. On Windows that is:

    C:\Users\[username]\AppData\Roaming\timetrack\timetrack.log

On Linux it is:

    ~/.config/timetrack/timetrack.log


Production Build

The production build compiles TypeScript and bundles the renderer into static files. Run:

    npm run build

Output goes to:

    dist/             renderer (React)
    dist-electron/    main process and preload


Packaging for Windows

The packager produces an unpacked folder rather than an installer. This is the intended distribution format.

    npm run build:win

This creates:

    release/win-unpacked/    the complete application folder

Because the build runs on Linux, the fg-window.exe helper (used for focus detection) is not automatically included by electron-builder. After the build completes, copy it manually:

    cp src/helpers/fg-window.exe release/win-unpacked/resources/

Then create the archive to send to users:

    tar -czf release/TimeTrack-win-x64.tar.gz -C release win-unpacked

The resulting file is around 150 MB.


Distributing to Users

Send users the tar.gz archive. They extract it and run TimeTrack.exe from the win-unpacked folder. No installation is required.

The .env file must be present in the application folder or in the user's AppData\Roaming\timetrack\ directory. It contains the PostgreSQL connection string. The application will copy a bundled .env to userData on first run if it finds one in the resources folder.

To bundle the .env with the build, place it in the resources folder before packaging:

    cp .env release/win-unpacked/resources/

Users should not need to do anything with this file themselves.


Environment File

The .env file contains one line:

    DATABASE_URL=postgresql://user:password@host:5432/dbname

Replace the values with the actual database credentials. This file should never be committed to the repository.


Rebuilding fg-window.exe

fg-window.exe is a small C# program that reads the foreground window from Windows. The source is at src/helpers/fg-window.cs. To recompile it on a Windows machine:

    C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /out:fg-window.exe fg-window.cs

Copy the resulting fg-window.exe back to src/helpers/ and into release/win-unpacked/resources/ before packaging.


Troubleshooting

The app does not start
Check that fg-window.exe is present in the resources folder. If it is missing, focus detection falls back to PowerShell, which is slower but functional.

better-sqlite3 fails to load
This means the native module was built for a different Node or Electron version. Run:

    npx electron-rebuild

Then rebuild.

The database is corrupted
Delete the database file and restart. The app will create a fresh one. Any entries that were synced to PostgreSQL can be pulled back down by re-registering the user name.

    C:\Users\[username]\AppData\Roaming\timetrack\timetrack.db

Changes to main process code are not reflected
The main process is not hot-reloaded. Restart the Electron process after editing anything under src/main/.
