@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0..\"
set "BACKEND=%ROOT%backend"
set "VENV_PY=%BACKEND%\venv\Scripts\python.exe"
set "DOCKER_COMPOSE=%ROOT%docker-compose.yml"

echo ========================================
echo  KhataBox — Dev Environment Launcher
echo ========================================
echo.

REM ========================================
REM Step 1: Check Docker Services
REM ========================================
echo [1/6] Checking Docker services...
docker compose -f "%DOCKER_COMPOSE%" ps --format json 2>nul >nul
if errorlevel 1 (
    echo ERROR: Docker Compose failed. Is Docker running?
    pause
    exit /b 1
)

REM Start containers if not running
docker compose -f "%DOCKER_COMPOSE%" ps -q postgres 2>nul | findstr . >nul
if errorlevel 1 (
    echo Starting PostgreSQL and Redis...
    docker compose -f "%DOCKER_COMPOSE%" up -d
    if errorlevel 1 (
        echo ERROR: Failed to start Docker services.
        pause
        exit /b 1
    )
)

REM ========================================
REM Step 2: Health Checks
REM ========================================
echo.
echo [2/6] Running health checks...

REM Check PostgreSQL
set "DB_STATUS=STOPPED"
docker compose -f "%DOCKER_COMPOSE%" exec -T postgres pg_isready -U khatabox -d khatabox >nul 2>&1
if not errorlevel 1 (
    set "DB_STATUS=RUNNING"
)
echo   PostgreSQL: %DB_STATUS%

REM Check Redis
set "REDIS_STATUS=STOPPED"
docker compose -f "%DOCKER_COMPOSE%" exec -T redis redis-cli ping >nul 2>&1
if not errorlevel 1 (
    set "REDIS_STATUS=RUNNING"
)
echo   Redis:    %REDIS_STATUS%

REM Check Backend API
set "API_STATUS=STOPPED"
curl -s -o nul -w "%%{http_code}" http://localhost:8002/docs 2>nul | findstr "200" >nul
if not errorlevel 1 (
    set "API_STATUS=RUNNING"
)
echo   Backend:  %API_STATUS%

REM Check Frontend (check if npm is running)
set "FRONTEND_STATUS=STOPPED"
for /f "tokens=5 delims= " %%a in ('netstat -ano ^| findstr ":3000"') do set "FRONTEND_STATUS=RUNNING"
echo   Frontend: %FRONTEND_STATUS%

if "%DB_STATUS%"=="STOPPED" (
    echo.
    echo ERROR: PostgreSQL not ready. Please check Docker.
    pause
    exit /b 1
)

if "%REDIS_STATUS%"=="STOPPED" (
    echo.
    echo ERROR: Redis not ready. Please check Docker.
    pause
    exit /b 1
)

REM ========================================
REM Step 3: Wait for PostgreSQL
REM ========================================
echo.
echo [3/6] Waiting for PostgreSQL to be ready...
:wait_db
docker compose -f "%DOCKER_COMPOSE%" exec -T postgres pg_isready -U khatabox -d khatabox >nul 2>&1
if errorlevel 1 (
    timeout /t 3 /nobreak >nul
    goto wait_db
)
echo PostgreSQL is ready.

REM ========================================
REM Step 4: Check Migrations
REM ========================================
echo.
echo [4/6] Checking migrations...

REM Check if migrations table exists and has data
set "MIGRATION_STATUS=NEEDS_UPDATE"
docker compose -f "%DOCKER_COMPOSE%" exec -T postgres psql -U khatabox -d khatabox -t -c "SELECT COUNT(*) FROM alembic_version;" 2>nul | findstr "0" >nul
if not errorlevel 1 (
    goto skip_migration
)

REM Run pending migrations (idempotent)
pushd "%BACKEND%"
echo Running pending migrations...
"%VENV_PY%" -m alembic upgrade head
if errorlevel 1 (
    echo WARNING: Migration may have partially failed.
) else (
    echo Migrations up-to-date.
)
popd
goto migration_done

:skip_migration
echo Migrations already up-to-date (no tables found or fresh database).

:migration_done

REM ========================================
REM Step 5: Check Demo Data
REM ========================================
echo.
echo [5/6] Checking demo data...

REM Check if users already exist
docker compose -f "%DOCKER_COMPOSE%" exec -T postgres psql -U khatabox -d khatabox -t -c "SELECT COUNT(*) FROM users;" 2>nul | findstr "0" >nul
if not errorlevel 1 (
    echo No demo data found. Running seed script...
    pushd "%BACKEND%"
    "%VENV_PY%" seed_india.py
    if errorlevel 1 (
        echo WARNING: Seeding may have partially failed.
    )
    popd
) else (
    echo Demo data already exists. Skipping seed.
)

REM ========================================
REM Step 6: Start Application Servers
REM ========================================
echo.
echo [6/6] Starting application servers...

REM Start backend if not running
if "%API_STATUS%"=="STOPPED" (
    start "KhataBox Backend" cmd /c "cd /d "%BACKEND%" && "%VENV_PY%" -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload --log-level info"
)

REM Always restart frontend to pick up latest changes
if "%FRONTEND_STATUS%"=="RUNNING" (
    echo Restarting frontend to apply latest changes...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)
REM Use --webpack flag to avoid path-encoding bug with spaces in project path
start "KhataBox Frontend" cmd /c "cd /d "%ROOT%frontend" && npm run dev -- --webpack"

REM Wait for backend to be ready
echo Waiting for backend API...
:wait_backend
curl -s -o nul -w "%%{http_code}" http://localhost:8002/docs 2>nul | findstr "200" >nul
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_backend
)
echo Backend API is ready.

REM Open browser to landing page
start http://localhost:3000/khatabox

REM ========================================
REM Final Status Display
REM ========================================
echo.
echo ========================================
echo  All services started!
echo.
echo  URLs:
echo  -------
echo  Landing:  http://localhost:3000/khatabox
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:8002
echo  API Docs: http://localhost:8002/docs
echo.
echo  Services:
echo  -------
echo  Frontend: %FRONTEND_STATUS%
echo  Backend:  %API_STATUS%
echo  Database: %DB_STATUS%
echo  Redis:    %REDIS_STATUS%
echo.
echo  Close the server windows to stop.
echo ========================================

endlocal