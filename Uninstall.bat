@echo off
title IlmForge Uninstaller
color 0C

echo.
echo  IlmForge School Management System — Uninstaller
echo  ─────────────────────────────────────────────────
echo.
set /p confirm="Kya aap IlmForge uninstall karna chahte hain? (yes/no): "
if /i "%confirm%" neq "yes" (
    echo  Uninstall cancelled.
    pause
    exit /b 0
)

set INSTALL_DIR=%PROGRAMFILES%\IlmForge

echo  IlmForge band kar rahe hain...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im wscript.exe >nul 2>&1

echo  Desktop shortcut remove kar rahe hain...
del /q "%USERPROFILE%\Desktop\IlmForge.lnk" >nul 2>&1

echo  Startup entry remove kar rahe hain...
del /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\IlmForge.lnk" >nul 2>&1

echo  Files delete kar rahe hain...
if exist "%INSTALL_DIR%" (
    rmdir /s /q "%INSTALL_DIR%"
    echo  Files deleted.
)

echo.
echo  ✅ IlmForge uninstall ho gaya.
echo.
pause
