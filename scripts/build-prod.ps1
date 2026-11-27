<#
.SYNOPSIS
    Compiles and builds the production standalone binary for GitHub Desktop.
.DESCRIPTION
    Runs webpack production compilation with 8GB heap allocation and packages standalone binaries into dist/.
#>

$ErrorActionPreference = "Stop"

# Ensure script runs from project root directory regardless of invocation path
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectRoot

Write-Host "=== GitHub Desktop: Production Builder ===" -ForegroundColor Cyan
Write-Host "Working directory: $ProjectRoot" -ForegroundColor Gray

# Ensure dependencies exist
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies with npm ci..." -ForegroundColor Yellow
    npm ci
}

# Stop any running instances of GitHub Desktop that might lock dist/
Get-Process -Name "GitHubDesktop", "GitHubDesktop-dev" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Compiling and building production app (8GB heap)..." -ForegroundColor Yellow
$env:NODE_OPTIONS = "--max_old_space_size=8192 --disable-warning=DEP0170 --disable-warning=DEP0169"
npm run build:prod

Write-Host "`nBuild complete!" -ForegroundColor Green
$DistApp = Get-ChildItem -Path "dist" -Filter "GitHubDesktop*.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if ($DistApp) {
    Write-Host "Standalone binary located at: $($DistApp.FullName)" -ForegroundColor Cyan
} else {
    Write-Host "Artifacts generated in: $(Resolve-Path 'dist')" -ForegroundColor Cyan
}
