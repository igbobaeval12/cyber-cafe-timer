#!/bin/bash

##############################################################################
# Cyber Café Timer - Automated Deployment Setup Script
# This script handles complete setup for Linux/macOS production deployment
# Run with: bash deploy.sh [environment]
##############################################################################

set -e  # Exit on error

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_FILE="$SCRIPT_DIR/deployment.log"

##############################################################################
# Color Codes for Output
##############################################################################
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

##############################################################################
# Logging Functions
##############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

##############################################################################
# Pre-flight Checks
##############################################################################

preflight_checks() {
    log_info "Running pre-flight checks..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js v18.0.0+"
        exit 1
    fi
    NODE_VERSION=$(node --version)
    log_success "Node.js $NODE_VERSION found"

    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        log_warning "pnpm not found. Installing..."
        npm install -g pnpm
    fi
    PNPM_VERSION=$(pnpm --version)
    log_success "pnpm $PNPM_VERSION found"

    # Check MySQL
    if ! command -v mysql &> /dev/null; then
        log_warning "MySQL not found. Please install MySQL 8.0+"
        log_info "On Ubuntu: sudo apt-get install mysql-server"
        log_info "On macOS: brew install mysql"
    fi

    # Check git
    if ! command -v git &> /dev/null; then
        log_error "Git not found. Please install Git"
        exit 1
    fi

    log_success "All pre-flight checks passed"
}

##############################################################################
# Install Dependencies
##############################################################################

install_dependencies() {
    log_info "Installing dependencies..."

    cd "$SCRIPT_DIR"
    pnpm install

    if [ $? -eq 0 ]; then
        log_success "Dependencies installed successfully"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi
}

##############################################################################
# Database Setup
##############################################################################

setup_database() {
    log_info "Setting up database..."

    read -p "Enter MySQL root password: " -s MYSQL_ROOT_PASS
    echo

    # Test connection
    if ! mysql -u root -p"$MYSQL_ROOT_PASS" -e "SELECT 1" &> /dev/null; then
        log_error "Cannot connect to MySQL with provided password"
        exit 1
    fi

    # Create database and user
    log_info "Creating database and user..."
    mysql -u root -p"$MYSQL_ROOT_PASS" << EOF
CREATE DATABASE IF NOT EXISTS cyber_cafe_timer 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'cafe_app'@'%' IDENTIFIED BY '${DB_PASSWORD:-cafe_password}';
GRANT SELECT, INSERT, UPDATE, DELETE ON cyber_cafe_timer.* TO 'cafe_app'@'%';
FLUSH PRIVILEGES;
EOF

    if [ $? -eq 0 ]; then
        log_success "Database created successfully"
    else
        log_error "Failed to create database"
        exit 1
    fi

    # Run migrations
    log_info "Running database migrations..."
    export DATABASE_URL="mysql://cafe_app:${DB_PASSWORD:-cafe_password}@localhost:3306/cyber_cafe_timer"
    
    pnpm drizzle-kit generate
    pnpm drizzle-kit migrate

    if [ $? -eq 0 ]; then
        log_success "Database migrations completed"
    else
        log_error "Failed to run migrations"
        exit 1
    fi
}

##############################################################################
# Environment Configuration
##############################################################################

setup_environment() {
    log_info "Setting up environment configuration..."

    if [ -f "$SCRIPT_DIR/.env" ]; then
        log_warning ".env file already exists, skipping creation"
        return
    fi

    # Generate secure secrets
    JWT_SECRET=$(openssl rand -hex 32)
    SESSION_SECRET=$(openssl rand -hex 32)

    cat > "$SCRIPT_DIR/.env" << EOF
# Database
DATABASE_URL=mysql://cafe_app:${DB_PASSWORD:-cafe_password}@localhost:3306/cyber_cafe_timer

# Server
NODE_ENV=$ENVIRONMENT
PORT=3000
HOST=0.0.0.0

# Security
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET

# OAuth/Auth
OAUTH_SERVER_URL=https://localhost:3000
OWNER_OPEN_ID=admin
OWNER_NAME=Administrator

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=https://localhost:3000
VITE_ANALYTICS_WEBSITE_ID=local

# Backup
BACKUP_ENABLED=true
BACKUP_FREQUENCY_HOURS=24
BACKUP_RETENTION_DAYS=30
EOF

    chmod 600 "$SCRIPT_DIR/.env"
    log_success "Environment configuration created at .env"
}

##############################################################################
# Build Application
##############################################################################

build_application() {
    log_info "Building application..."

    cd "$SCRIPT_DIR"

    # Type checking
    log_info "Running TypeScript checks..."
    pnpm check

    # Build
    log_info "Building for production..."
    pnpm build

    if [ -d "$SCRIPT_DIR/dist" ]; then
        log_success "Application built successfully"
    else
        log_error "Build failed - dist directory not created"
        exit 1
    fi
}

##############################################################################
# Setup Systemd Service
##############################################################################

