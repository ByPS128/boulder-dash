@echo off
REM Boulder Dash - Quick Start Script

echo ==================================
echo   Boulder Dash - Starting...
echo ==================================
echo.

REM Zjisti adresář scriptu
cd /d "%~dp0"

REM Kontrola Pythonu - zkus různé varianty
set PYTHON_CMD=

REM Zkus py launcher (standardní na Windows)
py --version >NUL 2>&1
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=py
    goto :start_server
)

REM Zkus python3
python3 --version >NUL 2>&1
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=python3
    goto :start_server
)

REM Zkus python (ale ověř že to není jen Windows Store alias)
python --version >NUL 2>&1
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=python
    goto :start_server
)

REM Python nenalezen
echo.
echo ========================================
echo   ERROR: Python not found!
echo ========================================
echo.
echo Please install Python from:
echo   https://www.python.org/downloads/
echo.
echo Make sure to check "Add Python to PATH"
echo during installation!
echo.
pause
exit /b 1

:start_server
echo [1/3] Starting HTTP server on port 8000...

REM Spuštění serveru na pozadí
start /B %PYTHON_CMD% simple-cors-http-server.py

REM Počkej 2 sekundy než server nastartuje
timeout /t 2 /nobreak >NUL 2>&1

echo [2/3] Opening browser...

REM Otevři prohlížeč
start http://localhost:8000/BoulderDash.html

echo [3/3] Game started!
echo.
echo ==================================
echo   Game is running!
echo   URL: http://localhost:8000/BoulderDash.html
echo   Press Ctrl+C to stop server
echo ==================================
echo.

REM Drž okno otevřené (server běží na pozadí)
pause
