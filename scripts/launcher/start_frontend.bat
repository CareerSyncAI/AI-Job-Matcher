@echo off
setlocal
title CareerSync AI - Frontend Web App (Port 3000)

:: Resolve project root directory
set "LAUNCHER_DIR=%~dp0"
pushd "%LAUNCHER_DIR%..\..\frontend"

echo ======================================================================
echo            CareerSync AI - Next.js Frontend Server (Port 3000)
echo ======================================================================
echo [INFO] Working Directory: %CD%

:: Verify npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm was not found on your system PATH!
    echo Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Check node_modules
if not exist "node_modules\" (
    echo [INFO] Installing frontend dependencies - npm install...
    call npm install
)

echo [INFO] Starting Next.js development server on http://localhost:3000 ...
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Frontend server exited with error code %errorlevel%!
    echo.
    pause
)
popd
echo [INFO] Frontend server stopped. Press any key to close this window.
pause
