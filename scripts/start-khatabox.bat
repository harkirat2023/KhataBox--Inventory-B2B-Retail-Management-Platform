@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0..\"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "VENV_PY=%BACKEND%\venv\Scripts\python.exe"
set "DOCKER_COMPOSE=%ROOT%docker-compose.yml"
set "CHECK_SCRIPT=%BACKEND%\_check_seed.py"
set "TMP_RESULT=%TEMP%\khatabox_seed_result.txt"

echo ========================================
echo  KhataBox - Dev Environment Launcher
echo ========================================
echo.

REM ========================================
REM Step 1: Check Docker
REM ========================================
echo [1/6] Checking Docker...
docker compose -f "%DOCKER_COMPOSE%" ps --format json 2>nul >nul
if errorlevel 1 (
    echo ERROR: Docker Compose failed. Is Docker running?
    pause
    exit /b 1
)

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

echo Docker services running.

REM ========================================
REM Step 2: Detect DB type + health
REM ========================================
echo.
echo [2/6] Checking services...

set "REDIS_STATUS=STOPPED"
docker compose -f "%DOCKER_COMPOSE%" exec -T redis redis-cli ping >nul 2>&1
if not errorlevel 1 set "REDIS_STATUS=RUNNING"
echo   Redis: !REDIS_STATUS!

if "!REDIS_STATUS!"=="STOPPED" (
    echo ERROR: Redis not ready.
    pause
    exit /b 1
)

set "DB_IS_LOCAL=false"
if exist "%BACKEND%\.env" (
    findstr /i "localhost" "%BACKEND%\.env" 2>nul | findstr "5432" >nul
    if not errorlevel 1 set "DB_IS_LOCAL=true"
)

set "DB_STATUS=REMOTE"
if "!DB_IS_LOCAL!"=="true" goto check_local_db
echo   Database: remote (Neon / external).
goto after_db_check

:check_local_db
docker compose -f "%DOCKER_COMPOSE%" exec -T postgres pg_isready -U khatabox -d khatabox >nul 2>&1
if errorlevel 1 (
    timeout /t 3 /nobreak >nul
    goto check_local_db
)
set "DB_STATUS=LOCAL_RUNNING"
echo   Database: local Docker ready.

:after_db_check

REM ========================================
REM Step 3: Run migrations
REM ========================================
echo.
echo [3/6] Applying migrations...
pushd "%BACKEND%"
"%VENV_PY%" -m alembic upgrade head
if errorlevel 1 (
    echo WARNING: Migration issues - check DB connectivity.
) else (
    echo Migrations up-to-date.
)
popd

REM ========================================
REM Step 4: Check + seed demo data
REM ========================================
echo.
echo [4/6] Seeding demo data...

REM Run pre-written check script (avoids cmd.exe multi-line / escaping issues)
pushd "%BACKEND%"
"%VENV_PY%" "%CHECK_SCRIPT%" > "%TMP_RESULT%" 2>&1
popd

set "USER_COUNT=0"
set "SP_COUNT=0"
for /f "usebackq delims=" %%x in ("%TMP_RESULT%") do (
    echo %%x | findstr /b "USERS=" >nul
    if not errorlevel 1 for /f "tokens=2 delims==" %%a in ("%%x") do set "USER_COUNT=%%a"
    echo %%x | findstr /b "SEED_PRODS=" >nul
    if not errorlevel 1 for /f "tokens=2 delims==" %%a in ("%%x") do set "SP_COUNT=%%a"
)

if "!USER_COUNT!"=="0" goto seed_all
if "!SP_COUNT!"=="0" goto seed_products
echo Demo data exists (!USER_COUNT! users, !SP_COUNT! seed products).
goto after_seed

:seed_all
echo No demo data found (!USER_COUNT! users). Running seed...
pushd "%BACKEND%"
"%VENV_PY%" seed_india.py
popd
goto after_seed

:seed_products
echo Seed products table empty. Running seed to populate...
pushd "%BACKEND%"
"%VENV_PY%" seed_india.py
popd

:after_seed

del "%TMP_RESULT%" 2>nul

REM ========================================
REM Step 5: Start servers
REM ========================================
echo.
echo [5/6] Starting servers...

set "API_STATUS=STOPPED"
curl -s -o nul -w "%%{http_code}" http://localhost:8002/docs 2>nul | findstr "200" >nul
if not errorlevel 1 set "API_STATUS=RUNNING"

if "!API_STATUS!"=="STOPPED" (
    start "KhataBox Backend" cmd /c "cd /d "%BACKEND%" && "%VENV_PY%" -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload --log-level info"
)

set "FRONTEND_STATUS=STOPPED"
for /f "tokens=5 delims= " %%a in ('netstat -ano ^| findstr ":3000"') do set "FRONTEND_STATUS=RUNNING"
if "!FRONTEND_STATUS!"=="RUNNING" (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)
start "KhataBox Frontend" cmd /c "cd /d "%FRONTEND%" && npm run dev -- --webpack"

REM Wait for backend
echo [6/6] Waiting for backend API...
:wait_backend
curl -s -o nul -w "%%{http_code}" http://localhost:8002/docs 2>nul | findstr "200" >nul
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_backend
)
echo Backend API ready.

start http://localhost:3000/khatabox

echo.
echo ========================================
echo  KhataBox Ready
echo.
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:8002
echo  API Docs: http://localhost:8002/docs
echo.
echo  Credentials:
echo    Admin:      admin@khatabox.com / Admin@123
echo    Shopkeeper: {store}@khatabox.com / Shop@123
echo    Customer:   contact.{...}@client.com / customer123
echo.
echo  Close the server windows to stop.
echo ========================================

endlocal
