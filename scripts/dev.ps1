<#
.SYNOPSIS
    Starts GitHub Desktop in development mode with live compilation.
.DESCRIPTION
    Verifies environment, installs dependencies if necessary, builds dev assets, and launches the app.
#>

$ErrorActionPreference = "Stop"

Write-Host "=== GitHub Desktop: Development Launcher ===" -ForegroundColor Cyan

# 1. Verify dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "[1/3] node_modules not found. Running npm ci..." -ForegroundColor Yellow
    npm ci
} else {
    Write-Host "[1/3] Dependencies found." -ForegroundColor Green
}

# 2. Build dev assets
Write-Host "[2/3] Building development assets..." -ForegroundColor Yellow
npm run build:dev

# 3. Start development server & app
Write-Host "[3/3] Starting development app with live reload..." -ForegroundColor Yellow
Write-Host "Tip: Press Ctrl+Alt+R to reload the UI. Press Ctrl+Shift+I for DevTools." -ForegroundColor Cyan
npm start
