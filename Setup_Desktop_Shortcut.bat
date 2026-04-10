@echo off
setlocal enabledelayedexpansion

:: --- Paperclip Shortcut Setup ---
:: This script creates a Desktop shortcut for Paperclip.

title Shortcut Setup
echo ======================================================================
echo [Paperclip] Creating Desktop Shortcut...

:: 1. Variables
set "BASE_DIR=%~dp0"
set "ICON_PATH=%BASE_DIR%ui\public\favicon.ico"
set "LNK_NAME=Paperclip.lnk"

:: Detect Desktop Path (including OneDrive)
set "DESKTOP_PATH=%USERPROFILE%\Desktop"
if exist "%USERPROFILE%\OneDrive\Desktop" (
    set "DESKTOP_PATH=%USERPROFILE%\OneDrive\Desktop"
)

:: 2. Target Choice
if exist "%BASE_DIR%Paperclip.exe" (
    set "TARGET=%BASE_DIR%Paperclip.exe"
    set "DESC=Paperclip Standalone Engine (Silent)"
) else (
    set "TARGET=%BASE_DIR%Paperclip_Runner.bat"
    set "DESC=Paperclip Standalone Engine (Console)"
)

:: 3. Create Shortcut via VBScript
set SCRIPT="%TEMP%\%RANDOM%-%RANDOM%.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") >> %SCRIPT%
echo sLinkFile = "%DESKTOP_PATH%\%LNK_NAME%" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "%TARGET%" >> %SCRIPT%
echo oLink.WorkingDirectory = "%BASE_DIR%" >> %SCRIPT%
echo oLink.Description = "%DESC%" >> %SCRIPT%
if exist "%ICON_PATH%" (
    echo oLink.IconLocation = "%ICON_PATH%" >> %SCRIPT%
)
echo oLink.Save >> %SCRIPT%

cscript /nologo %SCRIPT%
del %SCRIPT%

echo [Paperclip] Success! Shortcut created on your Desktop.
echo ======================================================================
pause
exit /b 0
