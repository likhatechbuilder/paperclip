@echo off
setlocal enabledelayedexpansion
title Paperclip Control Plane
color 0A

echo.
echo  ██████╗  █████╗ ██████╗ ███████╗██████╗  ██████╗██╗     ██╗██████╗
echo  ██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔════╝██║     ██║██╔══██╗
echo  ██████╔╝███████║██████╔╝█████╗  ██████╔╝██║     ██║     ██║██████╔╝
echo  ██╔═══╝ ██╔══██║██╔═══╝ ██╔══╝  ██╔══██╗██║     ██║     ██║██╔═══╝
echo  ██║     ██║  ██║██║     ███████╗██║  ██║╚██████╗███████╗██║██║
echo  ╚═╝     ╚═╝  ╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚═╝╚═╝
echo  ───────────────────────────────────────────────────────────────
echo   One-Click Launcher for Windows
echo.

:: ─── Configuration ───
set "REPO=%~dp0"
set "DB_DIR=%USERPROFILE%\.paperclip\instances\default\db"
set "LOG_DIR=%USERPROFILE%\.paperclip\instances\default\logs"
set "HEALTH_URL=http://127.0.0.1:3100/api/health"
set "MAX_WAIT=180"

cd /d "%REPO%"

:: ─── Step 1: System check ───
echo  [1/6] Checking prerequisites...
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo  [ERROR] pnpm not found. Install: https://pnpm.io/installation
    pause
    exit /b 1
)
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Install: https://nodejs.org
    pause
    exit /b 1
)
echo  [OK] pnpm and Node.js found.

:: ─── Step 2: Kill stale processes ───
echo  [2/6] Cleaning up stale processes...
wmic process where "name='node.exe' and CommandLine like '%%paperclip%%'" delete >nul 2>nul
taskkill /F /IM postgres.exe /T >nul 2>nul
echo  [OK] Stale processes cleared.

:: ─── Step 3: Remove database lock ───
echo  [3/6] Removing database locks...
if exist "%DB_DIR%\postmaster.pid" (
    del /f /q "%DB_DIR%\postmaster.pid" >nul 2>nul
    echo  [OK] Removed stale postmaster.pid
) else (
    echo  [OK] No stale locks found.
)

:: ─── Step 4: Truncate massive log file ───
echo  [4/6] Managing log files...
if exist "%LOG_DIR%\server.log" (
    for %%A in ("%LOG_DIR%\server.log") do (
        if %%~zA GTR 104857600 (
            echo  [INFO] server.log is over 100MB, truncating...
            type nul > "%LOG_DIR%\server.log"
        )
    )
)
echo  [OK] Logs managed.

:: ─── Step 5: Check dependencies ───
echo  [5/6] Checking dependencies...
if not exist "node_modules" (
    echo  [INFO] node_modules missing, running pnpm install...
    call pnpm install
    if %errorlevel% neq 0 (
        echo  [ERROR] pnpm install failed.
        pause
        exit /b 1
    )
)
echo  [OK] Dependencies ready.

:: ─── Step 6: Launch Paperclip ───
echo  [6/6] Starting Paperclip engine...
echo.
echo  ───────────────────────────────────────────────────────────────
echo   Dashboard: http://localhost:3100
echo   Health:    http://localhost:3100/api/health
echo   Mode:     dev:once (no file watcher, fast on Windows)
echo  ───────────────────────────────────────────────────────────────
echo.

:: Set environment for fast Windows startup
set PAPERCLIP_SKIP_WORKSPACE_LINK_CHECK=true
set PAPERCLIP_OPEN_ON_LISTEN=true
set PAPERCLIP_MIGRATION_AUTO_APPLY=true

:: Use dev:once to avoid tsx watch NTFS hang
call pnpm dev:once

:: If we get here, the server exited
echo.
echo  ───────────────────────────────────────────────────────────────
echo  [INFO] Paperclip has stopped.
echo  ───────────────────────────────────────────────────────────────
pause
