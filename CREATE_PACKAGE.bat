@echo off
title IlmForge - Create Distribution Package
color 0B
cd /d "%~dp0"

echo.
echo  ============================================================
echo   IlmForge - Distribution Package Creator
echo   Dusre PCs ke liye installer ZIP banata hai
echo  ============================================================
echo.

:: Check PowerShell
powershell -Command "exit 0" >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: PowerShell required!
    pause & exit /b 1
)

:: Build frontend first
echo  [1/3] Frontend build kar rahe hain...
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 (
    echo  ERROR: Frontend build failed!
    pause & exit /b 1
)
cd /d "%~dp0"
echo  OK: Frontend built

echo.
echo  [2/3] Package bana rahe hain...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$src = '%~dp0'; $out = '%~dp0..\IlmForge_Setup'; " ^
    "if(Test-Path $out){Remove-Item $out -Recurse -Force}; " ^
    "New-Item -ItemType Directory $out | Out-Null; " ^
    "New-Item -ItemType Directory '$out\backend' | Out-Null; " ^
    "Copy-Item '$src\backend\src' '$out\backend\src' -Recurse; " ^
    "Copy-Item '$src\backend\prisma' '$out\backend\prisma' -Recurse; " ^
    "Copy-Item '$src\backend\package.json' '$out\backend\'; " ^
    "Copy-Item '$src\backend\package-lock.json' '$out\backend\' -ErrorAction SilentlyContinue; " ^
    "New-Item -ItemType Directory '$out\frontend' | Out-Null; " ^
    "Copy-Item '$src\frontend\dist' '$out\frontend\dist' -Recurse; " ^
    "Copy-Item '$src\frontend\package.json' '$out\frontend\'; " ^
    "Copy-Item '$src\Setup.ps1' '$out\'; " ^
    "Copy-Item '$src\INSTALL.bat' '$out\'; " ^
    "Copy-Item '$src\Uninstall.bat' '$out\'; " ^
    "Write-Host 'Package folder ready: $out'"

echo.
echo  [3/3] ZIP bana rahe hain...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Compress-Archive -Path '%~dp0..\IlmForge_Setup\*' -DestinationPath '%~dp0..\IlmForge_Setup_v3.3.zip' -Force; " ^
    "Write-Host 'ZIP ready!'"

echo.
echo  ============================================================
echo   Package ready!
echo.
echo   Folder: %~dp0..\IlmForge_Setup\
echo   ZIP:    %~dp0..\IlmForge_Setup_v3.3.zip
echo.
echo   Dusre PC pe:
echo   1. ZIP extract karo
echo   2. INSTALL.bat right-click - Run as Administrator
echo   3. License key enter karo
echo   4. Install!
echo  ============================================================
echo.
explorer "%~dp0.."
pause
