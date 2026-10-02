# Cyber Café Timer - Admin User Manual

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [PC Management](#pc-management)
4. [Session Control](#session-control)
5. [Pricing Management](#pricing-management)
6. [User Management](#user-management)
7. [Reports & Analytics](#reports--analytics)
8. [Receipt Management](#receipt-management)
9. [System Settings](#system-settings)
10. [Best Practices](#best-practices)

## Getting Started

### Logging In

1. Open your web browser
2. Navigate to `http://server-ip:3000/admin`
3. Enter your admin credentials
4. Click "Sign In"

### Dashboard Overview

The admin dashboard provides a comprehensive view of your café operations:

- **Online PCs**: Number of computers currently connected
- **Active Sessions**: Number of ongoing rental sessions
- **Today's Earnings**: Total revenue for the current day
- **Connection Status**: Real-time server connection indicator

## Dashboard Overview

### Main Navigation

The dashboard includes four main sections:

#### 1. PC Monitoring
- View all connected computers
- See real-time status (Online, Offline, Maintenance)
- Monitor active sessions per PC
- View remaining time and cost for each session
- Quick access to session controls

#### 2. Active Sessions
- List of all ongoing sessions
- Session details and timers
- User information
- Quick actions (pause, resume, stop)

#### 3. Settings
- Hourly rate configuration
- System preferences
- Admin password management
- Notification settings

## PC Management

### Registering Computers

1. **Automatic Registration**
   - When a client PC first connects, it auto-registers
   - Appears in PC Monitoring grid
   - Status shows as "Online"

2. **Manual Registration** (if needed)
   - Go to PC Monitoring
   - Click "Add PC"
   - Enter PC name and IP address
   - Save

### Monitoring PC Status

**Status Indicators:**
- **Online (Green)**: PC is connected and ready
- **Offline (Gray)**: PC is not connected
- **Maintenance (Yellow)**: PC is temporarily disabled

### PC Actions

**From PC Card:**
- **View Details**: See full PC information
- **Pause Session**: Temporarily stop the timer
- **Stop Session**: End the current session
- **Restart PC**: Remote restart (if configured)
- **Shutdown PC**: Remote shutdown (if configured)

## Session Control

### Starting a Session

1. Click on a PC in the monitoring grid
2. Click "Start Session"
3. Select user (or create new)
4. Choose pricing plan
5. Set duration (optional) or leave unlimited
6. Click "Start"

### Session Management

**Pause Session**
- Temporarily stops the timer
- Cost accumulation pauses
- User can resume later
- Useful for breaks

**Resume Session**
- Resumes a paused session
- Timer continues from where it paused
- Cost accumulation resumes

**Stop Session**
- Ends the current session
- Generates receipt
- Records transaction
- Frees up the PC

### Session Monitoring

**Real-time Information:**
- Elapsed time
- Remaining time (if limited)
- Current cost
- Hourly rate
- User information

**Session History**
- View past sessions
- Filter by date, PC, or user
- Export session data
- Print receipts

## Pricing Management

### Creating Pricing Plans

1. Go to Pricing Management
2. Click "Add Pricing Plan"
3. Enter plan details:
   - **Plan Name**: e.g., "Standard", "Premium"
   - **Hourly Rate**: Cost per hour (e.g., $3.00)
   - **Minimum Charge**: Minimum cost per session
   - **Discount**: Optional percentage discount
4. Click "Save Plan"

### Managing Plans

**Activate Plan**
- Click on a plan to make it active
- Only one plan can be active at a time
- Active plan is used for new sessions

**Edit Plan**
- Click "Edit" on a plan
- Modify settings
- Click "Save"

**Delete Plan**
- Click "Delete" on a plan
- Confirm deletion
- Cannot delete active plan

### Pricing Examples

**Example 1: Standard Rate**
- Hourly Rate: $3.00
- Minimum Charge: $1.00
- Discount: 0%
- 30 min session = $1.50

**Example 2: Premium Rate**
- Hourly Rate: $5.00
- Minimum Charge: $2.00
- Discount: 10%
- 30 min session = $2.25 (after 10% discount)

## User Management

### Creating User Accounts

1. Go to User Management
2. Click "Add User"
3. Enter user details:
   - **Full Name**: Customer name
   - **Email**: Contact email
   - **Phone Number**: Contact phone
   - **Membership Tier**: None, Basic, Premium, VIP
   - **Prepaid Balance**: Initial balance
4. Click "Create Account"

### User Information

**User Card Shows:**
- Name and contact info
- Membership tier
- Prepaid balance
- Total spent
- Number of sessions
- Member since date

### User Actions

**Add Balance**
- Click "Add Balance"
- Enter amount
- Select payment method
- Confirm

**Edit User**
- Click "Edit"
- Modify user information
- Click "Save"

**Delete User**
- Click "Delete"
- Confirm deletion
- User history is preserved

### Membership Tiers

**None**: Regular customers, no special benefits

**Basic**: 
- 5% discount on sessions
- Monthly usage report

**Premium**:
- 10% discount on sessions
- Priority support
- Monthly usage report
- Birthday bonus credit

**VIP**:
- 15% discount on sessions
- Priority support
- Monthly usage report
- Birthday bonus credit
- Dedicated account manager

## Reports & Analytics

### Session History

1. Go to Session History
2. Use filters to narrow results:
   - **Date**: Select specific date
   - **PC Name**: Filter by computer
   - **User**: Filter by customer

3. View session details:
   - PC name
   - Start time
   - Duration
   - Cost
   - Payment method
   - Status

### Exporting Data

1. Apply filters as needed
2. Click "Export"
3. Choose format:
   - CSV (spreadsheet)
   - PDF (report)
   - Excel (workbook)
4. Download file

### Daily Reports

**Available Metrics:**
- Total sessions
- Total revenue
- Average session duration
- Average cost per session
- Most used PC
- Peak hours
- User statistics

### Generating Reports

1. Go to Reports section
2. Select date range
3. Choose report type
4. Click "Generate"
5. Download or print

## Receipt Management

### Viewing Receipts

1. Go to Receipt Generator
2. View recent sessions
3. Click on a session to see receipt

### Receipt Information

**Receipt Contains:**
- Receipt number
- PC name
- Session start/end time
- Duration
- Hourly rate
- Session cost
- Print cost (if applicable)
- Total cost
- Payment method
- Timestamp

### Printing Receipts

1. Select session from recent list
2. Click "Print"
3. Choose printer
4. Click "Print" to confirm

### Downloading Receipts

1. Select session
2. Click "Download PDF"
3. File saves to Downloads folder
4. Can be emailed or archived

## System Settings

### General Settings

**Café Information**
- Café name
- Address
- Phone number
- Email address
- Website (optional)

### Security Settings

**Change Admin Password**
1. Go to Settings > Security
2. Enter current password
3. Enter new password
4. Confirm new password
5. Click "Update Password"

**Password Requirements**
- Minimum 12 characters
- Mix of uppercase and lowercase
- Include numbers and symbols
- Not same as previous 5 passwords

**Two-Factor Authentication**
- Click "Enable" to activate
- Follow setup instructions
- Scan QR code with authenticator app
- Enter verification code

### Notification Settings

**Enable/Disable Notifications for:**
- Session expiry alerts
- PC offline alerts
- Payment failed alerts
- Daily earnings reports
- Low balance warnings

### Localization

**Language**
- English
- Spanish
- French
- Chinese
- Change takes effect immediately

**Timezone**
- Select your timezone
- Affects all timestamps
- Important for reports

**Currency**
- USD ($)
- EUR (€)
- GBP (£)
- JPY (¥)
- CNY (¥)
- Used for all pricing

## Best Practices

### Daily Operations

1. **Start of Day**
   - Check dashboard for overnight issues
   - Verify all PCs are online
   - Review overnight transactions

2. **During Operation**
   - Monitor active sessions
   - Watch for offline PCs
   - Address connection issues promptly
   - Assist customers with issues

3. **End of Day**
   - Generate daily report
   - Verify all sessions closed
   - Check total earnings
   - Backup data

### Session Management

**Best Practices:**
- Always start sessions before PC use
- Pause sessions for breaks
- Stop sessions promptly when done
- Generate receipts for all sessions
- Keep session records for accounting

### Pricing Strategy

**Recommendations:**
- Review competitor pricing monthly
- Adjust rates based on demand
- Offer discounts during off-peak hours
- Create membership tiers for regular customers
- Consider seasonal pricing adjustments

### User Management

**Best Practices:**
- Verify user information
- Keep contact details updated
- Monitor prepaid balances
- Encourage membership enrollment
- Maintain user privacy

### Security

**Important:**
- Change admin password regularly
- Enable two-factor authentication
- Monitor audit logs
- Restrict admin access to authorized personnel
- Regular backups of data
- Keep system updated

### Troubleshooting

**PC Not Appearing**
- Check network connection
- Verify PC can access server
- Restart PC browser
- Check firewall rules

**Session Not Starting**
- Verify PC is online
- Check pricing is configured
- Ensure user has sufficient balance
- Review error message in logs

**Timer Not Updating**
- Check network connectivity
- Verify WebSocket connection
- Refresh browser
- Check server logs

## Support

For additional help:
- Check system logs
- Review troubleshooting guide
- Contact technical support
- Check documentation

## Tips & Tricks

### Keyboard Shortcuts
- `Ctrl+S`: Save changes
- `Ctrl+P`: Print
- `Ctrl+E`: Export
- `F5`: Refresh dashboard

### Quick Actions
- Click PC card to expand details
- Double-click session to edit
- Right-click for context menu
- Drag to reorder (if enabled)

### Performance Tips
- Close unused browser tabs
- Clear cache regularly
- Update browser
- Use wired network connection
- Restart server weekly

---

**Need help?** Refer to the main documentation or contact support.
