@echo off
title Paperclip - Stop
echo.
echo  Stopping Paperclip...
echo.

:: Stop dev service if registered
cd /d "%~dp0"
call pnpm dev:stop 2>nul

:: Kill Paperclip node processes
wmic process where "name='node.exe' and CommandLine like '%%paperclip%%'" delete >nul 2>nul

:: Kill embedded postgres
taskkill /F /IM postgres.exe /T >nul 2>nul

:: Remove lock file
if exist "%USERPROFILE%\.paperclip\instances\default\db\postmaster.pid" (
    del /f /q "%USERPROFILE%\.paperclip\instances\default\db\postmaster.pid" >nul 2>nul
)

echo  [OK] Paperclip stopped and cleaned up.
echo.
timeout /t 3
