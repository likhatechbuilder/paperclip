@echo off
setlocal enabledelayedexpansion

:: --- Configuration ---
set "REPO_PATH=%~dp0"
set "PAPERCLIP_OPEN_ON_LISTEN=true"
set "INSTANCE_DIR=%USERPROFILE%\.paperclip\instances\default"

:: --- Initialization ---
title Paperclip: Control Plane Engine
echo ======================================================================
echo [Paperclip] Initializing Standalone Engine...
echo ======================================================================
cd /d "%REPO_PATH%"

:: --- System Check ---
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] pnpm is not installed. Please install it first: https://pnpm.io/installation
    echo [Paperclip] You need node.js and pnpm to run this engine.
    pause
    exit /b 1
)

:: --- Git Support & Updates ---
:: Automatically detect the current branch instead of forcing 'master'
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "CURRENT_BRANCH=%%i"
if "!CURRENT_BRANCH!"=="" set "CURRENT_BRANCH=master"

echo [Paperclip] Current branch: !CURRENT_BRANCH!
echo [Paperclip] Initializing update check (3s remaining)... 

:: Standalone mode choice: skip update if no key pressed in 3 seconds
choice /t 3 /d n /m "[Update] Would you like to check for updates from !CURRENT_BRANCH!?" /c yn

if errorlevel 2 (
    echo [Paperclip] Starting in Standalone Mode (skipping updates)...
) else (
    echo [Paperclip] Pulling latest changes from origin/!CURRENT_BRANCH!...
    git pull origin !CURRENT_BRANCH!
    echo [Paperclip] Syncing dependencies...
    call pnpm install
)

:: --- Cleanup & Persistence Lock Handling ---
echo [Paperclip] Cleaning up stale locks and processes...

:: Kill stale Paperclip node processes (targeted using PowerShell)
powershell -Command "Get-WmiObject Win32_Process -Filter \"Name = 'node.exe' AND CommandLine LIKE '%%paperclip%%'\" | ForEach-Object { Stop-Process $_.ProcessId -Force }" 2>nul
:: Kill stale Postgres (if any)
taskkill /F /IM postgres.exe /T 2>nul

:: Handle pglite/postgres lock file if it exists
set "PID_PATH=!INSTANCE_DIR!\db\postmaster.pid"
if exist "%PID_PATH%" (
    echo [Paperclip] Removing stale database lock: %PID_PATH%
    del /f /q "%PID_PATH%"
)

:: Wait briefly for ports to clear
timeout /t 1 /nobreak >nul

:: --- Environment Check ---
if not exist ".env" (
    echo [Paperclip] Environment not configured. Starting onboarding...
    call pnpm paperclipai onboard
)

:: --- Core Startup ---
echo [Paperclip] Fueling the engine...
echo [Paperclip] Once initialized, the dashboard will open at http://localhost:3100
echo ======================================================================

:: Use the official run command which includes doctor/onboarding checks
:: or fallback to pnpm dev if specific dev watching is needed.
call pnpm paperclipai run --repair

echo [Paperclip] Engine stopped.
pause
