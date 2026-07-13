@echo off
title IlmForge — Stop Local Server
color 0C

echo.
echo  IlmForge servers band ho rahe hain...
echo.

taskkill /f /im node.exe >nul 2>&1
echo  ✅ Sab servers band ho gaye
echo.
pause
