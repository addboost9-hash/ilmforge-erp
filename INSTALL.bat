@echo off
title IlmForge Setup
cd /d "%~dp0"

:: ── Admin check ──────────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo  IlmForge Setup ko Administrator rights chahiye.
    echo  Right-click karein aur "Run as Administrator" select karein.
    echo.
    pause
    exit /b 1
)

echo  IlmForge Setup shuru ho raha hai...
echo  PowerShell window khulegi — please wait...
echo.

:: ── Run PowerShell installer ─────────────────────────────────
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Setup.ps1"

if %errorlevel% neq 0 (
    echo.
    echo  ─────────────────────────────────────────────────────
    echo  ERROR: Setup fail hua. Possible reasons:
    echo    1. PowerShell version purani hai (5.0+ chahiye)
    echo    2. Antivirus ne block kiya — temporarily disable karein
    echo    3. Setup.ps1 file missing hai
    echo.
    echo  Support: WhatsApp 0346-5146609
    echo  ─────────────────────────────────────────────────────
    echo.
    pause
)
