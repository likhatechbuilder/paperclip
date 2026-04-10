@echo off
set "CSC_64=c:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
set "CSC_32=c:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"

if exist "%CSC_64%" (
    echo FOUND_64: %CSC_64%
) else if exist "%CSC_32%" (
    echo FOUND_32: %CSC_32%
) else (
    echo NOT_FOUND
)
