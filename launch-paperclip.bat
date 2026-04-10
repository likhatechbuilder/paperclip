@echo off
setlocal enabledelayedexpansion

:: --- Configuration ---
set "REPO_PATH=%~dp0"
set "PAPERCLIP_OPEN_ON_LISTEN=true"
set "INSTANCE_DIR=%USERPROFILE%\.paperclip\instances\default"

:: --- Initialization ---
title Paperclip: Adaptive Standalone Engine
echo ======================================================================
echo [Paperclip] Initializing Adaptive Standalone Engine...
echo [Paperclip] Targeting: Latest master branch
echo ======================================================================
cd /d "%REPO_PATH%"

:: --- System Check ---
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] pnpm is not installed. Please install it first: https://pnpm.io/installation
    pause
    exit /b 1
)

:: --- Git Sync (Always latest master) ---
echo [Paperclip] Checking for updates from origin/master...
git fetch origin master
if %errorlevel% equ 0 (
    echo [Paperclip] Syncing with origin/master...
    git checkout master 2>nul
    git merge origin/master
    if %errorlevel% neq 0 (
        echo [WARN] Automatic merge failed. You may have local changes.
        echo [Paperclip] Attempting to stash and pull...
        git stash
        git merge origin/master
        git stash pop
    )
) else (
    echo [WARN] Could not reach origin. Starting in offline mode.
)

:: --- Dependency Sync ---
if not exist "node_modules" (
    echo [Paperclip] node_modules missing. Running pnpm install...
    call pnpm install
)

:: --- Database & Process Cleanup ---
echo [Paperclip] Cleaning up stale locks and processes...
:: Kill specific Paperclip and Postgres processes
powershell -Command "Get-WmiObject Win32_Process -Filter \"Name = 'node.exe' AND CommandLine LIKE '%%paperclip%%'\" | ForEach-Object { Stop-Process $_.ProcessId -Force }" 2>nul
taskkill /F /IM postgres.exe /T 2>nul

:: Remove stale PGlite lock
set "PID_PATH=!INSTANCE_DIR!\db\postmaster.pid"
if exist "%PID_PATH%" (
    echo [Paperclip] Removing stale database lock: %PID_PATH%
    del /f /q "%PID_PATH%"
)

:: --- Environment Check ---
if not exist ".env" (
    echo [Paperclip] Environment not configured. Starting onboarding...
    call pnpm paperclipai onboard
)

:: --- Ollama Auto-Start ---
echo [Paperclip] Checking Ollama (local AI provider)...
curl.exe -s --max-time 3 http://localhost:11434/api/tags >nul 2>nul
if %errorlevel% neq 0 (
    echo [Paperclip] Ollama not running - starting it in background...
    start "" /min "C:\Users\%USERNAME%\AppData\Local\Programs\Ollama\ollama.exe" serve
    timeout /t 4 /nobreak >nul
    echo [Paperclip] Ollama started.
) else (
    echo [Paperclip] Ollama already running.
)

:: --- Core Startup ---
echo [Paperclip] Fueling the engine...
echo [Paperclip] Dashboard will open at http://localhost:3100
echo ======================================================================

:: Start the watchdog in background (auto-heals agent errors every 90s)
echo [Paperclip] Starting agent watchdog (auto error recovery)...
start "Paperclip Watchdog" /min cmd /c "timeout /t 15 /nobreak ^>nul ^& node scripts\watchdog.mjs"

:: Run the engine via the Resurrection Protocol Watchdog
node watchdog.mjs

if %errorlevel% neq 0 (
    echo [ERROR] Engine failed to start.
    echo [Paperclip] Running doctor check...
    call pnpm paperclipai doctor
    pause
)

echo [Paperclip] Engine stopped.
pause
