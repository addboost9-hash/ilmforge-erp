@echo off
title IlmForge — School Management System (Local Server)
color 0B

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║   🎓 IlmForge School Management System                  ║
echo  ║   Local Server — Internet ki zaroorat NAHI             ║
echo  ║   اِلم کو آسان بنائے 🇵🇰                                ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: Get local IP for LAN access
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP: =%

echo  📡 Aapka Local IP: %LOCAL_IP%
echo.

:: Set environment for local
set NODE_ENV=development
set DATABASE_URL=file:./dev.db
set PORT=5000
set FRONTEND_URL=http://localhost:3000
set APP_URL=http://localhost:5000

echo  🔵 Backend server shuru ho raha hai (Port 5000)...
start "IlmForge Backend" cmd /k "cd /d "%~dp0backend" && set NODE_ENV=development && set DATABASE_URL=file:./dev.db && set PORT=5000 && set FRONTEND_URL=http://localhost:3000 && node src/server.js"

echo  ⏳ Backend ready hone ka intezaar (5 seconds)...
timeout /t 5 /nobreak >nul

echo  🟢 Frontend server shuru ho raha hai (Port 3000)...
start "IlmForge Frontend" cmd /k "cd /d "%~dp0frontend" && set VITE_API_URL=http://localhost:5000/api/v1 && npm run dev"

echo  ⏳ Frontend ready hone ka intezaar (5 seconds)...
timeout /t 5 /nobreak >nul

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  ✅ IlmForge Chal Raha Hai!                             ║
echo  ║                                                          ║
echo  ║  🖥️  Is Computer pe:                                    ║
echo  ║     http://localhost:3000                                ║
echo  ║                                                          ║
echo  ║  📱 School Network pe (WiFi se):                        ║
echo  ║     http://%LOCAL_IP%:3000                  ║
echo  ║                                                          ║
echo  ║  💡 Dono servers band karne ke liye yeh window band    ║
echo  ║     karein aur backend/frontend windows bhi band karein ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
echo  Browser khul raha hai...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo  Press any key to close this window (servers chalte rahenge)...
pause >nul
