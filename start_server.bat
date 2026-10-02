@echo off
setlocal EnableExtensions
REM Cyber Cafe Timer - Windows Server Startup Script

set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

cd /d "%PROJECT_ROOT%"
if errorlevel 1 (
    echo ERROR: Could not change to the project directory.
    echo Project directory: %PROJECT_ROOT%
    pause
    exit /b 1
)

echo.
echo ========================================
echo    CYBER CAFE - STARTING SERVER
echo ========================================
echo Project directory: %PROJECT_ROOT%
echo Server URL: http://localhost:3000
echo ========================================
echo.

REM Check if Node.js is installed
echo Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/.
    pause
    exit /b 1
)

REM Check if pnpm is installed
echo Checking pnpm...
where pnpm
if errorlevel 1 (
    echo ERROR: pnpm is not installed or not in PATH.
    echo Install it with: npm install -g pnpm
    pause
    exit /b 1
)
call pnpm --version
if errorlevel 1 (
    echo ERROR: pnpm could not be executed.
    pause
    exit /b 1
)

REM Verify environment configuration before database setup.
if not exist ".env" (
    echo ERROR: .env file not found in %PROJECT_ROOT%.
    echo Create .env using QUICK_START_WINDOWS.md before starting the server.
    pause
    exit /b 1
)
echo Environment file found: %PROJECT_ROOT%\.env

REM Check if MySQL is running, and try to start an installed MySQL/XAMPP binary.
:CheckMySQL
echo Checking MySQL status...
tasklist | find /i "mysqld.exe"
if not errorlevel 1 (
    echo MySQL is running.
    echo.
    goto MySQLReady
)

echo MySQL not running. Attempting to start it automatically...

set "MYSQLD_EXE="
for /f "delims=" %%I in ('where mysqld.exe') do if not defined MYSQLD_EXE if exist "%%I" set "MYSQLD_EXE=%%I"
if not defined MYSQLD_EXE if exist "C:\xampp\mysql\bin\mysqld.exe" set "MYSQLD_EXE=C:\xampp\mysql\bin\mysqld.exe"
if not defined MYSQLD_EXE if exist "%ProgramFiles%\xampp\mysql\bin\mysqld.exe" set "MYSQLD_EXE=%ProgramFiles%\xampp\mysql\bin\mysqld.exe"
if not defined MYSQLD_EXE if exist "%ProgramFiles(x86)%\xampp\mysql\bin\mysqld.exe" set "MYSQLD_EXE=%ProgramFiles(x86)%\xampp\mysql\bin\mysqld.exe"

if defined MYSQLD_EXE (
    echo Starting MySQL: %MYSQLD_EXE%
    start "Cyber Cafe MySQL" "%MYSQLD_EXE%"
    goto WaitForMySQL
)

echo No mysqld.exe was found in PATH or the standard XAMPP locations.
echo Start MySQL/XAMPP manually, then run this script again.
pause
exit /b 1

:WaitForMySQL
set /a "mysqlAttempts=0"
:WaitLoop
timeout /t 2 /nobreak
set /a mysqlAttempts+=1

tasklist | find /i "mysqld.exe"
if not errorlevel 1 (
    echo MySQL is running.
    echo.
    goto MySQLReady
)

if %mysqlAttempts% geq 30 (
    echo ERROR: MySQL did not start within 60 seconds.
    echo Verify the MySQL/XAMPP error output, then run this script again.
    echo Then rerun this script.
    pause
    exit /b 1
)

goto WaitLoop

:MySQLReady

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call pnpm install --frozen-lockfile
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed.
)

REM Reuse an already-running application instead of starting a duplicate server.
echo Checking for an existing Cyber Cafe server...
curl.exe --fail http://localhost:3000/health
if not errorlevel 1 (
    echo An existing Cyber Cafe server is already running on port 3000.
    start "" "http://localhost:3000/admin"
    pause
    exit /b 0
)

REM Refuse to start on another port because the application is configured for 3000.
echo Checking port 3000...
netstat -ano | findstr /R /C:":3000 .*LISTENING"
if not errorlevel 1 (
    echo ERROR: Port 3000 is already occupied.
    echo Stop the process shown above, then run this script again.
    pause
    exit /b 1
)

REM Apply migrations with the project's existing Drizzle tooling.
echo Applying database migrations...
call pnpm exec drizzle-kit migrate
if errorlevel 1 (
    echo ERROR: Database migrations failed.
    pause
    exit /b 1
)

REM Start the existing Express/Vite development server in a persistent window.
echo Starting pnpm dev...
start "Cyber Cafe Server" cmd /k "cd /d "%PROJECT_ROOT%" && call pnpm dev"

echo Waiting for the server health endpoint...
set /a "serverAttempts=0"
:WaitForServer
timeout /t 1 /nobreak
set /a serverAttempts+=1
curl.exe --fail http://localhost:3000/health
if not errorlevel 1 goto ServerReady
if %serverAttempts% geq 30 (
    echo ERROR: The server did not respond on http://localhost:3000/health.
    echo Check the Cyber Cafe Server window for the startup error.
    pause
    exit /b 1
)
goto WaitForServer

:ServerReady
echo.
echo ========================================
echo    CYBER CAFE SERVER IS RUNNING
echo ========================================
echo Admin Dashboard: http://localhost:3000/admin
echo Client Interface: http://localhost:3000/client
echo ========================================
echo.

start "" "http://localhost:3000/admin"

echo The server is running in the Cyber Cafe Server window.
echo Close that window or press Ctrl+C there to stop the server.
pause
