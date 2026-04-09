@echo off
echo [Architect] Starting Surgical Repair...

echo [Architect] Killing Postgres...
taskkill /F /IM postgres.exe /T 2>nul

echo [Architect] Killing Paperclip Node processes...
wmic process where "name='node.exe' and CommandLine like '%%paperclip%%'" delete 2>nul

echo [Architect] Removing lock files...
if exist "%USERPROFILE%\.paperclip\instances\default\db\postmaster.pid" (
    echo [Architect] Removing postmaster.pid
    del /f /q "%USERPROFILE%\.paperclip\instances\default\db\postmaster.pid" 2>nul
)

echo [Architect] Truncating massive server.log...
cd /d "%USERPROFILE%\.paperclip\instances\default\logs"
type nul > server.log 2>nul
cd /d "%~dp0"

echo [Architect] Starting Paperclip in background...
set PAPERCLIP_SKIP_WORKSPACE_LINK_CHECK=true
set PAPERCLIP_MIGRATION_AUTO_APPLY=true
set PAPERCLIP_OPEN_ON_LISTEN=true
start /b pnpm dev

echo [Architect] Repair logic completed.
