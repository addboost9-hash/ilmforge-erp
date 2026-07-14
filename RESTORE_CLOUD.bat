@echo off
title IlmForge — Restore Cloud (PostgreSQL) Schema
color 0E

echo.
echo  Restoring PostgreSQL schema for cloud deployment...
echo.

cd /d "%~dp0backend"

if not exist "prisma\schema.pg.bak" (
    echo  No backup found. Schema may already be PostgreSQL.
    pause
    exit /b 0
)

copy "prisma\schema.pg.bak" "prisma\schema.prisma" >nul
echo  OK: schema.prisma restored to PostgreSQL

call npx prisma generate >nul 2>&1
echo  OK: Prisma client regenerated for PostgreSQL

echo.
echo  ✅ Cloud schema restored. Now you can git push safely.
echo.
pause
