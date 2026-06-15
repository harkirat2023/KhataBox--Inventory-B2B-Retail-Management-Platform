@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "VENV_PY=%BACKEND%\venv\Scripts\python.exe"

echo ========================================
echo  KhataBox — Dev Environment Launcher
echo ========================================

echo.
echo [1/5] Starting PostgreSQL and Redis...
docker compose -f "%ROOT%docker-compose.yml" up -d
if errorlevel 1 (
    echo ERROR: Docker Compose failed. Is Docker running?
    pause
    exit /b 1
)

echo.
echo [2/5] Waiting for PostgreSQL to be ready...
:wait_db
docker compose -f "%ROOT%docker-compose.yml" exec -T postgres pg_isready -U khatabox -d khatabox >nul 2>&1
if errorlevel 1 (
    timeout /t 3 /nobreak >nul
    goto wait_db
)
echo PostgreSQL is ready.

echo.
echo [3/5] Running database migrations...
pushd "%BACKEND%"
"%VENV_PY%" -m alembic upgrade head
if errorlevel 1 (
    echo WARNING: Migration may have partially failed. Check output above.
)
popd

echo.
echo [4/5] Seeding database with sample data...
pushd "%BACKEND%"
"%VENV_PY%" seed_india.py
if errorlevel 1 (
    echo WARNING: Seeding may have partially failed. Check output above.
)
popd

echo.
echo [5/5] Starting application servers...
start "KhataBox Backend" cmd /c "%VENV_PY%" -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload --log-level info
start "KhataBox Frontend" cmd /c "cd /d "%ROOT%" && npm run dev"

echo.
echo ========================================
echo  All services started!
echo.
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:8002
echo  API Docs: http://localhost:8002/docs
echo  Database: postgresql://khatabox:khatabox123@localhost:5432/khatabox
echo  Redis:    redis://localhost:6379
echo.
echo  Close the server windows to stop.
echo ========================================

endlocal
