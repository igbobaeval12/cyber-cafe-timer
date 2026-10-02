@echo off
REM Cyber Cafe Timer - Database Setup Script for Windows XAMPP

echo.
echo ========================================
echo Cyber Cafe Timer - Database Setup
echo ========================================
echo.

REM Check if MySQL is running, and try to start it automatically when XAMPP is installed
set "XAMPP_ROOT="
if exist "C:\xampp" set "XAMPP_ROOT=C:\xampp"
if not defined XAMPP_ROOT if exist "%ProgramFiles%\xampp" set "XAMPP_ROOT=%ProgramFiles%\xampp"
if not defined XAMPP_ROOT if exist "%ProgramFiles(x86)%\xampp" set "XAMPP_ROOT=%ProgramFiles(x86)%\xampp"

:CheckMySQL
echo Checking if MySQL is running...
tasklist | find /i "mysqld.exe" >nul
if not errorlevel 1 (
    echo MySQL is running. Proceeding with setup...
    echo.
    goto MySQLReady
)

echo MySQL not running. Attempting to start it automatically...

if defined XAMPP_ROOT if exist "%XAMPP_ROOT%\mysql\bin\mysqld.exe" (
    echo Starting MySQL from XAMPP installation...
    start "" "%XAMPP_ROOT%\mysql\bin\mysqld.exe"
    goto WaitForMySQL
)

sc query MySQL >nul 2>&1
if not errorlevel 1 (
    echo Starting MySQL Windows service...
    net start MySQL >nul 2>&1
    if not errorlevel 1 goto WaitForMySQL
)

if defined XAMPP_ROOT if exist "%XAMPP_ROOT%\xampp-control.exe" (
    echo Opening XAMPP Control Panel so MySQL can be started manually.
    start "" "%XAMPP_ROOT%\xampp-control.exe"
    goto WaitForMySQL
)

echo ERROR: MySQL is not running and could not be started automatically.
echo.
echo Please open XAMPP Control Panel and start MySQL manually.
echo Then rerun this script.
echo.
pause
exit /b 1

:WaitForMySQL
set /a "mysqlAttempts=0"
:WaitLoop
timeout /t 2 >nul
set /a mysqlAttempts+=1

tasklist | find /i "mysqld.exe" >nul
if not errorlevel 1 (
    echo MySQL is running. Proceeding with setup...
    echo.
    goto MySQLReady
)

if %mysqlAttempts% geq 30 (
    echo ERROR: MySQL did not start within 60 seconds.
    echo Please verify XAMPP is installed and MySQL is configured correctly.
    echo Then rerun this script.
    pause
    exit /b 1
)

goto WaitLoop

:MySQLReady

REM Navigate to MySQL bin directory
cd /d C:\xampp\mysql\bin

REM Create database
echo Creating database 'cyber_cafe_timer'...
mysql -u root -e "CREATE DATABASE IF NOT EXISTS cyber_cafe_timer;"
if errorlevel 1 (
    echo ERROR: Failed to create database
    pause
    exit /b 1
)

echo Database created successfully!
echo.

REM Return to project directory
cd /d %~dp0

REM Check if .env exists
if not exist ".env" (
    echo ERROR: .env file not found!
    echo.
    echo Please create .env file first. See QUICK_START_WINDOWS.md
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    pause
    exit /b 1
)

REM Check if pnpm is installed
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo Installing pnpm...
    npm install -g pnpm
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call pnpm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Generate migrations
echo.
echo Generating database migrations...
call pnpm drizzle-kit generate
if errorlevel 1 (
    echo ERROR: Failed to generate migrations
    pause
    exit /b 1
)

REM Apply migrations
echo.
echo Applying database migrations...
call pnpm drizzle-kit migrate
if errorlevel 1 (
    echo ERROR: Failed to apply migrations
    pause
    exit /b 1
)

echo.
echo ========================================
echo Database setup completed successfully!
echo ========================================
echo.
echo Your database is ready to use.
echo.
echo Next steps:
echo 1. Run: start_server.bat
echo 2. Open browser to http://localhost:3000/admin
echo 3. Configure pricing plans
echo 4. Start client machines
echo.
pause
