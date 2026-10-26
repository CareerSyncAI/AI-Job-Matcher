@echo off
setlocal EnableDelayedExpansion
title CareerSync AI - Automated Launcher

echo ======================================================================
echo                  CareerSync AI - Automated Launcher                  
echo ======================================================================
echo.

:: 1. Locate Project Root Directory
set "PROJECT_DIR="

if exist "%~dp0backend\app\main.py" (
    set "PROJECT_DIR=%~dp0"
) else if exist "%~dp0AI-Job-Matcher\backend\app\main.py" (
    set "PROJECT_DIR=%~dp0AI-Job-Matcher"
) else if exist "%USERPROFILE%\Desktop\SGP 5TH Sem\AI-Job-Matcher\backend\app\main.py" (
    set "PROJECT_DIR=%USERPROFILE%\Desktop\SGP 5TH Sem\AI-Job-Matcher"
) else if exist "C:\Users\Hit\Desktop\SGP 5TH Sem\AI-Job-Matcher\backend\app\main.py" (
    set "PROJECT_DIR=C:\Users\Hit\Desktop\SGP 5TH Sem\AI-Job-Matcher"
)

if "%PROJECT_DIR%"=="" (
    echo [ERROR] Could not locate CareerSync AI directory!
    echo Looked in:
    echo   - %~dp0
    echo   - %~dp0AI-Job-Matcher
    echo   - C:\Users\Hit\Desktop\SGP 5TH Sem\AI-Job-Matcher
    echo.
    echo Please make sure the AI-Job-Matcher folder exists.
    echo.
    pause
    exit /b 1
)

:: Strip trailing backslash if present
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

echo [INFO] Project Directory : %PROJECT_DIR%

:: Ensure storage uploads directory exists
if not exist "%PROJECT_DIR%\career-sync-storage\uploads" (
    mkdir "%PROJECT_DIR%\career-sync-storage\uploads" >nul 2>nul
)

:: Verify launcher scripts exist
set "LAUNCHER_DIR=%PROJECT_DIR%\scripts\launcher"
if not exist "%LAUNCHER_DIR%\start_backend.bat" (
    echo [ERROR] Launcher helper scripts missing at:
    echo   %LAUNCHER_DIR%
    echo.
    pause
    exit /b 1
)

:: Test flag handler
if "%1"=="--test" (
    echo [TEST_OK] Project directory: !PROJECT_DIR!
    echo [TEST_OK] Launcher directory: !LAUNCHER_DIR!
    exit /b 0
)

:: 2. Check Node / npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm was not found on your system PATH!
    echo Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo [INFO] Node.js / npm     : Detected

:: 3. Clean up any existing stale processes on ports 8000, 8001, and 3000
echo [INFO] Freeing ports 8000, 8001, and 3000 from previous sessions...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000,8001,3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>nul

:: 4. Launch Services in separate dedicated console windows
echo.
echo [INFO] Launching CareerSync AI microservices...
echo   - [1/3] AI Services (Port 8001)
start "CareerSync AI - AI Services (8001)" cmd /k call "%LAUNCHER_DIR%\start_ai_service.bat"

echo   - [2/3] Backend API Server (Port 8000)
start "CareerSync AI - Backend API (8000)" cmd /k call "%LAUNCHER_DIR%\start_backend.bat"

echo   - [3/3] Frontend Web App (Port 3000)
start "CareerSync AI - Frontend Web (3000)" cmd /k call "%LAUNCHER_DIR%\start_frontend.bat"

:: 5. Startup pause and open web browser
echo.
echo [INFO] Waiting 4 seconds for services to initialize...
ping -n 5 127.0.0.1 >nul

echo [INFO] Opening CareerSync AI in your default web browser...
start http://localhost:3000

echo.
echo ======================================================================
echo                  CareerSync AI is now LIVE!                          
echo ======================================================================
echo   Frontend Web    : http://localhost:3000
echo   Backend API     : http://127.0.0.1:8000
echo   Backend Docs    : http://127.0.0.1:8000/docs
echo   AI Microservice : http://127.0.0.1:8001
echo   AI Docs         : http://127.0.0.1:8001/docs
echo ----------------------------------------------------------------------
echo   Default Demo Credentials:
echo     Recruiter     : recruiter.sarah@careersync.dev / Password123456!
echo     Candidate     : david.ross@example.com         / Password123456!
echo ======================================================================
echo.
echo  [!] Keep this window open while using CareerSync AI.
echo  [!] Each service has its own dedicated window showing real-time logs.
echo.

:LOOP_MENU
echo Type 'stop' or 'exit' and press Enter to shut down all services.
echo Or press Enter to re-open http://localhost:3000 in your browser.
set "USER_INPUT="
set /p USER_INPUT="CareerSync AI > "

if /i "%USER_INPUT%"=="stop" goto SHUTDOWN
if /i "%USER_INPUT%"=="exit" goto SHUTDOWN
if /i "%USER_INPUT%"=="q"    goto SHUTDOWN
if /i "%USER_INPUT%"=="x"    goto SHUTDOWN

:: If user pressed Enter or typed anything else, re-open browser and loop
echo [INFO] Opening http://localhost:3000 ...
start http://localhost:3000
goto LOOP_MENU

:SHUTDOWN
echo.
echo [INFO] Shutting down CareerSync AI services...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000,8001,3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>nul
echo [INFO] All services stopped.
ping -n 3 127.0.0.1 >nul
exit /b 0
