# Real-Time Notification System Documentation

## Overview

The Cyber Café Timer includes a comprehensive real-time notification system that alerts administrators when client PC sessions expire, time is running out, or other important events occur.

## Architecture

### Database Schema

#### `notifications` Table
Stores all notification events with the following fields:
- `id` - Unique notification ID
- `userId` - User receiving the notification
- `sessionId` - Associated session (if applicable)
- `computerId` - Associated PC (if applicable)
- `notificationType` - Type of notification (session_expired, time_warning, pc_offline, payment_failed, low_balance, system_alert, maintenance_alert)
- `title` - Notification title
- `message` - Notification message
- `severity` - Alert level (info, warning, error, critical)
- `isRead` - Whether notification has been read
- `actionUrl` - Optional URL for action
- `soundAlert` - Whether to play sound
- `pushNotification` - Whether to send push notification
- `emailNotification` - Whether to send email
- `createdAt` - Timestamp
- `readAt` - When notification was read

#### `notificationPreferences` Table
Stores user notification preferences:
- `userId` - User ID
- `enableSessionExpired` - Enable session expiry alerts
- `enableTimeWarning` - Enable time warning alerts
- `enablePcOffline` - Enable PC offline alerts
- `enablePaymentFailed` - Enable payment failure alerts
- `enableLowBalance` - Enable low balance alerts
- `enableSystemAlert` - Enable system alerts
- `enableSoundAlerts` - Enable sound alerts globally
- `enablePushNotifications` - Enable push notifications globally
- `enableEmailNotifications` - Enable email notifications globally
- `timeWarningMinutes` - Minutes before expiry to warn (default: 5)

## Backend Components

### NotificationService (`server/notificationService.ts`)

Centralized service for creating and managing notifications:

```typescript
// Send session expiry notification
await NotificationService.notifySessionExpired(
  userId,
  computerId,
  sessionId,
  pcName
);

// Send time warning notification
await NotificationService.notifyTimeWarning(
  userId,
  computerId,
  sessionId,
  pcName,
  minutesRemaining
);

// Send PC offline notification
await NotificationService.notifyPcOffline(userId, computerId, pcName);

// Send payment failed notification
await NotificationService.notifyPaymentFailed(userId, sessionId, reason);

// Send low balance notification
await NotificationService.notifyLowBalance(userId, currentBalance);

// Send system alert
await NotificationService.notifySystemAlert(userId, title, message);

// Send maintenance alert
await NotificationService.notifyMaintenanceAlert(
  userId,
  computerId,
  pcName,
  reason
);
```

### Database Helpers (`server/db.ts`)

Query functions for notification management:

```typescript
// Create notification
await createNotification(notification);

// Get unread notifications for user
const unread = await getUnreadNotifications(userId);

// Get all notifications for user
const all = await getNotificationsByUserId(userId, limit);

// Mark notification as read
await markNotificationAsRead(notificationId);

// Get user preferences
const prefs = await getNotificationPreferences(userId);

// Update user preferences
await updateNotificationPreferences(userId, preferences);
```

### tRPC Procedures (`server/routers.ts`)

API endpoints for notification management:

```typescript
// Get unread notifications
trpc.notifications.getUnread.useQuery()

// Get all notifications with limit
trpc.notifications.getAll.useQuery({ limit: 50 })

// Mark notification as read
trpc.notifications.markAsRead.useMutation()

// Get notification preferences
trpc.notifications.getPreferences.useQuery()

// Update notification preferences
trpc.notifications.updatePreferences.useMutation()
```

## Frontend Components

### NotificationCenter (`client/src/components/NotificationCenter.tsx`)

Bell icon dropdown component showing:
- Unread notification count with badge
- Notification list with severity indicators
- Toast alerts for new notifications
- Sound playback for alerts
- Mark as read functionality
- Clear all notifications

Features:
- Real-time updates via WebSocket
- Auto-refresh every 5 seconds
- Sound alerts using Web Audio API
- Color-coded severity levels
- Responsive dropdown design

### NotificationPreferences (`client/src/pages/NotificationPreferences.tsx`)

Settings page for customizing notifications:
- Enable/disable notification types
- Configure notification channels (sound, push, email)
- Set time warning threshold (1-60 minutes)
- Save/reset preferences

## Integration Points

### Session Expiry Flow

1. Session timer reaches zero on client
2. Client sends session expiry event to server
3. Server calls `NotificationService.notifySessionExpired()`
4. Notification created in database
5. WebSocket event emitted to admin
6. NotificationCenter receives event
7. Toast alert displayed
8. Sound plays (if enabled)
9. Notification appears in dropdown

### Time Warning Flow

