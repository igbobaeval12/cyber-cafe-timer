# Cyber Café Timer - Windows XAMPP Setup Guide

## Complete Setup for Local Network Deployment

This guide walks through setting up Cyber Café Timer on Windows using XAMPP with MySQL and Node.js for multi-client network support.

## Prerequisites Checklist

- [x] Windows 10/11
- [x] XAMPP (latest version) - installed
- [x] Node.js - installed
- [x] MySQL from XAMPP - available
- [x] Multiple client machines on same network

## Part 1: Verify Installations

### Step 1: Verify Node.js Installation

Open Command Prompt and check Node.js version:

```cmd
node --version
npm --version
pnpm --version
```

**Expected Output:**
```
v18.0.0 (or higher)
9.0.0 (or higher)
10.0.0 (or higher)
```

If `pnpm` is not installed, install it globally:

```cmd
npm install -g pnpm
```

### Step 2: Verify XAMPP Installation

1. Open XAMPP Control Panel
2. Check that MySQL is available (not necessarily running yet)
3. Note the installation path (usually `C:\xampp`)

### Step 3: Find Your Server IP Address

You'll need this to connect client machines. Open Command Prompt:

```cmd
ipconfig
```

Look for "IPv4 Address" under your active network connection. Example: `192.168.1.100`

**Save this IP address** - you'll need it for client setup.

## Part 2: Setup MySQL Database

### Step 1: Start XAMPP MySQL

1. Open XAMPP Control Panel
2. Click "Start" next to MySQL
3. Wait for it to show "Running" (green indicator)

### Step 2: Create Database

Open Command Prompt and connect to MySQL:

```cmd
cd C:\xampp\mysql\bin
mysql -u root
```

Create the database:

```sql
CREATE DATABASE cyber_cafe_timer;
USE cyber_cafe_timer;
EXIT;
```

### Step 3: Verify MySQL Connection

Test connection from Command Prompt:

```cmd
mysql -u root -h localhost cyber_cafe_timer
```

If successful, you'll see `mysql>` prompt. Type `EXIT;` to exit.

## Part 3: Download and Setup Cyber Café Timer

### Step 1: Download Project

1. Download the Cyber Café Timer package
2. Extract to a location like `C:\cyber_cafe_timer` or `C:\Users\YourUsername\Desktop\cyber_cafe_timer`

### Step 2: Open Project in Command Prompt

```cmd
cd C:\path\to\cyber_cafe_timer
```

Replace `C:\path\to` with your actual path.

### Step 3: Install Dependencies

```cmd
pnpm install
```

This will download and install all required packages. Wait for completion (may take 5-10 minutes).

### Step 4: Create Environment File

Create a file named `.env` in the project root with these settings:

```env
# Database Configuration
DATABASE_URL=mysql://root:@localhost:3306/cyber_cafe_timer

# Server Configuration
NODE_ENV=development
PORT=3000

# JWT Secret (create a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OAuth (Manus - optional for local testing)
VITE_APP_ID=local-test
OAUTH_SERVER_URL=http://localhost:3000
VITE_OAUTH_PORTAL_URL=http://localhost:3000

# Owner Information
OWNER_NAME=Admin
OWNER_OPEN_ID=admin-local

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=http://localhost:3000
VITE_ANALYTICS_WEBSITE_ID=local-test

# Manus APIs (optional)
BUILT_IN_FORGE_API_URL=http://localhost:3000
BUILT_IN_FORGE_API_KEY=local-test-key
VITE_FRONTEND_FORGE_API_URL=http://localhost:3000
VITE_FRONTEND_FORGE_API_KEY=local-test-key
```

### Step 5: Generate Database Migrations

```cmd
pnpm drizzle-kit generate
```

This creates migration files in the `drizzle/migrations` folder.

### Step 6: Apply Database Migrations

```cmd
pnpm drizzle-kit migrate
```

This creates all necessary database tables.

### Step 7: Build the Project

```cmd
pnpm build
```

This creates optimized production files in the `dist` folder.

## Part 4: Start the Server

### Option A: Development Mode (Recommended for Testing)

```cmd
pnpm dev
```

**Expected Output:**
```
Server running on http://localhost:3000/
```

### Option B: Production Mode

```cmd
pnpm start
```

Keep this Command Prompt window open while the server is running.

## Part 5: Access the System

### Admin Dashboard

1. Open web browser
2. Go to: `http://localhost:3000/admin`
3. Login with admin credentials

### Client Interface (Local Machine)

1. Open web browser
2. Go to: `http://localhost:3000/client`
3. You should see "Waiting for Session"

## Part 6: Setup Client Machines on Network

