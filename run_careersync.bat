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
echo.

:: 2. Detect Python executable (prefer venv if available)
set "PYTHON_EXE=python"
if exist "%PROJECT_DIR%\backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%PROJECT_DIR%\backend\.venv\Scripts\python.exe"
    echo [INFO] Python: Using virtual environment [venv]
) else (
    echo [INFO] Python: Using system Python
)

if "%1"=="--test" (
    echo [TEST_OK] Project directory: !PROJECT_DIR!
    echo [TEST_OK] Python executable: !PYTHON_EXE!
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
echo [INFO] Node.js / npm: Detected

:: 4. Clean up any existing processes on ports 8000 and 3000
echo [INFO] Checking ports 8000 and 3000 for previous instances...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)

:: 5. Launch Backend Server in its own window
echo [INFO] Starting Backend API (FastAPI) on http://127.0.0.1:8000 ...
start "CareerSync AI - Backend API (Port 8000)" cmd /k "cd /d "%PROJECT_DIR%\backend" && title CareerSync AI - Backend API && "%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

:: 6. Launch Frontend Server in its own window
echo [INFO] Starting Frontend Web (Next.js) on http://localhost:3000 ...
start "CareerSync AI - Frontend Web (Port 3000)" cmd /k "cd /d "%PROJECT_DIR%\frontend" && title CareerSync AI - Frontend Web && npm run dev"

:: 7. Wait for servers to spin up
echo.
echo [INFO] Initializing application services, please wait...
timeout /t 5 /nobreak >nul

:: 8. Automatically open browser
echo [INFO] Opening CareerSync AI in your default web browser...
start http://localhost:3000

echo.
echo ======================================================================
echo                  CareerSync AI is now LIVE!                          
echo ======================================================================
echo   Frontend Web  : http://localhost:3000
echo   Backend API   : http://127.0.0.1:8000
echo   API Docs      : http://127.0.0.1:8000/docs
echo ======================================================================
echo.
echo Leave this window open while using CareerSync AI.
echo.
echo When you want to STOP both servers, press any key below.
echo ======================================================================
pause >nul

echo.
echo [INFO] Shutting down CareerSync AI services...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)

echo [INFO] Services stopped successfully.
timeout /t 2 /nobreak >nul
exit /b 0
