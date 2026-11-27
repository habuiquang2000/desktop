<#
.SYNOPSIS
    Packages GitHub Desktop into a distributable product (installer, msi, and nupkg).
.DESCRIPTION
    Ensures production build exists and runs electron-winstaller packaging script.
#>

$ErrorActionPreference = "Stop"

Write-Host "=== GitHub Desktop: Product Packager ===" -ForegroundColor Cyan

# 1. Ensure build exists
$DistDirs = Get-ChildItem -Path "dist" -Directory -Filter "GitHubDesktop-*" -ErrorAction SilentlyContinue
if (-not $DistDirs) {
    Write-Host "[1/2] Production build not found in dist/. Building now..." -ForegroundColor Yellow
    npm run build:prod
} else {
    Write-Host "[1/2] Existing production build found in dist/." -ForegroundColor Green
}

# 2. Package into installer
Write-Host "[2/2] Generating product installer and distribution packages..." -ForegroundColor Yellow
npm run package

Write-Host "`nPackaging complete! Distributables generated in: $(Resolve-Path 'dist')" -ForegroundColor Green
Get-ChildItem -Path "dist" -Include "*.exe","*.msi","*.zip","*.nupkg" -File -Recurse | ForEach-Object {
    Write-Host " - $($_.Name) ($([math]::Round($_.Length / 1MB, 2)) MB)" -ForegroundColor Cyan
}
