@echo off
:: Creates a desktop shortcut for Paperclip
set "REPO=%~dp0"
set "SHORTCUT=%USERPROFILE%\Desktop\Paperclip.lnk"
set "BAT=%REPO%start-paperclip.bat"
set "ICON=%REPO%ui\public\favicon.ico"

echo Creating Paperclip desktop shortcut...

:: Use PowerShell to create proper .lnk shortcut
powershell -Command ^
  "$ws = New-Object -ComObject WScript.Shell; ^
   $sc = $ws.CreateShortcut('%SHORTCUT%'); ^
   $sc.TargetPath = '%BAT%'; ^
   $sc.WorkingDirectory = '%REPO%'; ^
   $sc.Description = 'Paperclip - AI Company Control Plane'; ^
   if (Test-Path '%ICON%') { $sc.IconLocation = '%ICON%' }; ^
   $sc.Save()"

if exist "%SHORTCUT%" (
    echo [OK] Shortcut created: %SHORTCUT%
) else (
    echo [WARN] Could not create shortcut. Run start-paperclip.bat directly.
)
pause
