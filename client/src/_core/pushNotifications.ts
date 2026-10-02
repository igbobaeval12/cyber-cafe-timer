/**
 * Browser Push Notifications Service
 * Implements Web Notifications API with service worker support
 */

export interface PushNotificationPayload {
  title: string;
  message: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: Record<string, any>;
}

/**
 * Check if browser supports push notifications
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    console.warn('[Notifications] Push notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('[Notifications] Permission request failed:', error);
      return 'denied';
    }
  }

  return Notification.permission;
}

/**
 * Send a push notification
 */
export async function sendPushNotification(
  payload: PushNotificationPayload
): Promise<Notification | null> {
  if (!isPushNotificationSupported()) {
    console.warn('[Notifications] Push notifications not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('[Notifications] Notification permission not granted');
    return null;
  }

  try {
    const options: NotificationOptions = {
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      tag: payload.tag || 'cyber-cafe-timer',
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions || [],
      data: payload.data || {},
    };

    const notification = new Notification(payload.title, {
      body: payload.message,
      ...options,
    });

    // Log notification event
    console.log('[Notifications] Push notification sent:', {
      title: payload.title,
      message: payload.message,
      timestamp: new Date(),
    });

    return notification;
  } catch (error) {
    console.error('[Notifications] Failed to send push notification:', error);
    return null;
  }
}

/**
 * Send notification with sound alert
 */
export async function sendNotificationWithSound(
  payload: PushNotificationPayload,
  soundUrl?: string
): Promise<Notification | null> {
  // Send visual notification
  const notification = await sendPushNotification(payload);

  // Play sound if URL provided
  if (soundUrl) {
    try {
      const audio = new Audio(soundUrl);
      audio.volume = 0.7;
      await audio.play();
    } catch (error) {
      console.warn('[Notifications] Failed to play notification sound:', error);
    }
  }

  return notification;
}

/**
 * Send session expiry notification
 */
export async function notifySessionExpired(
  computerId: number,
  sessionId: number
): Promise<Notification | null> {
  return sendNotificationWithSound(
    {
      title: '⏰ Session Expired',
      message: 'Your session time has ended. Please contact staff.',
      tag: `session-expired-${sessionId}`,
      requireInteraction: true,
      data: {
        type: 'session_expired',
        sessionId,
        computerId,
      },
    },
    '/sounds/notification-alert.mp3'
  );
}

/**
 * Send time warning notification
 */
export async function notifyTimeWarning(
  computerId: number,
  sessionId: number,
  remainingMinutes: number
): Promise<Notification | null> {
  return sendNotificationWithSound(
    {
      title: '⏱️ Time Warning',
      message: `Only ${remainingMinutes} minutes remaining on your session.`,
      tag: `time-warning-${sessionId}`,
      data: {
        type: 'time_warning',
        sessionId,
        computerId,
        remainingMinutes,
      },
    },
    '/sounds/notification-alert.mp3'
  );
}

/**
 * Send payment notification
 */
export async function notifyPayment(
  sessionId: number,
  totalCost: number,
  message: string
): Promise<Notification | null> {
  return sendPushNotification({
    title: '💳 Payment',
    message,
    tag: `payment-${sessionId}`,
    data: {
      type: 'payment',
      sessionId,
      totalCost,
    },
  });
}

/**
 * Send system maintenance notification
 */
export async function notifySystemMaintenance(message: string): Promise<Notification | null> {
  return sendPushNotification({
    title: '⚙️ System Maintenance',
    message,
    tag: 'system-maintenance',
    requireInteraction: true,
    data: {
      type: 'system_alert',
    },
  });
}

/**
 * Register notification click handler
 */
export function registerNotificationClickHandler(
  callback: (notification: Notification, action?: string) => void
): void {
  if (!isPushNotificationSupported()) return;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'notification-click') {
        callback(event.data.notification, event.data.action);
      }
    });
  }

  // Also listen for direct click events
  Notification.addEventListener('click', (event) => {
    callback(event.notification as any);
  });
}

/**
 * Close all notifications of a specific type
 */
export function closeNotificationsByTag(tag: string): void {
  if (!isPushNotificationSupported()) return;

  if ('serviceWorker' in navigator && 'getNotifications' in ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.getNotifications({ tag }).then((notifications) => {
          notifications.forEach((notification) => {
            notification.close();
          });
        });
      });
    });
  }
}

/**
 * Register service worker for background notifications
 */
export async function registerServiceWorker(swPath: string = '/sw.js'): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Notifications] Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(swPath);
    console.log('[Notifications] Service Worker registered');
    return registration;
  } catch (error) {
    console.error('[Notifications] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Initialize notification system
 */
export async function initializeNotificationSystem(): Promise<void> {
  if (!isPushNotificationSupported()) {
    console.warn('[Notifications] Push notifications not supported in this browser');
    return;
  }

  // Register service worker if available
  await registerServiceWorker();

  // Request permission if not already granted or denied
  if (Notification.permission === 'default') {
    await requestNotificationPermission();
  }

  // Register notification click handler
  registerNotificationClickHandler((notification, action) => {
    console.log('[Notifications] Notification clicked:', {
      title: notification.title,
      action,
      data: (notification as any).data,
    });

    // Handle notification click based on data
    const data = (notification as any).data;
    if (data.type === 'session_expired') {
      // Show session expired dialog
    }
  });

  console.log('[Notifications] Notification system initialized');
}
