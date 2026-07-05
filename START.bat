@echo off
title IlmForge ERP - Starting...
echo Starting Backend (port 5000) + Frontend (port 5173)...
start "IlmForge Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak > nul
start "IlmForge Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 5 /nobreak > nul
start http://localhost:5173
echo.
echo Dono servers alag windows mein chal rahe hain.
echo Browser khul jayega: http://localhost:5173
