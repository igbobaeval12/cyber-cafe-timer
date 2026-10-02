# Cyber Café Timer - Windows Quick Start (5 Minutes)

## Super Quick Setup for Windows + XAMPP

### Prerequisites
- Windows 10/11
- XAMPP installed
- Node.js installed
- Project extracted to `C:\cyber_cafe_timer` (adjust path as needed)

## Step 1: Open Command Prompt

Press `Win+R`, type `cmd`, press Enter

## Step 2: Navigate to Project

```cmd
cd C:\cyber_cafe_timer
```

## Step 3: Install Dependencies (First Time Only)

```cmd
pnpm install
```

Wait for completion (5-10 minutes first time).

## Step 4: Start XAMPP MySQL

1. Open XAMPP Control Panel
2. Click "Start" next to MySQL
3. Wait for green indicator

## Step 5: Create Database (First Time Only)

In Command Prompt:

```cmd
cd C:\xampp\mysql\bin
mysql -u root
```

Then paste this:

```sql
CREATE DATABASE cyber_cafe_timer;
USE cyber_cafe_timer;
EXIT;
```

## Step 6: Setup Environment File (First Time Only)

1. In project folder, create file `.env`
2. Copy this content:

```env
DATABASE_URL=mysql://root:@localhost:3306/cyber_cafe_timer
NODE_ENV=development
PORT=3000
JWT_SECRET=local-dev-secret-key-change-in-production
VITE_APP_ID=local-test
OAUTH_SERVER_URL=http://localhost:3000
VITE_OAUTH_PORTAL_URL=http://localhost:3000
OWNER_NAME=Admin
OWNER_OPEN_ID=admin-local
BUILT_IN_FORGE_API_URL=http://localhost:3000
BUILT_IN_FORGE_API_KEY=local-test-key
VITE_FRONTEND_FORGE_API_URL=http://localhost:3000
VITE_FRONTEND_FORGE_API_KEY=local-test-key
VITE_ANALYTICS_ENDPOINT=http://localhost:3000
VITE_ANALYTICS_WEBSITE_ID=local-test
```

3. Save file

## Step 7: Apply Database Migrations (First Time Only)

In Command Prompt:

```cmd
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

## Step 8: Build Project (First Time Only)

```cmd
pnpm build
```

## Step 9: Start Server

```cmd
pnpm dev
```

**Wait for message:** `Server running on http://localhost:3000/`

## Step 10: Access System

### Admin Dashboard
Open browser: `http://localhost:3000/admin`

### Client Interface (Local)
Open browser: `http://localhost:3000/client`

## Step 11: Get Server IP for Client Machines

In new Command Prompt window:

```cmd
ipconfig
```

Look for **IPv4 Address** (e.g., `192.168.1.100`)

## Step 12: Connect Client Machines

On each client machine, open browser and go to:

```
http://YOUR_SERVER_IP:3000/client
```

Replace `YOUR_SERVER_IP` with the IP from Step 11.

## Done! 🎉

Your system is running. You should see:
- ✓ Admin dashboard at `http://localhost:3000/admin`
- ✓ Client interface at `http://localhost:3000/client`
- ✓ Connected client machines in admin dashboard

## Daily Startup (After First Time)

1. **Start XAMPP MySQL** - Click "Start" in XAMPP Control Panel
2. **Start Server** - In Command Prompt, run: `pnpm dev`
3. **Access Admin** - Open browser to `http://localhost:3000/admin`
4. **Connect Clients** - On each client, go to `http://SERVER_IP:3000/client`

## Shutdown

1. Press `Ctrl+C` in server Command Prompt
2. Stop MySQL in XAMPP Control Panel

## Troubleshooting

| Problem | Solution |
|---------|----------|
| MySQL won't start | Open XAMPP, click Start next to MySQL |
| Port 3000 in use | Close other apps, or use different port |
| Can't connect from client | Check firewall, verify server IP with `ipconfig` |
| Database error | Run migrations again: `pnpm drizzle-kit migrate` |
| pnpm not found | Run: `npm install -g pnpm` |

## Next Steps

1. Configure pricing plans in admin dashboard
2. Add users and set membership tiers
3. Test timer on client machines
4. Configure system settings
5. Set up backups

See **XAMPP_SETUP_WINDOWS.md** for detailed setup and troubleshooting.
