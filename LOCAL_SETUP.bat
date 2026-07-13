@echo off
title IlmForge — Local School Server Setup
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║         IlmForge — Local Installation Setup             ║
echo  ║         School Management System — Offline Version      ║
echo  ║         Internet ki zaroorat NAHI hai!                  ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: Check Node.js
echo [1/5] Node.js check kar rahe hain...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ⚠️  Node.js nahi mila!
    echo  👉 https://nodejs.org se Node.js 20 download karein
    echo  👉 Install karein aur yeh script dobara chalayein
    echo.
    pause
    exit /b 1
)
echo  ✅ Node.js mila:
node --version
echo.

:: Backend setup
echo [2/5] Backend dependencies install kar rahe hain...
cd /d "%~dp0backend"
call npm install --quiet
if %errorlevel% neq 0 (
    echo  ❌ Backend install fail hua. Internet check karein ya IT se rabta karein.
    pause
    exit /b 1
)
echo  ✅ Backend ready
echo.

:: Database setup
echo [3/5] Local database setup kar rahe hain (SQLite)...
if not exist "prisma\dev.db" (
    call npx prisma generate --quiet
    call npx prisma db push --accept-data-loss
    echo  ✅ Fresh database bana
) else (
    call npx prisma generate --quiet
    call npx prisma db push --accept-data-loss
    echo  ✅ Existing database use ho raha hai
)
echo.

:: Frontend setup
echo [4/5] Frontend dependencies install kar rahe hain...
cd /d "%~dp0frontend"
call npm install --quiet
echo  ✅ Frontend ready
echo.

echo [5/5] Sab kuch setup ho gaya!
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  ✅ IlmForge Local Setup Complete!                      ║
echo  ║                                                          ║
echo  ║  Ab START_LOCAL.bat chalayein school start karne ke liye║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
pause
