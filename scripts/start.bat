@echo off
REM Start script for Project Management MVP (Windows)
REM Usage: scripts\start.bat

setlocal enabledelayedexpansion

echo Checking for Docker installation...
where docker >nul 2>nul
if errorlevel 1 (
    echo Docker is not installed or not in PATH.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

where docker-compose >nul 2>nul
if errorlevel 1 (
    echo docker-compose is not installed or not in PATH.
    echo Please install Docker Desktop.
    pause
    exit /b 1
)

REM Get the project root directory
for %%I in ("%~dp0..") do set "PROJECT_ROOT=%%~fI"

echo.
echo Starting Project Management MVP...
echo Project root: %PROJECT_ROOT%
echo.

REM Check if .env file exists
if not exist "%PROJECT_ROOT%\.env" (
    echo .env file not found. Creating one...
    type nul > "%PROJECT_ROOT%\.env"
    echo Please add OPENROUTER_API_KEY to the .env file
)

REM Change to project root and start Docker Compose
cd /d "%PROJECT_ROOT%"

echo Starting Docker containers...
docker-compose up --build

echo.
echo Application is running!
echo   Frontend: http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the application
pause
