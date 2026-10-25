@echo off
setlocal EnableDelayedExpansion
title CareerSync AI - Automated Launcher

echo ======================================================================
echo                  CareerSync AI - Automated Launcher                  
echo ======================================================================
echo.

:: 1. Auto-detect project folder
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR="

if exist "%SCRIPT_DIR%backend\app\main.py" (
    set "PROJECT_DIR=%SCRIPT_DIR%"
) else if exist "%SCRIPT_DIR%AI-Job-Matcher\backend\app\main.py" (
    set "PROJECT_DIR=%SCRIPT_DIR%AI-Job-Matcher\"
) else if exist "%SCRIPT_DIR%SGP 5TH Sem\AI-Job-Matcher\backend\app\main.py" (
    set "PROJECT_DIR=%SCRIPT_DIR%SGP 5TH Sem\AI-Job-Matcher\"
) else if exist "C:\Users\Hit\Desktop\SGP 5TH Sem\AI-Job-Matcher\backend\app\main.py" (
    set "PROJECT_DIR=C:\Users\Hit\Desktop\SGP 5TH Sem\AI-Job-Matcher\"
)

if "%PROJECT_DIR%"=="" (
    echo [ERROR] Could not locate CareerSync AI directory!
    echo Please make sure the AI-Job-Matcher folder exists.
    echo.
    pause
    exit /b 1
)

:: Ensure trailing backslash is removed for clean path joining
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

echo [INFO] Project directory: %PROJECT_DIR%

:: Ensure storage uploads directories exist for file uploads
if not exist "%PROJECT_DIR%\career-sync-storage\uploads" (
    mkdir "%PROJECT_DIR%\career-sync-storage\uploads" >nul 2>nul
)
if not exist "%PROJECT_DIR%\..\career-sync-storage\uploads" (
    mkdir "%PROJECT_DIR%\..\career-sync-storage\uploads" >nul 2>nul
)

:: 2. Detect Python executables (prefer dedicated virtual environments)
set "BACKEND_PYTHON=python"
if exist "%PROJECT_DIR%\backend\.venv\Scripts\python.exe" (
    set "BACKEND_PYTHON=%PROJECT_DIR%\backend\.venv\Scripts\python.exe"
    echo [INFO] Backend Python    : Using virtual environment [backend\.venv]
) else (
    echo [INFO] Backend Python    : Using system Python
)

set "AI_PYTHON=python"
if exist "%PROJECT_DIR%\ai-services\.venv\Scripts\python.exe" (
    set "AI_PYTHON=%PROJECT_DIR%\ai-services\.venv\Scripts\python.exe"
    echo [INFO] AI Services Python: Using virtual environment [ai-services\.venv]
) else if exist "%PROJECT_DIR%\backend\.venv\Scripts\python.exe" (
    set "AI_PYTHON=%PROJECT_DIR%\backend\.venv\Scripts\python.exe"
    echo [INFO] AI Services Python: Sharing Backend Python environment
) else (
    echo [INFO] AI Services Python: Using system Python
)

if "%1"=="--test" (
    echo [TEST_OK] Project directory: !PROJECT_DIR!
    echo [TEST_OK] Backend Python   : !BACKEND_PYTHON!
    echo [TEST_OK] AI Python        : !AI_PYTHON!
    exit /b 0
)

:: 3. Check Node / npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm was not found on your system PATH!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo [INFO] Node.js / npm     : Detected
echo.

:: 4. Clean up any existing processes on ports 8000, 8001, and 3000
echo [INFO] Checking ports 8000, 8001, and 3000 for previous instances...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000,8001,3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8001" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>nul

:: 5. Launch AI Microservice (FastAPI Port 8001)
if exist "%PROJECT_DIR%\ai-services\src\api\app.py" (
    echo [INFO] Starting AI Services (Port 8001) ...
    start "CareerSync AI - AI Services (Port 8001)" /D "%PROJECT_DIR%\ai-services" cmd /k ""%AI_PYTHON%" -m uvicorn src.api.app:app --host 127.0.0.1 --port 8001"
)

:: 6. Launch Backend API (FastAPI Port 8000)
echo [INFO] Starting Backend API (Port 8000) ...
start "CareerSync AI - Backend API (Port 8000)" /D "%PROJECT_DIR%\backend" cmd /k ""%BACKEND_PYTHON%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

:: 7. Launch Frontend Web (Next.js Port 3000)
echo [INFO] Starting Frontend Web (Port 3000) ...
start "CareerSync AI - Frontend Web (Port 3000)" /D "%PROJECT_DIR%\frontend" cmd /k "npm run dev"

:: 8. Wait for servers to spin up with smart readiness check
echo.
echo [INFO] Initializing application services, please wait...
set "BACKEND_READY=0"
for /l %%i in (1,1,10) do (
    if "!BACKEND_READY!"=="0" (
        powershell -NoProfile -Command "(Invoke-WebRequest -Uri 'http://127.0.0.1:8000/docs' -UseBasicParsing -TimeoutSec 1).StatusCode" >nul 2>nul
        if !errorlevel! equ 0 (
            set "BACKEND_READY=1"
        ) else (
            ping -n 2 127.0.0.1 >nul
        )
    )
)

:: 9. Automatically open browser
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
echo Leave this window open while using CareerSync AI.
echo When you want to STOP all services, press any key below.
echo ======================================================================
pause >nul

echo.
echo [INFO] Shutting down CareerSync AI services...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000,8001,3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8001" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>nul

echo [INFO] All services stopped successfully.
ping -n 3 127.0.0.1 >nul
exit /b 0
