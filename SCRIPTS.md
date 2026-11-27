# GitHub Desktop: Run, Build & Product Release Guide

This document describes how to run, build, and package this application from source into a finished, distributable desktop product for Windows and Linux/macOS.

---

## Quick Reference Scripts Collection

Convenience automation scripts are located in the [`scripts/`](file:///d:/__Code/___Project/habuiquang2000/GitHubDesktop/scripts/) directory for both Windows (PowerShell) and Linux/macOS (Bash):

| Task | Windows (PowerShell) | Linux / macOS (Bash) | npm Command Equivalent |
| :--- | :--- | :--- | :--- |
| **Run Development** | [`.\scripts\dev.ps1`](file:///d:/__Code/___Project/habuiquang2000/GitHubDesktop/scripts/dev.ps1) | [`./scripts/dev.sh`](file:///d:/__Code/___Project/habuiquang2000/GitHubDesktop/scripts/dev.sh) | `npm run build:dev && npm start` |
| **Build Production App** | [`.\scripts\build-prod.ps1`](file:///d:/__Code/___Project/habuiquang2000/GitHubDesktop/scripts/build-prod.ps1) | [`./scripts/build-prod.sh`](file:///d:/__Code/___Project/habuiquang2000/GitHubDesktop/scripts/build-prod.sh) | `npm run build:prod` |
| **Run Production App** | [`.\scripts\run-prod.ps1`](file:///d:/__Code/___Project/habuiquang2000/GitHubDesktop/scripts/run-prod.ps1) | [`./scripts/run-prod.sh`](file:///d:/__Code/___Project/habuiquang2000/GitHubDesktop/scripts/run-prod.sh) | `npm run start:prod` |
| **Package Product / Installer** | [`.\scripts\package-product.ps1`](file:///d:/__Code/___Project/habuiquang2000/GitHubDesktop/scripts/package-product.ps1) | [`./scripts/package-product.sh`](file:///d:/__Code/___Project/habuiquang2000/GitHubDesktop/scripts/package-product.sh) | `npm run package` |

---

## 1. Prerequisites

- **Node.js**: `>= 22.12.0` (check with `node -v`)
- **npm**: `>= 11.17.0` (check with `npm -v`)
- **Python**: `>= 3.9` (required for native node module compilation)
- **C++ Build Tools**:
  - Windows: Visual Studio 2022 / C++ Build Tools
  - Linux: `build-essential`, `libsecret-1-dev`

To install all dependencies cleanly:
```bash
npm ci
```

---

## 2. Development Workflow

In development mode, changes in the renderer are watched and compiled live.

1. **Compile development assets**:
   ```bash
   npm run build:dev
   ```
2. **Start the application with live reload**:
   ```bash
   npm start
   ```
3. **Key developer shortcuts**:
   - <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>R</kbd> (or <kbd>F5</kbd>): Reload the renderer window.
   - <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd>: Open Chrome Developer Tools.

> **Note**: Whenever changes are made to files in `app/src/main-process/`, restart via `npm run build:dev` and `npm start`.

---

## 3. Production Build

To compile all targets in production mode (minified assets, production sourcemaps, bundled Electron application):

```bash
npm run build:prod
```

### What `build:prod` does:
1. Executes `compile:prod`: Runs Webpack with `--max_old_space_size=8192` across all 5 compilation targets (`main`, `renderer`, `crash`, `cli`, `highlighter`).
2. Runs `script/build.ts`:
   - Packages dependencies via npm.
   - Bundles git environment, askpass trampoline, process-proxy, and copilot SDK assets.
   - Compiles native win32/linux bindings.
   - Outputs the standalone runnable app into:
     - **Windows**: `dist/GitHubDesktop-win32-x64/`
     - **Linux**: `dist/GitHubDesktop-linux-x64/`

To launch this production binary directly:
```bash
# Windows
.\dist\GitHubDesktop-win32-x64\GitHubDesktop.exe

# Or via npm script
npm run start:prod
```

---

## 4. Making the Project into a Product (Packaging & Installers)

Once the production build exists, package it into consumer-ready distributable installers:

```bash
npm run package
```

### What `package` generates:
The packaging script uses `electron-winstaller` / platform packaging tools to output the following into the `dist/` directory:

- **Windows Setup Installer**: `dist/GitHubDesktopSetup-x64.exe` (Squirrel.Windows installer with auto-update support)
- **Windows Enterprise MSI**: `dist/GitHubDesktopSetup-x64.msi` (Machine-wide MSI installer for enterprise deployment)
- **Full NuGet Package**: `dist/GitHubDesktop-<version>-x64-full.nupkg`
- **Bundle Hash & Sizes**: `dist/bundle-size.json` and `dist/bundle-hash.json`
- **macOS (when run on macOS)**: `dist/GitHubDesktop-x64.zip`

---

## 5. Clean & Rebuild (Troubleshooting)

If you run into stale build artifacts, corrupted node_modules, or cache issues:

```bash
# Blow away all build output, node_modules, and reinstall clean
npm run clean-slate

# Hard rebuild from scratch for production
npm run rebuild-hard:prod
```

---

## 6. Testing & Quality Checks

Before making a release or product build, verify quality standards:

```bash
# Run unit tests
npm test

# Run code style & lint checks
npm run lint

# Check markdown documentation
npm run markdownlint
```