setup_systemd_service() {
    log_info "Setting up systemd service..."

    if [ "$EUID" -ne 0 ]; then
        log_warning "Skipping systemd setup - requires root. Run: sudo -E bash deploy.sh"
        return
    fi

    SERVICE_FILE="/etc/systemd/system/cyber-cafe-timer.service"

    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Cyber Café Timer Service
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=cyber-cafe
WorkingDirectory=$SCRIPT_DIR
ExecStart=/usr/bin/node $SCRIPT_DIR/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

Environment="NODE_ENV=$ENVIRONMENT"
EnvironmentFile=$SCRIPT_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

    # Create user
    if ! id "cyber-cafe" &> /dev/null; then
        log_info "Creating cyber-cafe user..."
        useradd -r -s /bin/bash -d "$SCRIPT_DIR" -m cyber-cafe
    fi

    # Set permissions
    chown -R cyber-cafe:cyber-cafe "$SCRIPT_DIR"
    chmod 700 "$SCRIPT_DIR"
    chmod 600 "$SCRIPT_DIR/.env"

    # Reload systemd
    systemctl daemon-reload
    systemctl enable cyber-cafe-timer

    log_success "Systemd service created at $SERVICE_FILE"
    log_info "Start service with: sudo systemctl start cyber-cafe-timer"
}

##############################################################################
# Setup Nginx Reverse Proxy
##############################################################################

setup_nginx() {
    log_info "Setting up Nginx reverse proxy..."

    if ! command -v nginx &> /dev/null; then
        log_warning "Nginx not installed. Install with: sudo apt-get install nginx"
        return
    fi

    if [ "$EUID" -ne 0 ]; then
        log_warning "Skipping nginx setup - requires root"
        return
    fi

    NGINX_SITE="/etc/nginx/sites-available/cyber-cafe-timer"

    cat > "$NGINX_SITE" << 'EOF'
upstream cyber_cafe_backend {
  server localhost:3000;
}

server {
  listen 80;
  server_name _;

  # Redirect to HTTPS if using SSL
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name _;

  # SSL certificates - Update these paths
  ssl_certificate /etc/ssl/certs/cyber-cafe-cert.pem;
  ssl_certificate_key /etc/ssl/private/cyber-cafe-key.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;

  location / {
    proxy_pass http://cyber_cafe_backend;
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
EOF

    ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/

    # Test nginx config
    if nginx -t; then
        systemctl reload nginx
        log_success "Nginx configured successfully"
    else
        log_error "Nginx configuration test failed"
    fi
}

##############################################################################
# Setup Backups
##############################################################################

setup_backups() {
    log_info "Setting up automated backups..."

    BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"
    BACKUP_DIR="/var/backups/cyber-cafe-timer"

    mkdir -p "$BACKUP_DIR"
    chown cyber-cafe:cyber-cafe "$BACKUP_DIR"

    cat > "$BACKUP_SCRIPT" << 'EOF'
#!/bin/bash
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="/var/backups/cyber-cafe-timer"
RETENTION_DAYS=30

# Create backup
mysqldump -u cafe_app -p${DB_PASSWORD} cyber_cafe_timer | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

# Clean old backups
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
EOF

    chmod 755 "$BACKUP_SCRIPT"

    # Add crontab entry
    if [ "$EUID" -eq 0 ]; then
        log_info "Adding cron job for daily backups..."
        (crontab -l 2>/dev/null | grep -v "cyber-cafe-timer"; echo "0 2 * * * $BACKUP_SCRIPT") | crontab -
        log_success "Backup cron job added (runs daily at 2 AM)"
    fi
}

##############################################################################
# Health Check
##############################################################################

health_check() {
    log_info "Running health checks..."

    # Check if dist is built
    if [ ! -f "$SCRIPT_DIR/dist/index.js" ]; then
        log_error "Application not built. Run 'pnpm build' first."
        return 1
    fi

    # Check environment file
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        log_error ".env file not found"
        return 1
    fi

    # Try to start application temporarily
    log_info "Testing application startup (10 second timeout)..."
    timeout 10 node "$SCRIPT_DIR/dist/index.js" &
    PID=$!

    sleep 3

    if ps -p $PID > /dev/null; then
        log_success "Application started successfully"
        kill $PID 2>/dev/null || true
        return 0
    else
        log_error "Application failed to start"
        return 1
    fi
}

##############################################################################
# Main Setup Flow
##############################################################################

main() {
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║    Cyber Café Timer - Deployment Setup Script              ║"
    echo "║    Environment: $ENVIRONMENT"
    echo "║    $(date)"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo

    > "$LOG_FILE"  # Clear log file

    preflight_checks
    install_dependencies
    setup_environment
    build_application
    
    # Database setup requires manual input
    read -p "Do you want to setup the database now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_database
    fi

    # Root required for systemd and nginx
    if [ "$EUID" -eq 0 ]; then
        setup_systemd_service
        setup_nginx
        setup_backups
    else
        log_warning "Run with sudo to setup systemd service, nginx, and backups"
        log_info "Command: sudo -E bash $0 $ENVIRONMENT"
    fi

    if health_check; then
        log_success "✓ All setup steps completed successfully!"
        echo
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║                 Next Steps:                                 ║"
        echo "╠════════════════════════════════════════════════════════════╣"
        echo "║ 1. Review .env file and adjust settings                    ║"
        echo "║ 2. Start service: sudo systemctl start cyber-cafe-timer    ║"
        echo "║ 3. Check status: sudo systemctl status cyber-cafe-timer    ║"
        echo "║ 4. View logs: sudo journalctl -u cyber-cafe-timer -f       ║"
        echo "║ 5. Access admin: http://localhost:3000/admin              ║"
        echo "╚════════════════════════════════════════════════════════════╝"
    else
        log_error "✗ Setup validation failed. Check $LOG_FILE for details"
        exit 1
    fi
}

# Run main function
main "$@"
