<#
.SYNOPSIS
    Runs the built production executable of GitHub Desktop.
#>

$ErrorActionPreference = "Stop"

$App = Get-ChildItem -Path "dist" -Filter "GitHubDesktop*.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $App) {
    Write-Host "No production executable found in dist/. Run ./scripts/build-prod.ps1 first." -ForegroundColor Red
    exit 1
}

Write-Host "Launching GitHub Desktop ($($App.FullName))..." -ForegroundColor Green
Start-Process -FilePath $App.FullName
