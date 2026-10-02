# Cyber Café Timer - Client Machine Setup Guide

## Overview

This guide walks through setting up client machines to connect to the Cyber Café Timer system. Client machines display the countdown timer and session information for café customers.

## Quick Start

### Minimum Requirements

- **Operating System**: Windows 7+, macOS 10.12+, or Linux
- **Browser**: Chrome, Firefox, Safari, or Edge (modern versions)
- **Network**: Connected to same local network as server
- **RAM**: 1GB minimum
- **Display**: Any resolution (responsive design)

### Basic Setup (5 minutes)

1. **Open Web Browser**
   - Chrome, Firefox, Safari, or Edge
   - Recommended: Chrome for best compatibility

2. **Navigate to Client Interface**
   - Enter URL: `http://server-ip:3000/client`
   - Replace `server-ip` with actual server IP address
   - Example: `http://192.168.1.100:3000/client`

3. **First Connection**
   - Page will load with "Waiting for Session" message
   - PC automatically registers with server
   - Connection status shows at bottom

4. **Done!**
   - Client is ready to use
   - Admin can start sessions from dashboard

## Detailed Setup

### Finding Server IP Address

**From Server Machine (Linux/macOS):**
```bash
# Display IP address
ifconfig
# Look for inet address (e.g., 192.168.1.100)

# Or use hostname
hostname -I
```

**From Server Machine (Windows):**
```cmd
# Open Command Prompt
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)
```

**From Client Machine:**
```bash
# Ping server to verify connectivity
ping server-ip

# If successful, you can access the client interface
```

### Browser Configuration

#### Chrome/Chromium

1. **Open Chrome**
2. Click address bar
3. Enter: `http://server-ip:3000/client`
4. Press Enter

**Recommended Settings:**
- Disable extensions (for stability)
- Clear cache regularly (Ctrl+Shift+Delete)
- Enable fullscreen mode (F11)

#### Firefox

1. **Open Firefox**
2. Click address bar
3. Enter: `http://server-ip:3000/client`
4. Press Enter

**Recommended Settings:**
- Disable add-ons
- Enable fullscreen (F11)
- Configure auto-refresh if needed

#### Safari (macOS)

1. **Open Safari**
2. Click address bar
3. Enter: `http://server-ip:3000/client`
4. Press Enter

**Recommended Settings:**
- Disable extensions
- Enable fullscreen (Control+Command+F)
- Allow notifications

#### Edge (Windows)

1. **Open Edge**
2. Click address bar
3. Enter: `http://server-ip:3000/client`
4. Press Enter

**Recommended Settings:**
- Disable extensions
- Enable fullscreen (F11)
- Configure startup page

### Kiosk Mode Setup

For dedicated client machines, set up kiosk mode to lock down the browser.

#### Windows Kiosk Mode

**Using Batch File:**

Create file `start_client.bat`:
```batch
@echo off
REM Start Chrome in kiosk mode
start chrome.exe --kiosk http://192.168.1.100:3000/client

REM Optional: Disable task manager
REM reg add HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System /v DisableTaskMgr /t REG_DWORD /d 1

REM Optional: Disable Alt+Tab
REM reg add HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System /v DisableAltTab /t REG_DWORD /d 1
```

**Using Group Policy (Enterprise):**

1. Press `Win+R`
2. Type `gpedit.msc`
3. Navigate to: Computer Configuration > Administrative Templates > Windows Components > App runtime
4. Set "Allow Microsoft Edge to start and load the Start and New Tab page at Windows startup"
5. Configure Edge to open in kiosk mode

#### macOS Kiosk Mode

Create shell script `start_client.sh`:
```bash
#!/bin/bash

# Start Safari in full screen
open -a Safari --args --kiosk "http://192.168.1.100:3000/client"

# Or use Chrome
# open -a "Google Chrome" --args --kiosk "http://192.168.1.100:3000/client"
```

Make executable:
```bash
chmod +x start_client.sh
```

#### Linux Kiosk Mode

Create shell script `start_client.sh`:
```bash
#!/bin/bash

# Start Chromium in kiosk mode
chromium --kiosk http://192.168.1.100:3000/client

# Or use Firefox
# firefox --kiosk http://192.168.1.100:3000/client
```

Make executable:
```bash
chmod +x start_client.sh
```

### Auto-start Configuration

#### Windows Auto-start

1. **Create Batch File**
   - Save as `start_client.bat` (see above)

2. **Add to Startup**
   - Press `Win+R`
   - Type: `shell:startup`
   - Copy `start_client.bat` to this folder

3. **Test**
   - Restart computer
   - Browser should open automatically

#### macOS Auto-start

