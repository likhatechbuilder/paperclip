@echo off
setlocal enabledelayedexpansion

:: --- Paperclip Standalone Runner ---
:: This script runs Paperclip and ensures a clean, reliable startup on Windows.

title Paperclip Runner
echo ======================================================================
echo [Paperclip] Starting Standalone Runner...
echo ======================================================================

:: 1. Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. 
    echo Please install Node.js 20+ from https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Check for pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] pnpm is missing. Attempting to install pnpm via npm...
    call npm install -g pnpm
    where pnpm >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install pnpm. Please install it manually: https://pnpm.io/installation
        pause
        exit /b 1
    )
)

:: 3. Clean stale PGlite locks (prevent "postmaster.pid" errors)
echo [Paperclip] Cleaning stale database locks...
if exist "data\pglite\postmaster.pid" (
    del /f /q "data\pglite\postmaster.pid" 2>nul
)
:: Also check common global instance path
if exist "%USERPROFILE%\.paperclip\instances\default\db\postmaster.pid" (
    del /f /q "%USERPROFILE%\.paperclip\instances\default\db\postmaster.pid" 2>nul
)

:: 4. Resolve Port
set "PORT=3100"
if exist ".env" (
    for /f "tokens=2 delims==" %%a in ('findstr /I "PORT=" .env') do (
        set "PORT=%%a"
    )
)
echo [Paperclip] Target Port: %PORT%

:: 5. Set Environment Variables
:: Let the server handle browser opening automatically once ready
set "PAPERCLIP_OPEN_ON_LISTEN=true"
:: Ensure auto-apply migrations for a seamless experience
set "PAPERCLIP_MIGRATION_AUTO_APPLY=true"
set "PAPERCLIP_MIGRATION_PROMPT=never"
set "PAPERCLIP_SKIP_WORKSPACE_LINK_CHECK=true"

:: 6. Sync Dependencies
if not exist "node_modules" (
    echo [Paperclip] node_modules missing. Running pnpm install...
    call pnpm install
)

:: 7. Launch App
echo [Paperclip] Launching Engine...
echo [Paperclip] Dashboard will open at http://localhost:%PORT%
echo [Paperclip] Press Ctrl+C to stop the server.

:: Run pnpm dev - this will serve both API and UI
call pnpm dev

if %errorlevel% neq 0 (
    echo [ERROR] Paperclip exited with an error.
    pause
)

exit /b 0

