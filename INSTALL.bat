@echo off
:: IlmForge Professional Installer
:: Runs the PowerShell GUI setup
title IlmForge Setup
cd /d "%~dp0"

:: Check if already installed
if exist "%PROGRAMFILES%\IlmForge\app\backend\prisma\dev.db" (
    echo IlmForge already installed. Running app...
    start "" "%PROGRAMFILES%\IlmForge\START.bat"
    exit /b 0
)

:: Launch PowerShell installer with GUI
powershell.exe -ExecutionPolicy Bypass -File "%~dp0Setup.ps1"