1. **Create Launch Agent**
   - Create file: `~/Library/LaunchAgents/com.cybercafe.client.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cybercafe.client</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/start_client.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

2. **Enable**
   ```bash
   launchctl load ~/Library/LaunchAgents/com.cybercafe.client.plist
   ```

#### Linux Auto-start

1. **Create Desktop Entry**
   - Create file: `~/.config/autostart/cybercafe-client.desktop`

```ini
[Desktop Entry]
Type=Application
Name=Cyber Café Client
Exec=/path/to/start_client.sh
AutoStart=true
X-GNOME-Autostart-enabled=true
```

2. **Make Executable**
   ```bash
   chmod +x ~/.config/autostart/cybercafe-client.desktop
   ```

## Client Interface Usage

### Timer Display

The client interface shows:

- **Large Countdown Timer**: Main display showing remaining time
- **Total Cost**: Current session cost
- **Status Indicator**: Active/Paused status
- **PC Information**: PC name and session ID

### Session States

**Waiting for Session**
- No active session
- Shows "Waiting for Session" message
- PC is ready for use

**Active Session**
- Timer is counting down
- Cost is accumulating
- Status shows "Active"
- Session information visible

**Paused Session**
- Timer is paused
- Cost accumulation stopped
- Status shows "Paused"
- Can be resumed by admin

**Session Expired**
- Time has run out
- Timer shows 00:00
- Message displays "Session Expired"
- PC is locked/unavailable

### Alerts

**5-Minute Warning**
- Appears when 5 minutes remain
- Yellow alert box
- Notifies user time is running out

**Session Expiration**
- Appears when time expires
- Red alert box
- Session is terminated

## Troubleshooting

### Connection Issues

**Problem: Cannot Access Client Interface**

1. **Check Network Connection**
   ```bash
   ping server-ip
   ```
   - If fails, check network cable or WiFi
   - Verify both machines on same network

2. **Verify Server IP**
   - Ask admin for correct server IP
   - Check server is running
   - Verify firewall allows port 3000

3. **Try Alternative Access**
   - Use server hostname instead of IP
   - Example: `http://cybercafe-server:3000/client`

**Problem: Page Loads But No Timer Shows**

1. Clear browser cache
   - Chrome: Ctrl+Shift+Delete
   - Firefox: Ctrl+Shift+Delete
   - Safari: Develop > Empty Caches

2. Refresh page
   - Press F5 or Ctrl+R

3. Try different browser
   - Switch to Chrome if using Firefox
   - Check browser compatibility

4. Check browser console for errors
   - Press F12
   - Look for error messages
   - Report to admin

### Performance Issues

**Problem: Timer Updates Slowly**

1. **Check Network Speed**
   - Run speed test
   - Verify connection quality
   - Move closer to WiFi router

2. **Reduce Browser Load**
   - Close other browser tabs
   - Disable extensions
   - Clear cache

3. **Restart Browser**
   - Close completely
   - Reopen
   - Reconnect to client interface

**Problem: Browser Crashes**

1. **Update Browser**
   - Check for updates
   - Install latest version

2. **Disable Extensions**
   - Go to extensions settings
   - Disable all extensions
   - Restart browser

3. **Clear Cache**
   - Clear browsing data
   - Clear cookies
   - Restart browser

### Display Issues

**Problem: Timer Text Too Small**

1. **Zoom In**
   - Chrome: Ctrl+Plus
   - Firefox: Ctrl+Plus
   - Safari: Cmd+Plus

2. **Fullscreen Mode**
   - Press F11
   - Maximizes display area

3. **Adjust Display Settings**
   - Increase monitor resolution
   - Adjust font size in OS settings

**Problem: Colors Not Displaying Correctly**

1. **Check Monitor**
   - Verify monitor is on
   - Adjust brightness/contrast
   - Check cable connection

2. **Update Graphics Driver**
   - Windows: Device Manager > Display adapters
   - macOS: System Preferences > Displays
   - Linux: Graphics driver settings

## Advanced Configuration

### Custom Server URL

Store server URL in browser:
```javascript
// Open browser console (F12)
localStorage.setItem('serverUrl', 'http://192.168.1.100:3000');
```

### Language Selection

Change interface language:
```javascript
// Open browser console (F12)
localStorage.setItem('language', 'es');  // Spanish
localStorage.setItem('language', 'fr');  // French
localStorage.setItem('language', 'zh');  // Chinese
localStorage.setItem('language', 'en');  // English
```

### PC Name Configuration

Set custom PC name:
```javascript
// Open browser console (F12)
localStorage.setItem('pcName', 'PC-01');
```

## Security Considerations

### Kiosk Mode Benefits

- Prevents users from accessing other applications
- Locks down browser functionality
- Prevents accidental system changes
- Improves security and stability

### Disabling System Functions

**Disable Task Manager (Windows)**
```batch
reg add HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System /v DisableTaskMgr /t REG_DWORD /d 1
```

**Disable Alt+Tab (Windows)**
```batch
reg add HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System /v DisableAltTab /t REG_DWORD /d 1
```

**Disable Command Prompt (Windows)**
```batch
reg add HKCU\Software\Policies\Microsoft\Windows\System /v DisableCMD /t REG_DWORD /d 1
```

### Network Security

- Use HTTPS if available
- Restrict network access
- Use VPN for remote connections
- Monitor network traffic

## Maintenance

### Regular Tasks

**Daily**
- Check browser is running
- Verify timer updates
- Monitor for errors

**Weekly**
- Clear browser cache
- Check for browser updates
- Test connection speed

**Monthly**
- Update operating system
- Update browser
- Review security settings

### Backup Configuration

Save client settings:
```bash
# Export localStorage
# Use browser developer tools to backup settings
```

## Support

### Getting Help

1. **Check This Guide**
   - Review troubleshooting section
   - Try suggested solutions

2. **Contact Admin**
   - Report issues to café admin
   - Provide error messages
   - Describe what happened

3. **System Logs**
   - Admin can check server logs
   - Browser console shows errors (F12)
   - Network tab shows connection issues

## Tips & Tricks

### Keyboard Shortcuts

- `F11`: Fullscreen mode
- `Ctrl+Plus`: Zoom in
- `Ctrl+Minus`: Zoom out
- `F5`: Refresh page
- `Ctrl+Shift+Delete`: Clear cache

### Performance Tips

- Use wired Ethernet connection (faster than WiFi)
- Close unnecessary applications
- Disable browser extensions
- Keep browser updated
- Restart computer weekly

### Accessibility

- Increase font size for readability
- Use high contrast mode
- Enable screen reader support
- Adjust color settings

---

**Need help?** Contact your café administrator or refer to the main documentation.
