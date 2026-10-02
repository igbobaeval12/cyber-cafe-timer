import React, { useState, useEffect, useCallback } from "react";
import { Bell, X, Check, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useWebSocket } from "@/hooks/useWebSocket";
import { toast } from "sonner";

interface Notification {
  id: number;
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "critical";
  isRead: boolean;
  createdAt: Date;
  notificationType: string;
  soundAlert?: boolean;
}

function normalizeSeverity(severity: Notification["severity"] | undefined): Notification["severity"] {
  return severity ?? "info";
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket } = useWebSocket();

  // Fetch notifications on mount
  const { data: unreadNotifications = [] } = trpc.notifications.getUnread.useQuery(
    undefined,
    { refetchInterval: 5000 } // Refetch every 5 seconds
  );

  useEffect(() => {
    if (unreadNotifications && unreadNotifications.length > 0) {
      setNotifications((prev) => {
        const newNotifs = unreadNotifications.filter(
          (n) => !prev.find((p) => p.id === n.id)
        );
        return [...newNotifs, ...prev];
      });
      setUnreadCount(unreadNotifications.length);
    }
  }, [unreadNotifications]);

  // Listen for real-time notifications via WebSocket
  useEffect(() => {
    if (!socket) return;

    socket.on("notification", (data: any) => {
      const newNotification: Notification = {
        id: data.id,
        title: data.title,
        message: data.message,
        severity: normalizeSeverity(data.severity),
        isRead: false,
        createdAt: new Date(data.createdAt),
        notificationType: data.notificationType,
        soundAlert: data.soundAlert,
      };

      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Play sound if enabled
      if (newNotification.soundAlert) {
        playNotificationSound();
      }

      // Show toast notification
      showNotificationToast(newNotification);
    });

    return () => {
      socket.off("notification");
    };
  }, [socket]);

  const playNotificationSound = useCallback(() => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  }, []);

  const showNotificationToast = useCallback((notification: Notification) => {
    const icon = getSeverityIcon(notification.severity);

    toast.custom((t) => (
      <div
        className={`flex items-start gap-3 p-4 rounded-lg shadow-lg ${getSeverityBgColor(
          notification.severity
        )}`}
      >
        {icon}
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{notification.title}</h3>
          <p className="text-sm opacity-90">{notification.message}</p>
        </div>
        <button
          onClick={() => toast.dismiss(t)}
          className="text-current opacity-50 hover:opacity-100"
        >
          <X size={16} />
        </button>
      </div>
    ));
  }, []);

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation();

  const markAsRead = useCallback(
    async (notificationId: number) => {
      try {
        await markAsReadMutation.mutateAsync({ id: notificationId });
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
        toast.error("Failed to mark notification as read");
      }
    },
    [markAsReadMutation]
  );

  const clearAll = useCallback(async () => {
    try {
      // Mark all as read
      for (const notif of notifications.filter((n) => !n.isRead)) {
        await markAsReadMutation.mutateAsync({ id: notif.id });
      }
      setNotifications([]);
      setUnreadCount(0);
      toast.success("All notifications cleared");
    } catch (error) {
      console.error("Failed to clear notifications:", error);
      toast.error("Failed to clear notifications");
    }
  }, [notifications, markAsReadMutation]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case "critical":
      case "error":
        return "bg-red-50 text-red-900";
      case "warning":
        return "bg-yellow-50 text-yellow-900";
      default:
        return "bg-blue-50 text-blue-900";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
      case "error":
        return "border-l-red-500";
      case "warning":
        return "border-l-yellow-500";
      default:
        return "border-l-blue-500";
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={20} className={unreadCount > 0 ? "text-red-500" : ""} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-lg">Notifications</h3>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`border-l-4 p-4 hover:bg-gray-50 transition-colors ${getSeverityColor(
                    notification.severity
                  )} ${!notification.isRead ? "bg-blue-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(notification.severity)}
                        <h4 className="font-semibold text-sm">
                          {notification.title}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-blue-500 hover:text-blue-700 p-1 transition-colors"
                        title="Mark as read"
                        disabled={markAsReadMutation.isPending}
                      >
                        <Check size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs text-red-600 hover:text-red-700"
                onClick={clearAll}
                disabled={markAsReadMutation.isPending}
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
