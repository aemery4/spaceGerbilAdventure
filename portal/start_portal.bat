@echo off
title Space Gerbil Game Creator Portal

echo.
echo  ====================================
echo    Space Gerbil Game Creator Portal
echo  ====================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

REM Check if Flask is installed
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo Flask not found. Installing dependencies...
    pip install flask flask-cors
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo Starting the portal server...
echo.
echo The portal will open in your browser shortly.
echo.

REM Start the server in background and open browser
start "" http://localhost:5050/portal

REM Run the server (this will block)
cd /d "%~dp0"
python portal_server.py

pause
