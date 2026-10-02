# Cyber Café Timer - Deployment Guide

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Local Network Setup](#local-network-setup)
5. [Running the System](#running-the-system)
6. [Client Machine Setup](#client-machine-setup)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)

## System Requirements

### Server Machine
- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows with WSL2
- **Node.js**: v18.0 or higher
- **npm/pnpm**: Latest version
- **Database**: MySQL 8.0+ or compatible (TiDB, MariaDB)
- **RAM**: Minimum 2GB, recommended 4GB+
- **Disk Space**: 5GB minimum
- **Network**: Stable connection, preferably wired Ethernet

### Client Machines
- **OS**: Windows 7+, macOS 10.12+, or Linux
- **Browser**: Chrome/Chromium, Firefox, Safari, or Edge (modern versions)
- **Network**: Connected to same local network as server
- **RAM**: 1GB minimum
- **Display**: Any resolution (responsive design)

## Installation

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url> cyber_cafe_timer
cd cyber_cafe_timer

# Install dependencies
pnpm install

# Or if using npm
npm install
```

### 2. Database Setup

```bash
# Create MySQL database
mysql -u root -p -e "CREATE DATABASE cyber_cafe_timer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Create database user
mysql -u root -p -e "CREATE USER 'cafe_user'@'localhost' IDENTIFIED BY 'secure_password';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON cyber_cafe_timer.* TO 'cafe_user'@'localhost';"
mysql -u root -p -e "FLUSH PRIVILEGES;"
```

### 3. Environment Configuration

Create `.env` file in project root:

```env
# Database
DATABASE_URL=mysql://cafe_user:secure_password@localhost:3306/cyber_cafe_timer

# Server
NODE_ENV=production
PORT=3000

# OAuth (if using Manus OAuth)
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# JWT
JWT_SECRET=your_jwt_secret_key_here_min_32_chars

# Owner
OWNER_NAME=Café Manager
OWNER_OPEN_ID=owner_id

# Built-in APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_api_key

# Frontend
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your_frontend_key
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
VITE_ANALYTICS_WEBSITE_ID=your_website_id
```

### 4. Build the Application

```bash
# Generate database migrations
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit migrate

# Build for production
pnpm build
```

## Configuration

### Initial Setup

1. **Access Admin Panel**
   - Navigate to `http://server-ip:3000/admin`
   - Login with admin credentials

2. **Configure Pricing**
   - Go to Pricing Management
   - Add pricing plans (hourly rates, minimum charges, discounts)
   - Set active pricing plan

3. **Register Computers**
   - Add each client PC in the system
   - Assign PC names (e.g., PC-01, PC-02)
   - Note the PC identifiers for client setup

4. **System Settings**
   - Configure café name and contact info
   - Set timezone and currency
   - Enable multi-language support
   - Configure notification preferences

## Local Network Setup

### Network Architecture

```
┌─────────────────────────────────────────┐
│         Admin Server (3000)              │
│  - Central management & WebSocket hub    │
│  - Database storage                      │
│  - Real-time synchronization             │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐
│ PC-01  │  │ PC-02  │  │ PC-03  │
│Client  │  │Client  │  │Client  │
└────────┘  └────────┘  └────────┘
```

### Network Configuration

1. **Server Machine**
   - Assign static IP address (e.g., 192.168.1.100)
   - Ensure firewall allows port 3000 (or configured port)
   - Configure port forwarding if needed

2. **Client Machines**
   - Connect to same network as server
   - Obtain server IP address
   - Configure client to connect to server

3. **Firewall Rules**
   ```bash
   # Allow port 3000 (adjust as needed)
   sudo ufw allow 3000/tcp
   
   # For Windows Firewall
   # Add inbound rule for port 3000
   ```

4. **Network Testing**
   ```bash
   # From client machine, test connectivity
   ping server-ip
   curl http://server-ip:3000
   ```

## Running the System

### Development Mode

```bash
# Start development server with hot reload
pnpm dev

# Server will be available at http://localhost:3000
```

### Production Mode

```bash
# Build application
pnpm build

# Start production server
pnpm start

# Server will be available at http://configured-ip:configured-port
```

### Using Docker (Optional)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

Build and run:
```bash
docker build -t cyber-cafe-timer .
docker run -p 3000:3000 --env-file .env cyber-cafe-timer
```

### Process Management (Linux/macOS)

Using PM2:
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/index.js --name "cyber-cafe"

# Monitor
pm2 monit

# Logs
pm2 logs cyber-cafe

# Restart on reboot
pm2 startup
pm2 save
```

## Client Machine Setup

### Browser Access

1. **Open Browser**
   - Chrome, Firefox, Safari, or Edge

2. **Navigate to Client Interface**
   - Admin: `http://server-ip:3000/admin`
   - Client: `http://server-ip:3000/client`

3. **First Time Setup**
   - Client will auto-register with server
   - PC name will be generated and stored locally
   - Connection status will display

### Client Configuration

```javascript
// Client settings stored in localStorage
localStorage.setItem('pcName', 'PC-01');
localStorage.setItem('serverUrl', 'http://192.168.1.100:3000');
localStorage.setItem('language', 'en');
```

### Kiosk Mode Setup (Windows)

For dedicated client machines:

```batch
@echo off
REM Start browser in kiosk mode
start chrome.exe --kiosk http://server-ip:3000/client

REM Disable task manager (optional)
REM reg add HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System /v DisableTaskMgr /t REG_DWORD /d 1
```

### Kiosk Mode Setup (macOS)

```bash
#!/bin/bash
# Start Safari in full screen
open -a Safari --args --kiosk "http://server-ip:3000/client"
```

### Kiosk Mode Setup (Linux)

```bash
#!/bin/bash
# Start Chromium in kiosk mode
chromium --kiosk http://server-ip:3000/client
```

## Troubleshooting

### Connection Issues

**Problem**: Client cannot connect to server
```bash
# Check server is running
curl http://server-ip:3000

# Check firewall
sudo ufw status
sudo ufw allow 3000/tcp

# Check network connectivity
ping server-ip
traceroute server-ip
```

**Problem**: WebSocket connection fails
```bash
# Check server logs
tail -f .manus-logs/devserver.log

# Verify Socket.IO is initialized
curl -I http://server-ip:3000/socket.io/
```

### Database Issues

**Problem**: Database connection error
```bash
# Test MySQL connection
mysql -h localhost -u cafe_user -p cyber_cafe_timer

# Check database status
mysql -u root -p -e "SHOW DATABASES;"

# Verify migrations
mysql -u cafe_user -p cyber_cafe_timer -e "SHOW TABLES;"
```

**Problem**: Migration failed
```bash
# Reset migrations (careful!)
pnpm drizzle-kit drop

# Reapply migrations
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### Performance Issues

**Problem**: Slow timer updates
- Reduce number of connected clients
- Increase server RAM
- Check network bandwidth
- Monitor CPU usage

**Problem**: High memory usage
```bash
# Monitor Node.js process
node --max-old-space-size=4096 dist/index.js

# Check for memory leaks
node --inspect dist/index.js
```

### Browser Issues

**Problem**: Timer not updating
- Clear browser cache: Ctrl+Shift+Delete
- Disable browser extensions
- Try different browser
- Check browser console for errors (F12)

**Problem**: Unresponsive UI
- Check network latency
- Reduce number of open sessions
- Restart browser
- Clear localStorage

## Security Considerations

### Authentication

1. **Admin Password**
   - Change default admin password immediately
   - Use strong passwords (min 12 characters)
   - Enable two-factor authentication if available

2. **Session Management**
   - Sessions auto-expire after inactivity
   - Configure session timeout in settings
   - Clear cookies on logout

### Network Security

1. **HTTPS/SSL**
   ```bash
   # Generate self-signed certificate
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365
   
   # Use with Node.js
   const https = require('https');
   const fs = require('fs');
   const app = require('./server');
   
   https.createServer({
     key: fs.readFileSync('key.pem'),
     cert: fs.readFileSync('cert.pem')
   }, app).listen(3000);
   ```

2. **Firewall Rules**
   - Restrict port 3000 to local network only
   - Use VPN for remote access
   - Implement rate limiting

3. **Database Security**
   - Use strong database passwords
   - Restrict database access to localhost
   - Regular backups
   - Enable query logging

### Data Protection

1. **Backup Strategy**
   ```bash
   # Daily backup
   mysqldump -u cafe_user -p cyber_cafe_timer > backup_$(date +%Y%m%d).sql
   
   # Automated backup (cron)
   0 2 * * * mysqldump -u cafe_user -p cyber_cafe_timer > /backups/backup_$(date +\%Y\%m\%d).sql
   ```

2. **Encryption**
   - Store sensitive data encrypted
   - Use HTTPS for all connections
   - Encrypt database backups

3. **Access Control**
   - Use role-based access (admin/user)
   - Audit logging enabled
   - Regular security audits

### Monitoring

1. **System Monitoring**
   ```bash
   # Monitor server resources
   htop
   
   # Monitor network connections
   netstat -an | grep 3000
   ```

2. **Application Logging**
   - Check logs regularly
   - Set up log rotation
   - Monitor error rates

3. **Alerts**
   - Configure alerts for critical errors
   - Monitor database performance
   - Track failed login attempts

## Maintenance

### Regular Tasks

- **Daily**: Check system logs, verify backups
- **Weekly**: Review session history, check performance metrics
- **Monthly**: Security audit, database optimization
- **Quarterly**: Update dependencies, security patches

### Updates

```bash
# Check for updates
pnpm outdated

# Update dependencies
pnpm update

# Update critical security packages
pnpm update --save --save-exact

# Rebuild and restart
pnpm build
pnpm start
```

## Support

For issues and support:
- Check logs in `.manus-logs/` directory
- Review troubleshooting section above
- Contact system administrator
- Check documentation at project repository

## License

This software is provided as-is for use in cyber cafés and similar establishments.
