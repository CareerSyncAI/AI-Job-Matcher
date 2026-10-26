@echo off
setlocal
title CareerSync AI - Backend API (Port 8000)

:: Resolve project root directory
set "LAUNCHER_DIR=%~dp0"
pushd "%LAUNCHER_DIR%..\..\backend"

echo ======================================================================
echo             CareerSync AI - Backend API Server (Port 8000)
echo ======================================================================
echo [INFO] Working Directory: %CD%

:: Activate virtual environment if present
if exist ".venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment [.venv]...
    call .venv\Scripts\activate.bat
) else (
    echo [WARNING] No .venv found in backend, using active Python environment.
)

:: Verify python and uvicorn
python --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python executable not found!
    echo Please install Python 3.11+ and set up backend\.venv
    echo.
    pause
    exit /b 1
)

echo [INFO] Starting FastAPI Uvicorn server on http://127.0.0.1:8000 ...
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Backend API exited with error code %errorlevel%!
    echo.
    pause
)
popd
echo [INFO] Backend service stopped. Press any key to close this window.
pause