### Finding Your Server IP

From the server machine, open Command Prompt:

```cmd
ipconfig
```

Find the IPv4 Address (e.g., `192.168.1.100`)

### On Each Client Machine

1. **Open Web Browser** (Chrome, Firefox, Safari, or Edge)

2. **Enter URL:**
   ```
   http://YOUR_SERVER_IP:3000/client
   ```
   
   Replace `YOUR_SERVER_IP` with actual IP (e.g., `http://192.168.1.100:3000/client`)

3. **You should see:**
   - "Waiting for Session" message
   - Connection status indicator
   - PC name and session ID

### Test Connection

From server admin dashboard:
1. Go to `http://localhost:3000/admin`
2. Check "PC Monitoring" section
3. You should see connected client machines listed

## Part 7: Create Batch Files for Easy Startup

### Create Server Startup Batch File

1. Create a new text file in your project root
2. Name it `start_server.bat`
3. Add this content:

```batch
@echo off
REM Start MySQL
echo Starting MySQL...
cd C:\xampp\mysql\bin
start mysqld.exe

REM Wait for MySQL to start
timeout /t 3

REM Start Cyber Cafe Timer Server
echo Starting Cyber Cafe Timer...
cd C:\path\to\cyber_cafe_timer
pnpm dev

pause
```

Replace `C:\path\to\cyber_cafe_timer` with your actual path.

4. Save and close
5. Double-click to run

### Create Client Startup Batch File

Create this on each client machine. Name it `start_client.bat`:

```batch
@echo off
REM Start Client Interface
echo Starting Cyber Cafe Timer Client...
start chrome.exe http://192.168.1.100:3000/client

REM Optional: Start in kiosk mode (full screen, locked down)
REM start chrome.exe --kiosk http://192.168.1.100:3000/client

pause
```

Replace `192.168.1.100` with your server IP.

## Part 8: Troubleshooting

### Problem: "Cannot connect to MySQL"

**Solution:**
1. Open XAMPP Control Panel
2. Click "Start" next to MySQL
3. Wait 5 seconds
4. Try again

### Problem: "Port 3000 already in use"

**Solution:**
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Replace `<PID>` with the process ID shown.

### Problem: "Client cannot access server"

**Checklist:**
1. Verify server IP: `ipconfig` on server machine
2. Verify client URL: `http://SERVER_IP:3000/client`
3. Check firewall:
   - Open Windows Defender Firewall
   - Click "Allow an app through firewall"
   - Add Node.js to allowed apps
4. Test connection from server machine first
5. Verify both machines on same network

### Problem: "Database connection failed"

**Solution:**
1. Verify MySQL is running in XAMPP
2. Check `.env` file DATABASE_URL
3. Verify database exists: `mysql -u root cyber_cafe_timer`
4. Check credentials in `.env` match MySQL setup

### Problem: "pnpm command not found"

**Solution:**
```cmd
npm install -g pnpm
```

Then restart Command Prompt and try again.

### Problem: "npm ERR! code ERESOLVE"

**Solution:**
```cmd
pnpm install --force
```

## Part 9: Network Configuration

### Firewall Configuration

1. **Open Windows Defender Firewall**
   - Press `Win+R`
   - Type `wf.msc`
   - Press Enter

2. **Allow Node.js Through Firewall**
   - Click "Allow an app through firewall"
   - Click "Change settings"
   - Click "Allow another app"
   - Browse to Node.js installation (usually `C:\Program Files\nodejs\node.exe`)
   - Click "Add"
   - Click "OK"

### Router Configuration (if needed)

If clients are on different network segments:

1. Ensure all machines are on same WiFi network or connected to same router
2. Verify no network isolation is enabled
3. Check router settings for any IP filtering

### Testing Network Connectivity

From client machine, open Command Prompt:

```cmd
ping 192.168.1.100
```

Replace IP with your server IP. Should show successful responses.

## Part 10: Performance Optimization

### Increase Node.js Memory (if needed)

If server runs slowly, increase memory:

```cmd
set NODE_OPTIONS=--max-old-space-size=4096
pnpm dev
```

### MySQL Optimization

For better performance with multiple clients:

1. Open XAMPP Control Panel
2. Click "Config" next to MySQL
3. Edit `my.ini`
4. Increase `max_connections`:
   ```ini
   max_connections=1000
   ```
5. Save and restart MySQL

## Part 11: Daily Operations

### Starting the System

1. **Start XAMPP MySQL**
   - Open XAMPP Control Panel
   - Click "Start" next to MySQL

2. **Start Server**
   - Open Command Prompt
   - Navigate to project folder
   - Run `pnpm dev`

