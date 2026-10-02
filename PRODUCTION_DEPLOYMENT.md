# Cyber Café Timer - Complete Production Deployment Guide

**Version**: 1.0.0  
**Last Updated**: June 30, 2026  
**Status**: Production Ready

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Requirements](#system-requirements)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Database Setup](#database-setup)
5. [Server Deployment](#server-deployment)
6. [Client Deployment](#client-deployment)
7. [Network Configuration](#network-configuration)
8. [Security Hardening](#security-hardening)
9. [Monitoring & Maintenance](#monitoring-&-maintenance)
10. [Troubleshooting](#troubleshooting)
11. [Scalability](#scalability)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard                          │
│              (React 19 + TypeScript + Vite)                 │
│  - PC Monitoring                                            │
│  - Session Control                                          │
│  - Pricing Management                                       │
│  - Reports & Analytics                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴───────────┐
        │                    │
    HTTP/REST            WebSocket
    (tRPC)              (Socket.IO)
        │                    │
        ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│         Central Server (Node.js + Express)                  │
│  - tRPC API Routes                                          │
│  - WebSocket Server                                         │
│  - Session Management                                       │
│  - Database Integration                                     │
│  - Notification Service                                     │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────┴────────────────────────────────────────────────┐
    │                                                          │
    ▼                                                          ▼
┌──────────────────────────┐                    ┌─────────────────────────────┐
│    MySQL Database        │                    │  Client PCs (Multiple)      │
│  - Users                 │                    │  - Timer Interface          │
│  - Computers             │                    │  - Session Display          │
│  - Sessions              │                    │  - Security Restrictions    │
│  - Transactions          │                    │  - Payment Integration      │
│  - Audit Logs            │                    │  - Auto-lock on Expiry      │
│  - Notifications         │                    └─────────────────────────────┘
│  - Print Jobs            │
└──────────────────────────┘
```

### Data Flow

1. **Admin initiates action** → tRPC API call
2. **Server processes** → Validates, updates database
3. **Real-time broadcast** → WebSocket to connected clients
4. **Client responds** → Timer updates, lock screen, etc.

---

## System Requirements

### Server (Minimum)

- **OS**: Windows Server 2016+, Linux (Ubuntu 18.04+), or macOS 10.14+
- **CPU**: 2 cores (4 cores recommended)
- **RAM**: 4 GB minimum (8 GB recommended)
- **Storage**: 50 GB (SSD recommended)
- **Network**: 100 Mbps LAN connection
- **Node.js**: v18.0.0 or higher
- **MySQL**: 8.0+ or TiDB, MariaDB 10.5+

### Client PC (Minimum)

- **OS**: Windows 7+ or any modern browser
- **CPU**: Dual-core 1.5 GHz
- **RAM**: 2 GB minimum
- **Network**: 10 Mbps LAN connection
- **Browser**: Chrome 90+, Firefox 88+, Edge 90+
- **Display**: 1024x768 minimum

### Admin Machine

- Same as client PC requirements
- Keyboard + Mouse for management

---

## Pre-Deployment Checklist

### Before Starting

- [ ] Verify network infrastructure is stable
- [ ] Ensure all PCs are on the same network or accessible via WAN
- [ ] Test MySQL/Database server connectivity
- [ ] Prepare admin credentials and password policy
- [ ] Configure firewall rules (port 3000 for server)
- [ ] Set up SSL/TLS certificates if using HTTPS
- [ ] Plan backup strategy
- [ ] Create system documentation
- [ ] Train staff on admin dashboard usage

### Dependencies

```bash
# Verify Node.js
node --version  # Should be v18.0.0+

# Verify npm/pnpm
npm --version
pnpm --version

# Verify MySQL
mysql --version  # Should be 8.0+
```

---

## Database Setup

### 1. Create Database

```sql
-- Connect to MySQL
mysql -u root -p

-- Create database
CREATE DATABASE cyber_cafe_timer 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Create user (security)
CREATE USER 'cafe_admin'@'localhost' IDENTIFIED BY 'strong_password_here';
CREATE USER 'cafe_app'@'%' IDENTIFIED BY 'app_strong_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON cyber_cafe_timer.* TO 'cafe_admin'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON cyber_cafe_timer.* TO 'cafe_app'@'%';

FLUSH PRIVILEGES;
```

### 2. Apply Migrations

```bash
# From project root
cd cyber_cafe_timer

# Generate migrations
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit migrate
```

### 3. Initialize System Settings

```sql
USE cyber_cafe_timer;

-- Insert default pricing configuration
INSERT INTO pricingConfigs (name, hourlyRate, minimumCharge, discountPercentage, isActive)
VALUES ('Standard Rate', '50.00', '100.00', '0.00', TRUE);

-- Insert default admin user (if needed via app)
-- This is typically done during first admin setup in the app

-- Insert system settings
INSERT INTO systemSettings (settingKey, settingValue, description)
VALUES 
  ('café_name', 'My Cyber Café', 'Café business name'),
  ('address', '123 Main Street', 'Café physical address'),
  ('currency', 'USD', 'Currency code'),
  ('timezone', 'UTC', 'Server timezone'),
  ('backup_frequency', '1440', 'Backup interval in minutes');
```

### 4. Backup Strategy

```bash
# Daily automated backup (Linux cron)
# Add to crontab: crontab -e
0 2 * * * /usr/local/bin/backup-cyber-cafe.sh

# Create backup script
#!/bin/bash
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="/backups/cyber_cafe_timer"
mkdir -p $BACKUP_DIR
mysqldump -u cafe_admin -p cyber_cafe_timer > $BACKUP_DIR/backup_$DATE.sql
gzip $BACKUP_DIR/backup_$DATE.sql
# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

---

## Server Deployment

### 1. Environment Configuration

Create `.env` file:

```env
# Database
DATABASE_URL=mysql://cafe_app:app_strong_password_here@db-server.local:3306/cyber_cafe_timer

# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-session-secret-key

# OAuth/Auth (optional)
OAUTH_SERVER_URL=https://your-domain.com
OWNER_OPEN_ID=admin-user-id
OWNER_NAME=Administrator

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=https://your-analytics-server.com
VITE_ANALYTICS_WEBSITE_ID=your-site-id

# Backup
BACKUP_ENABLED=true
BACKUP_FREQUENCY_HOURS=24
BACKUP_RETENTION_DAYS=30
```

### 2. Install & Build

```bash
# Install dependencies
pnpm install

# Type check
pnpm check

# Build for production
pnpm build

# Verify build output
ls -la dist/
```

### 3. Deploy to Server

#### Option A: Direct Deployment

```bash
# SSH to server
ssh admin@server-ip

# Create app directory
sudo mkdir -p /opt/cyber-cafe-timer
sudo chown $USER:$USER /opt/cyber-cafe-timer

# Copy files
scp -r dist/ admin@server-ip:/opt/cyber-cafe-timer/
scp .env admin@server-ip:/opt/cyber-cafe-timer/

# Set permissions
sudo chmod -R 755 /opt/cyber-cafe-timer

# Create systemd service
sudo tee /etc/systemd/system/cyber-cafe-timer.service > /dev/null << EOF
[Unit]
Description=Cyber Cafe Timer Service
After=network.target mysql.service

[Service]
Type=simple
User=cyber-cafe
WorkingDirectory=/opt/cyber-cafe-timer
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable cyber-cafe-timer
sudo systemctl start cyber-cafe-timer

# Check status
sudo systemctl status cyber-cafe-timer
```

#### Option B: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy dependencies first for better caching
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy application
COPY . .

# Build
RUN pnpm build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "dist/index.js"]
```

Deploy with Docker Compose:

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: cyber_cafe_timer
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    networks:
      - cyber-cafe

  server:
    build: .
    environment:
      DATABASE_URL: mysql://cafe_app:password@mysql:3306/cyber_cafe_timer
      NODE_ENV: production
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      - mysql
    networks:
      - cyber-cafe
    restart: unless-stopped

volumes:
  mysql_data:

networks:
  cyber-cafe:
```

### 4. Nginx Reverse Proxy Configuration

```nginx
upstream cyber_cafe_timer {
  server localhost:3000;
}

server {
  listen 80;
  listen 443 ssl http2;
  server_name cafe.yourdomain.com;

  # SSL certificates (use Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/cafe.yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/cafe.yourdomain.com/privkey.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;

  # Redirect HTTP to HTTPS
  if ($scheme != "https") {
    return 301 https://$server_name$request_uri;
  }

  # Proxy settings
  location / {
    proxy_pass http://cyber_cafe_timer;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_read_timeout 86400;
  }
}
```

---

## Client Deployment

### Windows Client Setup

1. **Browser-based Client**:
```batch
@echo off
REM Create shortcut for client
set TARGET=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
set URL=http://admin-server-ip:3000/client
set SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Cyber Cafe Timer.lnk

powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT%'); $Shortcut.TargetPath = '%TARGET%'; $Shortcut.Arguments = '--app=%URL% --kiosk'; $Shortcut.Save()"

echo Client shortcut created at %SHORTCUT%
```

2. **Auto-launch on startup**:
```batch
REM Add to Task Scheduler
schtasks /create /tn "Cyber Cafe Timer" /tr "%TARGET% %URL%" /sc onlogon /rl highest /f
```

3. **Full-screen kiosk configuration**:
   - Set browser to start in full-screen
   - Disable browser UI elements
   - Lock down Windows settings (disable Task Manager, Control Panel, etc.)

### Linux Client Setup

```bash
#!/bin/bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y chromium-browser

# Create desktop entry
cat > ~/.local/share/applications/cyber-cafe-timer.desktop << EOF
[Desktop Entry]
Type=Application
Name=Cyber Café Timer
Exec=chromium-browser --start-fullscreen --app=http://admin-server-ip:3000/client
Icon=timer
Categories=Utilities;
EOF

# Auto-start on login
mkdir -p ~/.config/autostart
ln -s ~/.local/share/applications/cyber-cafe-timer.desktop ~/.config/autostart/
```

---

## Network Configuration

### Required Ports

| Service | Port | Protocol | Direction |
|---------|------|----------|-----------|
| Web/Admin | 3000 | HTTP/HTTPS | Bidirectional |
| WebSocket | 3000 | WS/WSS | Bidirectional |
| MySQL | 3306 | TCP | Server ← Client |
| SSH (Admin) | 22 | TCP | Inbound |

### Firewall Rules (Windows)

```powershell
# Allow port 3000
netsh advfirewall firewall add rule name="Cyber Cafe Timer" dir=in action=allow protocol=tcp localport=3000
```

### Firewall Rules (Linux)

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### Network Architecture Diagram

```
┌──────────────────────────────────┐
│       Internet / WAN             │
│        (Optional VPN)            │
└────────────┬─────────────────────┘
             │
┌────────────┴─────────────────────┐
│      Firewall / Gateway          │
│    (Port 3000 → Server IP)       │
└────────────┬─────────────────────┘
             │
┌────────────┴─────────────────────────────────────────┐
│              Local Network (LAN)                      │
│  ┌──────────────────────────────────────────────────┐│
│  │              Server 192.168.1.10:3000             ││
│  │  - Node.js Application                           ││
│  │  - WebSocket Broadcast                           ││
│  │  - MySQL Connection Pool                         ││
│  └──────────────────────────────────────────────────┘│
│                        │                              │
│  ┌──────────────┬──────┴──────┬──────────────────┐  │
│  │              │             │                  │  │
│  ▼              ▼             ▼                  ▼  │
│ PC-001        PC-002       PC-003            Admin  │
│ Timer         Timer        Timer           Dashboard │
│─────────────────────────────────────────────────────│
└─────────────────────────────────────────────────────┘
```

---

## Security Hardening

### 1. Database Security

```sql
-- Create read-only user for reporting
CREATE USER 'cafe_report'@'%' IDENTIFIED BY 'report_password';
GRANT SELECT ON cyber_cafe_timer.* TO 'cafe_report'@'%';

-- Enforce SSL for MySQL connections
GRANT ALL PRIVILEGES ON cyber_cafe_timer.* TO 'cafe_app'@'%' REQUIRE SSL;

-- Password policy
SET GLOBAL validate_password.policy='STRONG';
SET GLOBAL validate_password.length=12;
```

### 2. Application Security

```javascript
// In server code
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);
```

### 3. TLS/SSL Configuration

```bash
# Generate self-signed certificate (development)
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

# Let's Encrypt (production)
sudo certbot certonly --standalone -d cafe.yourdomain.com
```

### 4. Environment Security

```bash
# Use environment variables, not hardcoded secrets
# Restrict file permissions
chmod 600 .env
chmod 700 /opt/cyber-cafe-timer

# Use secrets manager
# AWS Secrets Manager, HashiCorp Vault, etc.
```

### 5. Admin Authentication

- Use strong passwords (min 12 characters)
- Implement 2FA if possible
- Regular password rotation policy
- Audit admin login attempts
- Session timeout (15-30 minutes)

---

## Monitoring & Maintenance

### Log Monitoring

```bash
# Check application logs
sudo journalctl -u cyber-cafe-timer -f

# MySQL logs
sudo tail -f /var/log/mysql/error.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Health Checks

```bash
#!/bin/bash
# health-check.sh

# Check server status
curl -f http://localhost:3000/health || exit 1

# Check database connection
mysql -u cafe_app -p -h localhost cyber_cafe_timer -e "SELECT 1" || exit 1

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | cut -d '%' -f1)
if [ $DISK_USAGE -gt 90 ]; then
  echo "Disk usage critical: $DISK_USAGE%"
  exit 1
fi

exit 0
```

### Performance Monitoring

```bash
# Monitor resource usage
watch -n 1 'free -h && echo "---" && du -sh /opt/cyber-cafe-timer'

# Monitor network connections
netstat -plant | grep 3000

# Monitor database connections
mysql -e "SHOW PROCESSLIST;"
```

### Automated Monitoring (Prometheus + Grafana)

Setup metrics collection and visualization for:
- Server CPU/Memory/Disk
- Request latency
- Active sessions
- Database query performance
- WebSocket connection count

---

## Troubleshooting

### Common Issues

#### 1. Server Won't Start

```bash
# Check if port 3000 is in use
lsof -i :3000
# Kill process if needed
kill -9 <PID>

# Check logs
sudo journalctl -u cyber-cafe-timer -n 50

# Verify database connection
mysql -u cafe_app -p -h db-server.local cyber_cafe_timer -e "SELECT 1"
```

#### 2. WebSocket Connection Failed

```bash
# Check firewall
sudo ufw status
sudo iptables -L -n

# Test connectivity from client
telnet server-ip 3000

# Check Nginx proxy settings
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. Database Performance Slow

```sql
-- Check slow query log
SELECT * FROM mysql.slow_log;

-- Analyze table
ANALYZE TABLE sessions;
OPTIMIZE TABLE sessions;

-- Create indexes if missing
CREATE INDEX idx_session_user ON sessions(userId);
CREATE INDEX idx_session_computer ON sessions(computerId);
CREATE INDEX idx_session_status ON sessions(sessionStatus);
```

#### 4. Client Timer Not Updating

- Verify WebSocket connection in browser console
- Check if PC is registered in admin dashboard
- Restart client browser
- Check server logs for errors

#### 5. High Database Disk Usage

```sql
-- Archive old sessions
INSERT INTO sessions_archive SELECT * FROM sessions WHERE endTime < DATE_SUB(NOW(), INTERVAL 6 MONTH);
DELETE FROM sessions WHERE endTime < DATE_SUB(NOW(), INTERVAL 6 MONTH);

-- Optimize tables
OPTIMIZE TABLE sessions;
```

---

## Scalability

### Horizontal Scaling

For multiple server instances:

1. **Setup Load Balancer**:
```nginx
upstream backend {
  server backend1.local:3000;
  server backend2.local:3000;
  server backend3.local:3000;
}
```

2. **Shared Session Store** (Redis):
```javascript
const redis = require('redis');
const store = require('connect-redis').default;

app.use(session({
  store: new store({ client: redis.createClient() }),
  secret: process.env.SESSION_SECRET,
}));
```

3. **Socket.IO Adapter** (Redis):
```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const redisClient = require('redis').createClient();

io.adapter(createAdapter(redisClient));
```

### Database Scaling

1. **Read Replicas**:
```
Primary (Write) → Replica 1 (Read)
               → Replica 2 (Read)
               → Replica 3 (Read)
```

2. **Sharding** (for very large deployments):
   - Shard by café location
   - Shard by geographic region
   - Separate time-series data

### Monitoring at Scale

- Elasticsearch for centralized logging
- Prometheus for metrics
- Grafana for dashboards
- PagerDuty for alerting

---

## Support & Maintenance

### Regular Maintenance Tasks

- [ ] Weekly: Check disk space and clean logs
- [ ] Monthly: Review audit logs for security issues
- [ ] Quarterly: Database maintenance and optimization
- [ ] Annually: Security audit and penetration testing
- [ ] Update dependencies: Monitor security advisories

### Emergency Contacts

- **Database Issues**: [DB Admin Contact]
- **Network Issues**: [IT Support Contact]
- **Application Bugs**: [Dev Team Contact]

### Documentation Links

- Architecture Guide: `ARCHITECTURE.md`
- Admin Manual: `ADMIN_MANUAL.md`
- Client Setup: `CLIENT_SETUP.md`
- API Reference: `API_REFERENCE.md`

---

## Conclusion

This deployment guide provides production-ready infrastructure for the Cyber Café Timer system. Follow all steps carefully for a secure, stable, and scalable deployment.

**For support, contact**: support@cyber-cafe-timer.dev
