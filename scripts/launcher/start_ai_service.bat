@echo off
setlocal
title CareerSync AI - AI Microservice (Port 8001)

:: Resolve project root directory
set "LAUNCHER_DIR=%~dp0"
pushd "%LAUNCHER_DIR%..\..\ai-services"

echo ======================================================================
echo           CareerSync AI - AI Microservice Server (Port 8001)
echo ======================================================================
echo [INFO] Working Directory: %CD%

:: Activate virtual environment if present
if exist ".venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment [.venv]...
    call .venv\Scripts\activate.bat
) else if exist "..\backend\.venv\Scripts\activate.bat" (
    echo [INFO] Using backend virtual environment [.venv]...
    call ..\backend\.venv\Scripts\activate.bat
) else (
    echo [WARNING] No .venv found, using active Python environment.
)

:: Verify python and uvicorn
python --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python executable not found!
    echo Please install Python 3.11+ and set up ai-services\.venv
    echo.
    pause
    exit /b 1
)

echo [INFO] Starting AI FastAPI server on http://127.0.0.1:8001 ...
python -m uvicorn src.api.app:app --host 127.0.0.1 --port 8001

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] AI Microservice exited with error code %errorlevel%!
    echo.
    pause
)
popd
echo [INFO] AI Microservice stopped. Press any key to close this window.
pause
