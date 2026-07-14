@echo off
title IlmForge — Local School Server
color 0B

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║   IlmForge School Management System                     ║
echo  ║   Local Server — Internet ki zaroorat NAHI              ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP: =%

echo  Local IP: %LOCAL_IP%
echo.

:: Check if setup was done
if not exist "%~dp0backend\prisma\dev.db" (
    echo  Database nahi mili! Pehle LOCAL_SETUP.bat chalayein.
    echo.
    pause
    exit /b 1
)

:: Start Backend
echo  Backend server shuru ho raha hai (Port 5000)...
start "IlmForge Backend" cmd /k "cd /d "%~dp0backend" && set DATABASE_URL=file:./prisma/dev.db && set NODE_ENV=development && set PORT=5000 && set FRONTEND_URL=http://localhost:3000 && set APP_URL=http://localhost:5000 && set JWT_SECRET=IlmForgeLocal@2026#OfflineKey!XyZ789 && set JWT_EXPIRES_IN=24h && set PLATFORM_OWNER_KEY=IlmForge@GhulamMujtaba#PlatformOwner2026!Master && set LICENSE_SECRET=IlmForgeLicense@Secret#2026!OfflineKey && node src/server.js"

timeout /t 5 /nobreak >nul

:: Start Frontend
echo  Frontend server shuru ho raha hai (Port 3000)...
start "IlmForge Frontend" cmd /k "cd /d "%~dp0frontend" && set VITE_API_URL=http://localhost:5000/api/v1 && npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  ✅ IlmForge Chal Raha Hai!                             ║
echo  ║                                                          ║
echo  ║  Is Computer:   http://localhost:3000                    ║
echo  ║  School Network: http://%LOCAL_IP%:3000     ║
echo  ║                                                          ║
echo  ║  Admin Login:   register karein pehli baar              ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
start http://localhost:3000
pause >nul
