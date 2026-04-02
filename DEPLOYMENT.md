# TimeTrack - Deployment Guide

How to package and deploy TimeTrack to Windows machines.

---

## 📦 Option 1: Deploy Source Code (For Testing)

### Create Deployment Package

On Linux (development machine):
```bash
cd /home/ubuntu/project1

# Create a clean package without dependencies
tar -czf TimeTrack-source.tar.gz \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='dist-electron' \
  --exclude='.git' \
  TimeTrack/

# Or create ZIP for Windows
zip -r TimeTrack-source.zip TimeTrack/ \
  -x "*/node_modules/*" "*/dist/*" "*/dist-electron/*" "*/.git/*"
```

### Deploy to Windows

1. **Transfer package** to Windows machine (via USB, network, email, etc.)

2. **Extract package**:
   ```powershell
   # If .tar.gz
   tar -xzf TimeTrack-source.tar.gz

   # If .zip
   Expand-Archive -Path TimeTrack-source.zip -DestinationPath .
   ```

3. **Install and run**:
   ```powershell
   cd TimeTrack
   npm install
   npx tsc --project tsconfig.node.json
   npm run dev
   ```

**Package Size**: ~50-100 KB (source only, without node_modules)

---

## 📦 Option 2: Deploy with Dependencies (Faster Setup)

### Create Full Package

On Linux:
```bash
cd /home/ubuntu/project1/TimeTrack

# Install dependencies if not already done
npm install

# Compile TypeScript
npx tsc --project tsconfig.node.json

# Create package WITH node_modules
cd ..
tar -czf TimeTrack-full.tar.gz TimeTrack/ --exclude='.git'

# Or ZIP
zip -r TimeTrack-full.zip TimeTrack/ -x "*/.git/*"
```

### Deploy to Windows

1. **Transfer package** to Windows machine

2. **Extract and run**:
   ```powershell
   # Extract
   tar -xzf TimeTrack-full.tar.gz
   # or
   Expand-Archive -Path TimeTrack-full.zip -DestinationPath .

   # Run directly
   cd TimeTrack
   npm run dev
   ```

**Package Size**: ~200-300 MB (includes node_modules)

**Pros**: Faster setup, no need to run npm install on Windows
**Cons**: Larger package size, may have platform-specific issues

---

## 📦 Option 3: Deploy via Git (Recommended for Development)

### Setup Git Repository

1. **Initialize Git** (if not already):
   ```bash
   cd /home/ubuntu/project1/TimeTrack
   git init
   git add .
   git commit -m "Initial commit - Milestone 1 complete"
   ```

2. **Push to GitHub/GitLab** (optional):
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

### Clone on Windows

```powershell
# Clone repository
git clone <repository-url>
cd TimeTrack

# Install dependencies
npm install

# Build and run
npx tsc --project tsconfig.node.json
npm run dev
```

---

## 🏗️ Option 4: Build Windows Installer (Production)

### Prerequisites

Install on Linux (for cross-platform building):
```bash
# Install wine for Windows builds on Linux
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install wine wine32 wine64
```

### Build Installer

```bash
cd /home/ubuntu/project1/TimeTrack

# Build production
npm run build

# Build Windows installer (.exe)
npm run build:win
```

### Output

Installer will be in `release/` directory:
```
release/
└── TimeTrack Setup 1.0.0.exe
```

### Deploy Installer

1. **Transfer .exe** to Windows machines
2. **Run installer**:
   - Double-click `TimeTrack Setup 1.0.0.exe`
   - Follow installation wizard
   - App installs to `C:\Program Files\TimeTrack`
   - Creates desktop shortcut
   - Adds to Start Menu

**Note**: Installer creation may not work perfectly on Linux. Best to build on Windows.

---

## 🚀 Quick Transfer Methods

### Method 1: Direct Network Copy (LAN)

**On Linux**:
```bash
# Start simple HTTP server
cd /home/ubuntu/project1
python3 -m http.server 8000
```

**On Windows**:
```powershell
# Download via browser
# Open: http://<linux-ip>:8000
# Download TimeTrack-source.zip
```

### Method 2: SCP (Secure Copy)

**On Windows** (using PowerShell with OpenSSH):
```powershell
# Copy from Linux to Windows
scp ubuntu@<linux-ip>:/home/ubuntu/project1/TimeTrack-source.tar.gz C:\Users\$env:USERNAME\Downloads\
```

### Method 3: Cloud Storage

**On Linux**:
```bash
# Upload to cloud (example with rclone or cloud CLI)
# Or manually upload to Dropbox, Google Drive, OneDrive, etc.
```

**On Windows**:
```powershell
# Download from cloud storage
```

---

## 📋 Pre-Deployment Checklist

Before deploying to Windows, verify:

- [ ] Code compiles without errors
- [ ] TypeScript compilation successful
- [ ] Vite build successful
- [ ] All dependencies listed in package.json
- [ ] README.md is up to date
- [ ] WINDOWS_TESTING_GUIDE.md included
- [ ] QUICKSTART.md included
- [ ] .gitignore configured properly
- [ ] No sensitive data in source (API keys, passwords)

---

## 🔒 Security Considerations

### Before Deploying

1. **Review Code**:
   - No hardcoded credentials
   - No API keys in source
   - No debug/development-only code in production

2. **Package Verification**:
   - Verify package integrity (checksums)
   - Scan for malware (if downloading from external source)

3. **Dependencies**:
   - Review npm audit report
   - No known vulnerabilities in dependencies

### Run Security Check

```bash
# Check for vulnerabilities
npm audit

# Fix automatically if possible
npm audit fix
```

---

## 📊 Deployment Size Reference

| Package Type | Size | Transfer Time* | Setup Time |
|-------------|------|----------------|------------|
| Source only | ~100 KB | <1 second | 5-10 min (npm install) |
| With node_modules | ~250 MB | 1-5 min | 1-2 min |
| Windows Installer | ~150 MB | 1-5 min | 2-3 min |
| Git clone | Varies | 1-5 min | 5-10 min |

*Transfer time depends on network speed

---

## 🎯 Recommended Deployment for Testing

**For initial Windows testing**, use **Option 1** (Source Code):

1. Create source package:
   ```bash
   cd /home/ubuntu/project1
   zip -r TimeTrack-v1.0.0-source.zip TimeTrack/ \
     -x "*/node_modules/*" "*/dist/*" "*/dist-electron/*" "*/.git/*"
   ```

2. Transfer to Windows (USB, email, network)

3. Follow [WINDOWS_TESTING_GUIDE.md](WINDOWS_TESTING_GUIDE.md)

**Pros**:
- Small package size (easy to transfer)
- Clean installation on Windows
- npm install on Windows ensures platform-specific binaries

---

## 📁 Files to Include in Package

### Essential Files
```
TimeTrack/
├── src/                  # All source code
├── public/               # Static assets
├── package.json          # Dependencies
├── package-lock.json     # Lock file
├── tsconfig.json         # TS config (renderer)
├── tsconfig.node.json    # TS config (main)
├── vite.config.ts        # Vite config
├── index.html            # Entry HTML
├── README.md             # Documentation
├── QUICKSTART.md         # Quick start guide
├── WINDOWS_TESTING_GUIDE.md  # Windows testing
├── DEPLOYMENT.md         # This file
└── .gitignore            # Git ignore
```

### Optional Files
```
├── TEST_RESULTS.md       # Test results (for reference)
├── .git/                 # Git repository (if using Git)
└── docs/                 # Additional documentation
```

---

## 🛠️ Post-Deployment Verification

After deploying to Windows, verify:

1. **Installation**:
   ```powershell
   node --version
   npm --version
   cd TimeTrack
   npm install
   ```

2. **Build**:
   ```powershell
   npx tsc --project tsconfig.node.json
   # Should complete without errors
   ```

3. **Run**:
   ```powershell
   npm run dev
   # Electron window should open
   ```

4. **Database**:
   ```powershell
   # Check database location
   Test-Path "$env:APPDATA\timetrack\timetrack.db"
   # Should return: True
   ```

---

## 🐛 Common Deployment Issues

### Issue 1: Different Line Endings (CRLF vs LF)

**Problem**: Git converts line endings on Windows
**Solution**: Configure Git properly
```powershell
git config --global core.autocrlf false
```

### Issue 2: Path Length Limits on Windows

**Problem**: Windows has 260 character path limit
**Solution**:
- Extract to short path (e.g., `C:\TimeTrack`)
- Enable long paths in Windows 10/11:
  ```powershell
  # Run as Administrator
  New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
    -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
  ```

### Issue 3: npm Install Fails on Windows

**Problem**: Permission errors or network issues
**Solution**:
```powershell
# Clear npm cache
npm cache clean --force

# Retry installation
npm install --verbose
```

---

## ✅ Deployment Completion Checklist

- [ ] Package created successfully
- [ ] Package transferred to Windows machine
- [ ] Package extracted correctly
- [ ] Dependencies installed without errors
- [ ] TypeScript compiled successfully
- [ ] Application runs without errors
- [ ] Database initializes correctly
- [ ] Windows testing guide reviewed

---

## 📞 Next Steps

After successful deployment:

1. **Follow [WINDOWS_TESTING_GUIDE.md](WINDOWS_TESTING_GUIDE.md)**
2. **Complete all 6 tests**
3. **Document results**
4. **Report any issues**
5. **Proceed to Milestone 2** (if all tests pass)

---

**Ready to deploy!** 🚀

Choose your preferred deployment method and follow the steps above.
