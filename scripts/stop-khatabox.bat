@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0..\"
set "DOCKER_COMPOSE=%ROOT%docker-compose.yml"

echo ========================================
echo  KhataBox — Stop Services
echo ========================================
echo.

REM Stop frontend (Node.js process)
echo [1/4] Stopping Frontend...
for /f "tokens=5 delims= " %%a in ('netstat -ano ^| findstr ":3000"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo   Frontend stopped.

REM Stop backend (Python/uvicorn process)
echo [2/4] Stopping Backend...
for /f "tokens=5 delims= " %%a in ('netstat -ano ^| findstr ":8002"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo   Backend stopped.

REM Stop Docker services (but keep data)
echo [3/4] Stopping Docker services...
docker compose -f "%DOCKER_COMPOSE%" stop 2>nul
echo   Docker services stopped.

REM Kill any remaining node/npm processes for frontend
echo [4/4] Cleaning up processes...
taskkill /f /im node.exe 2>nul >nul
taskkill /f /im python.exe 2>nul >nul
echo   Cleanup complete.

echo.
echo ========================================
echo  All services stopped.
echo   - Frontend: stopped
echo   - Backend: stopped
echo   - Docker: stopped (data preserved)
echo.
echo  To start again, run scripts\start-khatabox.bat
echo ========================================

endlocal