3. **Access Admin Dashboard**
   - Open browser
   - Go to `http://localhost:3000/admin`

4. **Start Client Machines**
   - On each client, open browser
   - Go to `http://SERVER_IP:3000/client`

### Stopping the System

1. Close all browser windows
2. Press `Ctrl+C` in server Command Prompt
3. Stop MySQL in XAMPP Control Panel

### Restarting the System

If something goes wrong:

1. Press `Ctrl+C` in server Command Prompt
2. Stop MySQL in XAMPP
3. Wait 5 seconds
4. Start MySQL again
5. Run `pnpm dev` again

## Part 12: Backup and Maintenance

### Backup Database

Create a batch file `backup_database.bat`:

```batch
@echo off
cd C:\xampp\mysql\bin
mysqldump -u root cyber_cafe_timer > C:\backups\cyber_cafe_timer_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sql
echo Backup completed!
pause
```

### Restore Database

```cmd
cd C:\xampp\mysql\bin
mysql -u root cyber_cafe_timer < C:\backups\cyber_cafe_timer_backup_20240404.sql
```

## Part 13: Advanced Setup - Auto-Start on Windows Boot

### Create Startup Script

1. Create folder: `C:\cyber_cafe_timer_startup`
2. Create file: `startup.bat`

```batch
@echo off
REM Wait for system to fully boot
timeout /t 10

REM Start MySQL
cd C:\xampp\mysql\bin
start mysqld.exe

REM Wait for MySQL
timeout /t 5

REM Start Cyber Cafe Timer
cd C:\path\to\cyber_cafe_timer
start pnpm dev

exit
```

3. Create shortcut to this batch file
4. Move shortcut to: `C:\Users\YourUsername\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

## Part 14: Security for Production

### Change MySQL Password

```cmd
cd C:\xampp\mysql\bin
mysql -u root
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your-strong-password';
FLUSH PRIVILEGES;
EXIT;
```

Update `.env` file:
```env
DATABASE_URL=mysql://root:your-strong-password@localhost:3306/cyber_cafe_timer
```

### Change JWT Secret

In `.env`, update:
```env
JWT_SECRET=your-very-long-random-secret-string-here
```

### Enable HTTPS (Optional)

For production deployment, use HTTPS. This requires SSL certificates.

## Part 15: Monitoring

### Check Server Status

Open browser and go to: `http://localhost:3000`

### View Server Logs

Server logs appear in the Command Prompt window where you ran `pnpm dev`

### Monitor Database

```cmd
cd C:\xampp\mysql\bin
mysql -u root cyber_cafe_timer
SHOW PROCESSLIST;
SHOW STATUS;
EXIT;
```

## Part 16: Scaling to Multiple Clients

### For 10+ Clients

1. Increase MySQL connections in `my.ini`
2. Increase Node.js memory
3. Use wired Ethernet for better stability
4. Monitor server performance

### For 50+ Clients

Consider upgrading to:
- Dedicated server machine
- More powerful hardware
- Professional MySQL hosting
- Load balancing

## Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `pnpm install` |
| Start development server | `pnpm dev` |
| Build for production | `pnpm build` |
| Start production server | `pnpm start` |
| Generate migrations | `pnpm drizzle-kit generate` |
| Apply migrations | `pnpm drizzle-kit migrate` |
| Run tests | `pnpm test` |
| Check Node version | `node --version` |
| Check npm version | `npm --version` |
| Start MySQL | XAMPP Control Panel |
| Access admin | `http://localhost:3000/admin` |
| Access client | `http://localhost:3000/client` |

## Support & Troubleshooting

### Common Issues

1. **MySQL won't start** - Check XAMPP logs, may need to reset MySQL
2. **Port 3000 in use** - Kill process or use different port
3. **Client can't connect** - Check firewall and network connectivity
4. **Database errors** - Verify migrations were applied
5. **Slow performance** - Check system resources, increase Node memory

### Getting Help

1. Check DEPLOYMENT.md for general troubleshooting
2. Review server logs in Command Prompt
3. Check MySQL error logs in XAMPP
4. Verify network connectivity with `ping`
5. Test with local machine first before network testing

## Next Steps

1. ✓ Complete this setup
2. Configure pricing plans in admin dashboard
3. Register client machines
4. Test timer functionality
5. Train staff on system usage
6. Set up regular backups
7. Monitor system performance

---

**You're all set!** Your Cyber Café Timer is now running on Windows with XAMPP and ready for multi-client network deployment.

For detailed admin operations, see ADMIN_MANUAL.md
For client setup, see CLIENT_SETUP.md
For general deployment info, see DEPLOYMENT.md
