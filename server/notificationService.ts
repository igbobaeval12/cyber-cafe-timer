import { InsertNotification } from "../drizzle/schema";
import { logger } from "./_core/logger";
import {
  createNotification,
  getNotificationPreferences,
  getUnreadNotifications,
} from "./db";

export type NotificationType =
  | "session_expired"
  | "time_warning"
  | "pc_offline"
  | "payment_failed"
  | "low_balance"
  | "system_alert"
  | "maintenance_alert";

export type NotificationSeverity = "info" | "warning" | "error" | "critical";

interface NotificationPayload {
  userId: number;
  sessionId?: number;
  computerId?: number;
  notificationType: NotificationType;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  actionUrl?: string;
  soundAlert?: boolean;
  pushNotification?: boolean;
  emailNotification?: boolean;
}

/**
 * Notification Service
 * Handles creation and delivery of notifications to users
 */
export class NotificationService {
  /**
   * Create and send a notification
   */
  static async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Get user's notification preferences
      const preferences = await getNotificationPreferences(payload.userId);

      // Check if this type of notification is enabled
      if (!this.isNotificationTypeEnabled(payload.notificationType, preferences)) {
        logger.info(
          `[NotificationService] Notification type ${payload.notificationType} disabled for user ${payload.userId}`
        );
        return;
      }

      // Determine notification channels based on preferences and payload
      const shouldPlaySound =
        (payload.soundAlert ?? true) && (preferences?.enableSoundAlerts ?? true);
      const shouldPushNotify =
        (payload.pushNotification ?? true) &&
        (preferences?.enablePushNotifications ?? true);
      const shouldEmailNotify =
        (payload.emailNotification ?? false) &&
        (preferences?.enableEmailNotifications ?? false);

      // Create notification record
      const notification: InsertNotification = {
        userId: payload.userId,
        sessionId: payload.sessionId,
        computerId: payload.computerId,
        notificationType: payload.notificationType,
        title: payload.title,
        message: payload.message,
        severity: payload.severity ?? "info",
        actionUrl: payload.actionUrl,
        soundAlert: shouldPlaySound,
        pushNotification: shouldPushNotify,
        emailNotification: shouldEmailNotify,
        isRead: false,
      };

      // Save to database
      await createNotification(notification);

      // Emit WebSocket event for real-time delivery
      await this.emitWebSocketEvent(payload.userId, {
        type: "notification",
        data: notification,
      });

      // TODO: Implement push notifications
      if (shouldPushNotify) {
        // Browser push notification logic
      }

      // TODO: Implement email notifications
      if (shouldEmailNotify) {
        // Email notification logic
      }

      logger.info("notification_service_notification_sent", { userId: payload.userId, title: payload.title, type: payload.notificationType });
    } catch (error) {
      logger.error("notification_service_send_failed", { userId: payload.userId, err: error });
      throw error;
    }
  }

  /**
   * Send session expiry notification
   */
  static async notifySessionExpired(
    userId: number,
    computerId: number,
    sessionId: number,
    pcName: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      computerId,
      sessionId,
      notificationType: "session_expired",
      title: "Session Expired",
      message: `Your session on ${pcName} has expired.`,
      severity: "warning",
      soundAlert: true,
      pushNotification: true,
    });
  }

  /**
   * Send time warning notification (e.g., 5 minutes remaining)
   */
  static async notifyTimeWarning(
    userId: number,
    computerId: number,
    sessionId: number,
    pcName: string,
    minutesRemaining: number
  ): Promise<void> {
    await this.sendNotification({
      userId,
      computerId,
      sessionId,
      notificationType: "time_warning",
      title: "Time Running Out",
      message: `${minutesRemaining} minutes remaining on ${pcName}.`,
      severity: "warning",
      soundAlert: true,
      pushNotification: true,
    });
  }

  /**
   * Send PC offline notification
   */
  static async notifyPcOffline(
    userId: number,
    computerId: number,
    pcName: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      computerId,
      notificationType: "pc_offline",
      title: "PC Offline",
      message: `${pcName} has gone offline.`,
      severity: "error",
      soundAlert: true,
      pushNotification: true,
    });
  }

  /**
   * Send payment failed notification
   */
  static async notifyPaymentFailed(
    userId: number,
    sessionId: number,
    reason: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      sessionId,
      notificationType: "payment_failed",
      title: "Payment Failed",
      message: `Payment processing failed: ${reason}`,
      severity: "error",
      soundAlert: true,
      pushNotification: true,
    });
  }

  /**
   * Send low balance notification
   */
  static async notifyLowBalance(
    userId: number,
    currentBalance: number
  ): Promise<void> {
    await this.sendNotification({
      userId,
      notificationType: "low_balance",
      title: "Low Prepaid Balance",
      message: `Your prepaid balance is low: ₦${currentBalance.toFixed(2)}`,
      severity: "warning",
      soundAlert: false,
      pushNotification: true,
    });
  }

  /**
   * Send system alert notification
   */
  static async notifySystemAlert(
    userId: number,
    title: string,
    message: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      notificationType: "system_alert",
      title,
      message,
      severity: "info",
      soundAlert: false,
      pushNotification: true,
    });
  }

  /**
   * Send maintenance alert notification
   */
  static async notifyMaintenanceAlert(
    userId: number,
    computerId: number,
    pcName: string,
    reason: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      computerId,
      notificationType: "maintenance_alert",
      title: "Maintenance Required",
      message: `${pcName} requires maintenance: ${reason}`,
      severity: "warning",
      soundAlert: false,
      pushNotification: true,
    });
  }

  /**
   * Get unread notifications for user
   */
  static async getUnreadNotifications(userId: number) {
    return await getUnreadNotifications(userId);
  }

  /**
   * Check if notification type is enabled for user
   */
  private static isNotificationTypeEnabled(
    notificationType: NotificationType,
    preferences: any
  ): boolean {
    if (!preferences) return true; // Default to enabled if no preferences

    const enabledMap: Record<NotificationType, string> = {
      session_expired: "enableSessionExpired",
      time_warning: "enableTimeWarning",
      pc_offline: "enablePcOffline",
      payment_failed: "enablePaymentFailed",
      low_balance: "enableLowBalance",
      system_alert: "enableSystemAlert",
      maintenance_alert: "enableSystemAlert",
    };

    const prefKey = enabledMap[notificationType];
    return preferences[prefKey] !== false;
  }

  /**
   * Emit WebSocket event for real-time notification
   * This will be called from the WebSocket server
   */
  private static async emitWebSocketEvent(userId: number, event: unknown): Promise<void> {
    try {
      const { sendNotificationToUser } = await import('./websocket');
      sendNotificationToUser(userId, event);
    } catch (error) {
      logger.error("notification_service_websocket_event_failed", { userId, err: error });
    }
  }
}

export default NotificationService;
