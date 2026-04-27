# Hospital Management System — start API + app in the browser
# Usage: cd "c:\devops project"; .\start-hms.ps1

$ErrorActionPreference = "Continue" # Don't exit on minor errors

Write-Host "=== Hospital Management System (HMS) ===" -ForegroundColor Cyan

# 1. Detect Node.js
$NodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $NodePath) {
    # Fallback to hardcoded path if not in PATH
    $NodeDir = "C:\Program Files\nodejs"
    if (Test-Path "$NodeDir\node.exe") {
        $env:Path = "$NodeDir;$env:Path"
        $NodePath = "$NodeDir\node.exe"
    } else {
        Write-Host "ERROR: Node.js was not found in your PATH or C:\Program Files\nodejs" -ForegroundColor Red
        Write-Host "Please install Node.js (v18+) from https://nodejs.org"
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host "Using Node: $NodePath" -ForegroundColor Gray

# 2. Check Ports
function Test-Port($port) {
    return Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
}

if (Test-Port 3000) {
    Write-Host "WARNING: Port 3000 is already in use. The Backend API might fail to start." -ForegroundColor Yellow
}
if (Test-Port 8090) {
    Write-Host "WARNING: Port 8090 is already in use. The Mobile/Web app might fail to start." -ForegroundColor Yellow
}

$Root = $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Mobile = Join-Path $Root "mobile"

# 3. Start Backend in a new window
Write-Host "`n1) Starting Backend API on http://localhost:3000..." -ForegroundColor Green
$backendCmd = "Set-Location '$Backend'; node src/index.js"
Start-Process powershell -WorkingDirectory $Backend -ArgumentList @("-NoExit", "-Command", $backendCmd)

Write-Host "Waiting for API to initialize..."
Start-Sleep -Seconds 3

# 4. Start Mobile/Web in THIS window
Write-Host "2) Starting Mobile/Web App on http://localhost:8090..." -ForegroundColor Green
Set-Location $Mobile
# Clear cache and start
npm run web
