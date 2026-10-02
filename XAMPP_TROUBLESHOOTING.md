# Cyber Café Timer - Windows XAMPP Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: MySQL Won't Start in XAMPP

**Symptoms:**
- MySQL button shows red indicator
- Error message in XAMPP Control Panel
- Can't connect to database

**Solutions:**

**Solution A: Simple Restart**
1. Open XAMPP Control Panel
2. Click "Stop" next to MySQL
3. Wait 5 seconds
4. Click "Start"
5. Wait for green indicator

**Solution B: Reset MySQL**
1. Stop MySQL in XAMPP
2. Delete MySQL data folder:
   - Navigate to: `C:\xampp\data`
   - Delete the `mysql` folder
3. Start MySQL again (will recreate default database)

**Solution C: Check Port Conflict**
1. Open Command Prompt
2. Type: `netstat -ano | findstr :3306`
3. If something is using port 3306, kill it:
   ```cmd
   taskkill /PID <PID> /F
   ```
   Replace `<PID>` with the process ID shown

**Solution D: Check MySQL Error Log**
1. Navigate to: `C:\xampp\mysql\data`
2. Open file: `mysql_error.log`
3. Look for error messages
4. Search online for the specific error

---

### Issue 2: "Port 3000 Already in Use"

**Symptoms:**
- Error when starting server: `EADDRINUSE: address already in use :::3000`
- Server won't start

**Solutions:**

**Solution A: Kill Process Using Port 3000**
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Solution B: Use Different Port**
1. Edit `.env` file
2. Change: `PORT=3000` to `PORT=3001`
3. Save and restart server
4. Access at: `http://localhost:3001/admin`

**Solution C: Check What's Using the Port**
```cmd
netstat -ano | findstr :3000
```
Look at the process name and close the application.

---

### Issue 3: Client Can't Connect to Server

**Symptoms:**
- Client browser shows "Cannot reach server"
- Page won't load
- Timeout error

**Checklist:**

1. **Verify Server is Running**
   - Check Command Prompt shows "Server running on http://localhost:3000/"
   - If not, restart server

2. **Verify MySQL is Running**
   - Check XAMPP Control Panel
   - MySQL should show green indicator

3. **Find Correct Server IP**
   ```cmd
   ipconfig
   ```
   Look for IPv4 Address (e.g., `192.168.1.100`)

4. **Verify Client URL**
   - Should be: `http://192.168.1.100:3000/client`
   - NOT: `http://localhost:3000/client`
   - NOT: `http://127.0.0.1:3000/client`

5. **Test Network Connectivity**
   From client machine, open Command Prompt:
   ```cmd
   ping 192.168.1.100
   ```
   Should see successful responses.

6. **Check Firewall**
   - Windows Defender Firewall might block connection
   - See "Firewall Configuration" section below

7. **Check Network**
   - Both machines must be on same WiFi or network
   - Check router settings
   - Try wired connection if WiFi unreliable

---

### Issue 4: "Cannot Connect to Database"

**Symptoms:**
- Error: `connect ECONNREFUSED 127.0.0.1:3306`
- Database connection failed
- Server won't start

**Solutions:**

**Solution A: Start MySQL**
1. Open XAMPP Control Panel
2. Click "Start" next to MySQL
3. Wait for green indicator

**Solution B: Verify Database Exists**
```cmd
cd C:\xampp\mysql\bin
mysql -u root
SHOW DATABASES;
```
Look for `cyber_cafe_timer` in the list.

If not found, create it:
```sql
CREATE DATABASE cyber_cafe_timer;
EXIT;
```

**Solution C: Check DATABASE_URL in .env**
```env
DATABASE_URL=mysql://root:@localhost:3306/cyber_cafe_timer
```

Verify:
- `root` is correct username
- No password (or add password if you set one)
- `localhost` or `127.0.0.1`
- `3306` is MySQL port
- `cyber_cafe_timer` is database name

**Solution D: Test Connection**
```cmd
cd C:\xampp\mysql\bin
mysql -u root cyber_cafe_timer
SELECT 1;
EXIT;
```

If successful, you'll see `1` returned.

---

### Issue 5: "pnpm: command not found"

**Symptoms:**
- Error when running `pnpm install` or `pnpm dev`
- Command not recognized

**Solution:**
```cmd
npm install -g pnpm
```

Then restart Command Prompt and try again.

---

### Issue 6: "npm ERR! code ERESOLVE"

**Symptoms:**
- Dependency resolution error during `pnpm install`
- Installation fails

**Solutions:**

**Solution A: Use Force Flag**
```cmd
pnpm install --force
```

**Solution B: Clear Cache**
```cmd
pnpm store prune
pnpm install
```

