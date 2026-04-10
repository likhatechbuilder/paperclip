@echo off
set "CSC_PATH=c:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
"%CSC_PATH%" /target:winexe /out:Paperclip.exe /r:System.Windows.Forms.dll,System.dll "Paperclip_Launcher.cs"
echo Done.
