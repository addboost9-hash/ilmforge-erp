@echo off
title IlmForge — Local School Server Setup
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║         IlmForge — Local Installation Setup             ║
echo  ║         School Management System — Offline Version      ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: ─── Step 1: Check Node.js ───────────────────────────────────────
echo [1/6] Node.js check kar rahe hain...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js nahi mila!
    echo  nodejs.org se Node.js 20 LTS download karein
    pause
    exit /b 1
)
echo  OK: Node.js
node --version

:: ─── Step 2: Backend dependencies ───────────────────────────────
echo.
echo [2/6] Backend dependencies install kar rahe hain...
cd /d "%~dp0backend"
call npm install --quiet
echo  OK: Backend packages

:: ─── Step 3: Switch schema to SQLite ────────────────────────────
echo.
echo [3/6] Database schema SQLite ke liye prepare kar rahe hain...

:: Backup original PostgreSQL schema
if not exist "prisma\schema.pg.bak" (
    copy "prisma\schema.prisma" "prisma\schema.pg.bak" >nul
    echo  OK: Original schema backup hua (schema.pg.bak)
)

:: Create SQLite version using PowerShell
powershell -Command "(Get-Content 'prisma\schema.prisma') -replace 'provider = \"postgresql\"', 'provider = \"sqlite\"' | Set-Content 'prisma\schema.prisma'"
echo  OK: Schema SQLite mode mein switch hua

:: ─── Step 4: Setup local env ─────────────────────────────────────
echo.
echo [4/6] Local environment setup...
copy ".env.local" ".env.sqlite" >nul 2>&1
echo  OK: Local .env ready

:: ─── Step 5: Generate Prisma client + create DB ─────────────────
echo.
echo [5/6] Local SQLite database bana rahe hain...
set DATABASE_URL=file:./prisma/dev.db
call npx prisma generate
call npx prisma db push --accept-data-loss
echo  OK: SQLite database ready (prisma/dev.db)

:: ─── Step 6: Frontend dependencies ──────────────────────────────
echo.
echo [6/6] Frontend dependencies install kar rahe hain...
cd /d "%~dp0frontend"
call npm install --quiet
echo  OK: Frontend packages

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  ✅  Setup Complete!                                     ║
echo  ║                                                          ║
echo  ║  Ab START_LOCAL.bat chalayein school start karne ke liye║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
pause
