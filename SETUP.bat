@echo off
title IlmForge ERP - One-Time Setup
echo ============================================
echo   IlmForge School ERP - Setup Starting...
echo ============================================
echo.
echo [1/4] Installing backend libraries...
cd backend
call npm install
echo.
echo [2/4] Generating Prisma database client...
call npx prisma generate
echo.
echo [3/4] Installing frontend libraries...
cd ..\frontend
call npm install
echo.
echo [4/4] Building frontend (verify no errors)...
call npm run build
cd ..
echo.
echo ============================================
echo   SETUP COMPLETE!
echo   Ab START.bat chalayen project run karne ke liye
echo ============================================
pause
