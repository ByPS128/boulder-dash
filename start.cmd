@echo off
REM Boulder Dash - Quick Start Script (TypeScript + Vite version)

echo =====================================
echo   Boulder Dash - Starting...
echo =====================================
echo.

REM Zjisti adresář scriptu
cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ========================================
    echo   ERROR: Node.js is not installed!
    echo ========================================
    echo.
    echo Please install Node.js from:
    echo   https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo [1/3] Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
)

REM Start development server
echo [2/3] Starting development server...
echo Server will open at: http://localhost:8000
echo.
echo [3/3] Opening browser...
echo.
echo ==================================
echo   Game is running!
echo   Press Ctrl+C to stop server
echo ==================================
echo.

call npm run dev

pause