**Solution C: Delete node_modules and Lock File**
```cmd
rmdir /s /q node_modules
del pnpm-lock.yaml
pnpm install
```

---

### Issue 7: Server Runs Slowly or Crashes

**Symptoms:**
- Server is unresponsive
- Crashes after a few minutes
- High CPU usage

**Solutions:**

**Solution A: Increase Node.js Memory**
```cmd
set NODE_OPTIONS=--max-old-space-size=4096
pnpm dev
```

**Solution B: Check System Resources**
- Open Task Manager (Ctrl+Shift+Esc)
- Check CPU and Memory usage
- Close unnecessary applications

**Solution C: Increase MySQL Connections**
1. Open XAMPP Control Panel
2. Click "Config" next to MySQL
3. Edit `my.ini`
4. Find `max_connections` and increase it:
   ```ini
   max_connections=1000
   ```
5. Save and restart MySQL

**Solution D: Check Server Logs**
Look for errors in Command Prompt window where server is running.

---

### Issue 8: Database Migrations Failed

**Symptoms:**
- Error when running `pnpm drizzle-kit migrate`
- Tables not created
- Database is empty

**Solutions:**

**Solution A: Regenerate Migrations**
```cmd
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

**Solution B: Verify Database Connection**
```cmd
mysql -u root cyber_cafe_timer
SHOW TABLES;
EXIT;
```

**Solution C: Manual Migration**
1. Find migration file in `drizzle/migrations/`
2. Open it with text editor
3. Copy the SQL content
4. Run in MySQL:
   ```cmd
   mysql -u root cyber_cafe_timer < drizzle/migrations/0001_*.sql
   ```

---

### Issue 9: Admin Dashboard Won't Load

**Symptoms:**
- Page shows blank or loading forever
- 404 error
- Console errors

**Solutions:**

**Solution A: Clear Browser Cache**
- Chrome: Ctrl+Shift+Delete
- Firefox: Ctrl+Shift+Delete
- Safari: Develop > Empty Caches

**Solution B: Refresh Page**
- Press F5 or Ctrl+R
- Try Ctrl+F5 for hard refresh

**Solution C: Check Browser Console**
1. Press F12 to open Developer Tools
2. Go to "Console" tab
3. Look for error messages
4. Screenshot and report error

**Solution D: Try Different Browser**
- Try Chrome if using Firefox
- Try Firefox if using Chrome
- Try Edge

---

### Issue 10: Client Timer Not Updating

**Symptoms:**
- Timer shows but doesn't count down
- Cost doesn't update
- Connection status shows disconnected

**Solutions:**

**Solution A: Check WebSocket Connection**
1. Open browser Developer Tools (F12)
2. Go to "Network" tab
3. Look for WebSocket connections
4. If none, connection failed

**Solution B: Check Network Latency**
From client machine:
```cmd
ping SERVER_IP
```

High latency (>100ms) may cause issues. Try wired connection.

**Solution C: Restart Server**
1. Press Ctrl+C in server Command Prompt
2. Wait 5 seconds
3. Run `pnpm dev` again

**Solution D: Check Browser Console**
1. Press F12
2. Go to "Console" tab
3. Look for error messages

---

### Issue 11: Can't Access Admin Dashboard from Network

**Symptoms:**
- Admin dashboard works on server machine
- Can't access from other machines
- Firewall might be blocking

**Solutions:**

**Solution A: Check Firewall**
1. Press Win+R, type `wf.msc`, press Enter
2. Click "Allow an app through firewall"
3. Look for Node.js
4. If not listed, click "Allow another app"
5. Browse to Node.js installation
6. Add it

**Solution B: Disable Firewall Temporarily (Testing Only)**
1. Open Windows Defender Firewall
2. Click "Turn Windows Defender Firewall on or off"
3. Click "Turn off" for Private network
4. Test connection
5. Turn firewall back on

**Solution C: Add Port Exception**
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Click "New Rule"
4. Select "Port"
5. Select "TCP"
6. Enter port: 3000
7. Click "Next" and "Finish"

---

### Issue 12: Multiple Clients Connected But Admin Dashboard Shows None

**Symptoms:**
- Clients can access interface
- Admin dashboard shows no connected PCs
- PC Monitoring grid is empty

**Solutions:**

**Solution A: Refresh Admin Dashboard**
- Press F5 in admin browser
- Wait 5 seconds

**Solution B: Check WebSocket Connection**
1. Open admin dashboard
2. Press F12 (Developer Tools)
3. Go to "Network" tab
4. Look for WebSocket connection
5. Should show "ws://" connection

**Solution C: Check Server Logs**
Look at Command Prompt where server is running for error messages.

**Solution D: Restart Server**
1. Press Ctrl+C in server Command Prompt
2. Wait 5 seconds
3. Run `pnpm dev` again
4. Refresh admin dashboard

---

### Issue 13: "Access Denied" or Permission Errors

**Symptoms:**
- Can't read/write files
- Permission denied error
- Can't create database

**Solutions:**

**Solution A: Run Command Prompt as Administrator**
1. Press Win+R
2. Type `cmd`
3. Press Ctrl+Shift+Enter (not just Enter)
4. Click "Yes" to allow

**Solution B: Check File Permissions**
1. Right-click project folder
2. Select "Properties"
3. Go to "Security" tab
4. Click "Edit"
5. Select your user
6. Check "Full Control"
7. Click "Apply"

---

### Issue 14: "ENOENT: no such file or directory"

**Symptoms:**
- File not found error
- Can't find .env file
- Migration files missing

**Solutions:**

**Solution A: Verify File Exists**
1. Navigate to project folder
2. Check if file exists
3. If not, create it

**Solution B: Check Working Directory**
```cmd
cd C:\path\to\cyber_cafe_timer
dir
```

Verify you're in correct directory.

**Solution C: Recreate Missing Files**
- .env file: Copy from .env.example
- Migration files: Run `pnpm drizzle-kit generate`

---

### Issue 15: "EADDRINUSE: address already in use"

**Symptoms:**
- Port already in use
- Can't start server
- Another process using port

**Solutions:**

**Solution A: Kill Process**
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Solution B: Find What's Using Port**
```cmd
netstat -ano | findstr :3000
```

Look at the process name and close that application.

**Solution C: Use Different Port**
Edit `.env`:
```env
PORT=3001
```

---

## Firewall Configuration

### Allow Node.js Through Windows Firewall

1. **Open Windows Defender Firewall**
   - Press Win+R
   - Type `wf.msc`
   - Press Enter

2. **Click "Allow an app through firewall"**

3. **Click "Change settings"**

4. **Click "Allow another app"**

5. **Click "Browse"**

6. **Navigate to Node.js**
   - Usually: `C:\Program Files\nodejs\node.exe`
   - Or: `C:\Program Files (x86)\nodejs\node.exe`

7. **Select node.exe and click "Add"**

8. **Click "OK"**

Now Node.js can accept incoming connections.

---

## Performance Optimization

### Increase MySQL Connections

For 20+ concurrent clients:

1. Open XAMPP Control Panel
2. Click "Config" next to MySQL
3. Edit `my.ini`
4. Find: `max_connections=151`
5. Change to: `max_connections=1000`
6. Save and restart MySQL

### Increase Node.js Memory

If server is slow:

```cmd
set NODE_OPTIONS=--max-old-space-size=4096
pnpm dev
```

### Enable Query Caching (MySQL)

In `my.ini`:
```ini
query_cache_size=64M
query_cache_type=1
```

---

## Backup and Recovery

### Backup Database

```cmd
cd C:\xampp\mysql\bin
mysqldump -u root cyber_cafe_timer > C:\backup_cyber_cafe.sql
```

### Restore Database

```cmd
cd C:\xampp\mysql\bin
mysql -u root cyber_cafe_timer < C:\backup_cyber_cafe.sql
```

---

## Getting Help

1. **Check this guide** - Most issues are covered
2. **Check server logs** - Error messages in Command Prompt
3. **Check MySQL logs** - `C:\xampp\mysql\data\mysql_error.log`
4. **Check browser console** - F12 > Console tab
5. **Search online** - Copy exact error message
6. **Check project documentation** - README.md, DEPLOYMENT.md

---

## Quick Diagnostic Commands

```cmd
REM Check Node.js version
node --version

REM Check npm version
npm --version

REM Check pnpm version
pnpm --version

REM Check if MySQL is running
tasklist | findstr mysqld

REM Check what's using port 3000
netstat -ano | findstr :3000

REM Check what's using port 3306
netstat -ano | findstr :3306

REM Test MySQL connection
cd C:\xampp\mysql\bin
mysql -u root

REM Check your IP address
ipconfig

REM Test connection to server
ping 192.168.1.100
```

---

## Still Having Issues?

1. **Collect Information:**
   - Error message (exact text)
   - What you were doing
   - Steps to reproduce
   - Your system info (Windows version, etc.)

2. **Check Logs:**
   - Server Command Prompt output
   - MySQL error log
   - Browser console (F12)

3. **Try Basic Troubleshooting:**
   - Restart server
   - Restart MySQL
   - Restart computer
   - Clear browser cache

4. **Review Documentation:**
   - XAMPP_SETUP_WINDOWS.md
   - QUICK_START_WINDOWS.md
   - DEPLOYMENT.md

---

**Remember:** Most issues are due to MySQL not running or firewall blocking connections. Always check these first!
