@echo off
REM Stop script for Project Management MVP (Windows)
REM Usage: scripts\stop.bat

setlocal enabledelayedexpansion

REM Get the project root directory
for %%I in ("%~dp0..") do set "PROJECT_ROOT=%%~fI"

echo.
echo Stopping Project Management MVP...
echo.

REM Change to project root and stop Docker Compose
cd /d "%PROJECT_ROOT%"

echo Stopping Docker containers...
docker-compose down

echo.
echo Application stopped successfully!
echo.
pause