1. Session timer reaches warning threshold (default: 5 minutes)
2. Client sends time warning event to server
3. Server calls `NotificationService.notifyTimeWarning()`
4. Notification created in database
5. WebSocket event emitted to admin
6. NotificationCenter receives event
7. Toast alert displayed
8. Sound plays (if enabled)

### PC Offline Detection

1. PC heartbeat not received within timeout
2. Server detects offline status
3. Server calls `NotificationService.notifyPcOffline()`
4. Notification created
5. Admin receives alert

## WebSocket Integration

Notifications are delivered in real-time via WebSocket:

```typescript
socket.on('notification', (data) => {
  // Notification received
  // Display toast
  // Play sound
  // Update notification list
});
```

## Email Notifications (Future)

Email notifications can be implemented by:
1. Integrating email service (SendGrid, AWS SES, etc.)
2. Implementing email sending in NotificationService
3. Checking `emailNotification` flag before sending

## Push Notifications (Future)

Browser push notifications can be implemented by:
1. Requesting notification permission
2. Registering service worker
3. Sending push notification when `pushNotification` flag is true

## Security

### User Isolation

- Users can only read their own notifications
- Users can only update their own preferences
- `markAsRead` procedure validates notification ownership
- All procedures require authentication

### Input Validation

- `timeWarningMinutes` validated to 1-60 range
- Notification types restricted to enum values
- Severity levels restricted to enum values

## Usage Examples

### Admin Dashboard Integration

```typescript
// In AdminDashboard.tsx
import NotificationCenter from '@/components/NotificationCenter';

export default function AdminDashboard() {
  return (
    <div>
      <header>
        {/* ... other header content ... */}
        <NotificationCenter />
      </header>
      {/* ... rest of dashboard ... */}
    </div>
  );
}
```

### Generating Notifications from Session Logic

```typescript
// When session expires
if (sessionExpired) {
  await NotificationService.notifySessionExpired(
    userId,
    computerId,
    sessionId,
    pcName
  );
}

// When time is running low
if (minutesRemaining === 5) {
  await NotificationService.notifyTimeWarning(
    userId,
    computerId,
    sessionId,
    pcName,
    5
  );
}
```

### Customizing Notification Preferences

```typescript
// User updates preferences
const result = await trpc.notifications.updatePreferences.mutate({
  enableSessionExpired: true,
  enableTimeWarning: true,
  enableSoundAlerts: true,
  enablePushNotifications: true,
  timeWarningMinutes: 10,
});
```

## Testing

### Manual Testing

1. **Test Notification Creation**
   - Create a session
   - Wait for expiry
   - Verify notification appears in database

2. **Test Toast Alerts**
   - Create notification
   - Verify toast appears in UI
   - Verify sound plays (if enabled)

3. **Test Preferences**
   - Update preferences
   - Disable notification type
   - Create notification of that type
   - Verify notification not created

4. **Test WebSocket Delivery**
   - Open browser console
   - Monitor WebSocket messages
   - Verify notification events received

### Unit Tests

```typescript
describe('NotificationService', () => {
  it('should create session expiry notification', async () => {
    await NotificationService.notifySessionExpired(
      userId,
      computerId,
      sessionId,
      'PC-01'
    );
    const notifs = await db.getNotificationsByUserId(userId);
    expect(notifs).toHaveLength(1);
    expect(notifs[0].notificationType).toBe('session_expired');
  });
});
```

## Troubleshooting

### Notifications Not Appearing

1. **Check preferences** - Verify notification type is enabled
2. **Check database** - Verify notification was created
3. **Check WebSocket** - Verify connection is active
4. **Check browser console** - Look for errors

### Sound Not Playing

1. **Check preferences** - Verify `enableSoundAlerts` is true
2. **Check browser** - Verify audio is not muted
3. **Check permissions** - Verify browser allows audio

### Notifications Not Persisting

1. **Check database connection** - Verify MySQL is running
2. **Check migrations** - Verify tables were created
3. **Check logs** - Look for database errors

## Performance Considerations

- Notifications are fetched every 5 seconds (configurable)
- Only unread notifications are fetched on mount
- Limit notifications to 50 per query (configurable)
- WebSocket provides real-time delivery for instant alerts
- Preferences cached in component state

## Future Enhancements

1. **Email Integration** - Send emails for critical alerts
2. **SMS Notifications** - Send SMS for urgent alerts
3. **Notification Templates** - Customizable notification messages
4. **Notification Rules** - Complex conditions for notifications
5. **Notification Analytics** - Track notification delivery and engagement
6. **Notification Scheduling** - Schedule notifications for specific times
7. **Notification Channels** - Slack, Teams, Discord integration
8. **Notification History** - Archive old notifications
