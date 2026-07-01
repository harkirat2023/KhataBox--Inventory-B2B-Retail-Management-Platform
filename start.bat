@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "VENV_PY=%BACKEND%\venv\Scripts\python.exe"
set "VENV_PIP=%BACKEND%\venv\Scripts\pip.exe"
set "DOCKER_COMPOSE=%ROOT%docker-compose.yml"

echo.
echo ========================================
echo  KhataBox - Full Stack Launcher
echo ========================================
echo.

REM ========================================
REM Step 1: Docker Services
REM ========================================
echo [1/7] Starting Docker services...

docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Start Docker Desktop first.
    pause
    exit /b 1
)

docker compose -f "%DOCKER_COMPOSE%" ps -q postgres 2>nul | findstr . >nul
if errorlevel 1 (
    docker compose -f "%DOCKER_COMPOSE%" up -d
    if errorlevel 1 (
        echo ERROR: Failed to start Docker services.
        pause
        exit /b 1
    )
    echo   Services started.
) else (
    echo   Services already running.
)

REM ========================================
REM Step 2: Wait for PostgreSQL
REM ========================================
echo.
echo [2/7] Waiting for PostgreSQL...
:wait_db
docker compose -f "%DOCKER_COMPOSE%" exec -T postgres pg_isready -U khatabox -d khatabox >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_db
)
echo   PostgreSQL ready.

REM ========================================
REM Step 3: Wait for Redis
REM ========================================
echo.
echo [3/7] Waiting for Redis...
:wait_redis
docker compose -f "%DOCKER_COMPOSE%" exec -T redis redis-cli ping >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_redis
)
echo   Redis ready.

REM ========================================
REM Step 4: Backend Setup
REM ========================================
echo.
echo [4/7] Setting up backend...

if not exist "%BACKEND%\venv" (
    echo   Creating Python virtual environment...
    python -m venv "%BACKEND%\venv"
    if errorlevel 1 (
        echo ERROR: Failed to create Python venv. Is Python installed?
        pause
        exit /b 1
    )
)

REM Install dependencies if requirements changed
"%VENV_PY%" -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo   Installing backend dependencies...
    "%VENV_PIP%" install -q -r "%BACKEND%\requirements.txt"
)

echo   Backend setup done.

REM ========================================
REM Step 5: Run Migrations
REM ========================================
echo.
echo [5/7] Running migrations...

pushd "%BACKEND%"
set "TABLE_EXISTS=0"
docker compose -f "%DOCKER_COMPOSE%" exec -T postgres psql -U khatabox -d khatabox -t -c "SELECT to_regclass('public.alembic_version');" 2>nul | findstr "alembic_version" >nul
if not errorlevel 1 set "TABLE_EXISTS=1"

if "%TABLE_EXISTS%"=="1" (
    "%VENV_PY%" -m alembic current >nul 2>&1
    if errorlevel 1 (
        "%VENV_PY%" -m alembic upgrade head
    ) else (
        echo   Migrations up-to-date.
    )
) else (
    echo   Running initial migrations...
    "%VENV_PY%" -m alembic upgrade head
)
popd

REM ========================================
REM Step 6: Seed Demo Data
REM ========================================
echo.
echo [6/7] Checking demo data...

set "HAS_USERS=0"
docker compose -f "%DOCKER_COMPOSE%" exec -T postgres psql -U khatabox -d khatabox -t -c "SELECT COUNT(*) FROM users;" 2>nul | findstr /r "[1-9]" >nul
if not errorlevel 1 set "HAS_USERS=1"

if "%HAS_USERS%"=="0" (
    echo   Seeding demo data...
    pushd "%BACKEND%"
    "%VENV_PY%" seed_india.py
    popd
) else (
    echo   Demo data exists. Skipping.
)

REM ========================================
REM Step 7: Start Servers
REM ========================================
echo.
echo [7/7] Starting servers...

REM Backend
set "API_STATUS=STOPPED"
curl -s -o nul -w "%%{http_code}" http://localhost:8002/docs 2>nul | findstr "200" >nul
if not errorlevel 1 set "API_STATUS=RUNNING"

if "%API_STATUS%"=="STOPPED" (
    start "KhataBox Backend" cmd /k "cd /d "%BACKEND%" && "%VENV_PY%" -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload --log-level info"
    echo   Backend starting on http://localhost:8002
)

REM Frontend
set "FRONTEND_STATUS=STOPPED"
for /f "tokens=5 delims= " %%a in ('netstat -ano 2^>nul ^| findstr ":3000"') do set "FRONTEND_STATUS=RUNNING"

if "%FRONTEND_STATUS%"=="STOPPED" (
    if not exist "%FRONTEND%\node_modules" (
        echo   Installing frontend dependencies...
        pushd "%FRONTEND%"
        call npm install
        popd
    )
    start "KhataBox Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"
    echo   Frontend starting on http://localhost:3000
)

REM ========================================
REM Wait for backend
REM ========================================
echo.
echo Waiting for backend API...
:wait_api
curl -s -o nul -w "%%{http_code}" http://localhost:8002/docs 2>nul | findstr "200" >nul
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_api
)

REM ========================================
REM Done
REM ========================================
echo.
echo ========================================
echo  KhataBox is running!
echo.
echo  Frontend:  http://localhost:3000
echo  Backend:   http://localhost:8002
echo  API Docs:  http://localhost:8002/docs
echo  Postgres:  localhost:5432
echo  Redis:     localhost:6379
echo.
echo  Close this window or press Ctrl+C to stop.
echo ========================================
echo.

endlocal
