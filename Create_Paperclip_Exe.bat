@echo off
setlocal
:: Paperclip Launcher Compiler - Final Version

title Paperclip Compiler
echo ======================================================================
echo [Paperclip] Compiling silent launcher...

set "ICON_PATH=ui\public\favicon.ico"
set "CSC_PATH=c:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC_PATH%" set "CSC_PATH=c:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"

set "FLAGS=/target:winexe /out:Paperclip.exe /r:System.Windows.Forms.dll,System.dll"
if exist "%ICON_PATH%" set "FLAGS=%FLAGS% /win32icon:%ICON_PATH%"

echo [Paperclip] Using compiler: %CSC_PATH%
"%CSC_PATH%" %FLAGS% "Paperclip_Launcher.cs"

if %errorlevel% equ 0 (
    echo [Paperclip] Success! Paperclip.exe created.
) else (
    echo [ERROR] Compilation failed.
    pause
    exit /b 1
)
exit /b 0
