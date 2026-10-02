@echo off
REM Cyber Cafe Timer - Windows Client Startup Script
REM Copy this file to each remote client machine and update SERVER_IP below.
REM On the server machine, use http://localhost:3000/admin or /client instead.

REM ===== CONFIGURATION =====
REM Replace 192.168.1.100 with your actual server IP address
REM To find server IP: Open Command Prompt on server and type: ipconfig
set "SERVER_IP=192.168.1.100"
set "SERVER_PORT=3000"
set "CLIENT_URL=http://%SERVER_IP%:%SERVER_PORT%/client"
REM ===== END CONFIGURATION =====

echo.
echo ========================================
echo Cyber Cafe Timer - Client Startup
echo ========================================
echo.
echo Remote client URL: %CLIENT_URL%
echo Local server URL: http://localhost:3000
echo.

REM Check if Chrome is installed
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo Starting Chrome...
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "%CLIENT_URL%"
    goto success
)

REM Check if Chrome is installed (32-bit)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo Starting Chrome...
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" "%CLIENT_URL%"
    goto success
)

REM Check if Firefox is installed
if exist "C:\Program Files\Mozilla Firefox\firefox.exe" (
    echo Starting Firefox...
    start "" "C:\Program Files\Mozilla Firefox\firefox.exe" "%CLIENT_URL%"
    goto success
)

REM Check if Firefox is installed (32-bit)
if exist "C:\Program Files (x86)\Mozilla Firefox\firefox.exe" (
    echo Starting Firefox...
    start "" "C:\Program Files (x86)\Mozilla Firefox\firefox.exe" "%CLIENT_URL%"
    goto success
)

REM Check if Edge is installed
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    echo Starting Edge...
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" "%CLIENT_URL%"
    goto success
)

REM If no browser found, try default
echo Starting default browser...
start "" "%CLIENT_URL%"
goto success

:success
echo.
echo ========================================
echo Client started successfully!
echo ========================================
echo.
echo You should see the Cyber Cafe Timer client interface.
echo If not, check:
echo 1. Server IP is correct (%SERVER_IP%)
echo 2. Server is running on port %SERVER_PORT%
echo 3. Both machines are on the same network
echo.
echo To test connection, open Command Prompt and type:
echo   ping %SERVER_IP%
echo.
timeout /t 5
exit /b 0

:error
echo.
echo ERROR: Could not find any web browser!
echo.
echo Please install one of:
echo - Google Chrome (https://www.google.com/chrome/)
echo - Mozilla Firefox (https://www.mozilla.org/firefox/)
echo - Microsoft Edge (built-in on Windows)
echo.
pause
exit /b 1
