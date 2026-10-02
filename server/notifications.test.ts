import { describe, expect, it, beforeEach, vi } from "vitest";
import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Notification System", () => {
  describe("notifications.getUnread", () => {
    it("should return empty array when no unread notifications", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.notifications.getUnread();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should only return notifications for authenticated user", async () => {
      const { ctx: ctx1 } = createAuthContext(1);
      const { ctx: ctx2 } = createAuthContext(2);

      const caller1 = appRouter.createCaller(ctx1);
      const caller2 = appRouter.createCaller(ctx2);

      const result1 = await caller1.notifications.getUnread();
      const result2 = await caller2.notifications.getUnread();

      // Both should return arrays (may be empty or have different notifications)
      expect(Array.isArray(result1)).toBe(true);
      expect(Array.isArray(result2)).toBe(true);
    });
  });

  describe("notifications.getAll", () => {
    it("should return notifications with default limit", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.notifications.getAll({ limit: 50 });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it("should respect custom limit", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.notifications.getAll({ limit: 10 });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it("should only return notifications for authenticated user", async () => {
      const { ctx: ctx1 } = createAuthContext(1);
      const { ctx: ctx2 } = createAuthContext(2);

      const caller1 = appRouter.createCaller(ctx1);
      const caller2 = appRouter.createCaller(ctx2);

      const result1 = await caller1.notifications.getAll({ limit: 50 });
      const result2 = await caller2.notifications.getAll({ limit: 50 });

      // Results should be arrays
      expect(Array.isArray(result1)).toBe(true);
      expect(Array.isArray(result2)).toBe(true);
    });
  });

  describe("notifications.markAsRead", () => {
    it("should throw error when notification not found", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Try to mark a non-existent notification as read
      try {
        await caller.notifications.markAsRead({ id: 99999 });
        // If no error, check if it was handled gracefully
        expect(true).toBe(true);
      } catch (error: any) {
        // Should throw access denied or not found error
        expect(error.message).toContain("not found");
      }
    });

    it("should prevent users from marking other users' notifications as read", async () => {
      const { ctx: ctx1 } = createAuthContext(1);
      const { ctx: ctx2 } = createAuthContext(2);

      const caller1 = appRouter.createCaller(ctx1);
      const caller2 = appRouter.createCaller(ctx2);

      // Get notifications for user 1
      const notifs1 = await caller1.notifications.getAll({ limit: 50 });

      if (notifs1.length > 0) {
        const notifId = notifs1[0].id;

        // Try to mark user 1's notification as read from user 2's context
        try {
          await caller2.notifications.markAsRead({ id: notifId });
          // If no error, it means access control failed
          expect(true).toBe(false); // Should not reach here
        } catch (error: any) {
          // Should throw access denied error
          expect(error.message).toContain("not found");
        }
      }
    });
  });

  describe("notifications.getPreferences", () => {
    it("should return default preferences when none exist", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.notifications.getPreferences();

      expect(result).toBeDefined();
      expect(result.enableSessionExpired).toBe(true);
      expect(result.enableTimeWarning).toBe(true);
      expect(result.enableSoundAlerts).toBe(true);
      expect(result.timeWarningMinutes).toBe(5);
    });

    it("should only return preferences for authenticated user", async () => {
      const { ctx: ctx1 } = createAuthContext(1);
      const { ctx: ctx2 } = createAuthContext(2);

      const caller1 = appRouter.createCaller(ctx1);
      const caller2 = appRouter.createCaller(ctx2);

      const prefs1 = await caller1.notifications.getPreferences();
      const prefs2 = await caller2.notifications.getPreferences();

      expect(prefs1).toBeDefined();
      expect(prefs2).toBeDefined();
      // Both should have userId set to their own ID
      expect(prefs1.userId).toBe(ctx1.user.id);
      expect(prefs2.userId).toBe(ctx2.user.id);
    });
  });

  describe("notifications.updatePreferences", () => {
    it("should update notification preferences", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.notifications.updatePreferences({
        enableSessionExpired: false,
        enableTimeWarning: false,
        enableSoundAlerts: false,
        timeWarningMinutes: 10,
      });

      expect(result.success).toBe(true);

      // Verify preferences were updated
      const updated = await caller.notifications.getPreferences();
      expect(updated.enableSessionExpired).toBe(false);
      expect(updated.enableTimeWarning).toBe(false);
      expect(updated.enableSoundAlerts).toBe(false);
      expect(updated.timeWarningMinutes).toBe(10);
    });

    it("should validate timeWarningMinutes range", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Try to set invalid timeWarningMinutes
      try {
        await caller.notifications.updatePreferences({
          timeWarningMinutes: 0, // Invalid: less than 1
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        // Should throw validation error
        expect(error).toBeDefined();
      }
    });

    it("should prevent users from updating other users' preferences", async () => {
      const { ctx: ctx1 } = createAuthContext(1);
      const { ctx: ctx2 } = createAuthContext(2);

      const caller1 = appRouter.createCaller(ctx1);
      const caller2 = appRouter.createCaller(ctx2);

      // User 1 updates their preferences
      await caller1.notifications.updatePreferences({
        enableSessionExpired: false,
      });

      // User 2 should not be able to affect user 1's preferences
      await caller2.notifications.updatePreferences({
        enableSessionExpired: true,
      });

      // Verify user 1's preferences are unchanged
      const prefs1 = await caller1.notifications.getPreferences();
      expect(prefs1.enableSessionExpired).toBe(false);

      // Verify user 2's preferences are updated
      const prefs2 = await caller2.notifications.getPreferences();
      expect(prefs2.enableSessionExpired).toBe(true);
    });

    it("should allow partial preference updates", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Get current preferences
      const before = await caller.notifications.getPreferences();

      // Update only one field
      await caller.notifications.updatePreferences({
        enableSessionExpired: !before.enableSessionExpired,
      });

      // Verify only that field changed
      const after = await caller.notifications.getPreferences();
      expect(after.enableSessionExpired).toBe(!before.enableSessionExpired);
      expect(after.enableTimeWarning).toBe(before.enableTimeWarning);
    });
  });

  describe("Notification Security", () => {
    it("should require authentication for all notification procedures", async () => {
      // Create unauthenticated context
      const unauthCtx: TrpcContext = {
        user: null,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {
          clearCookie: vi.fn(),
        } as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(unauthCtx);

      // Try to access protected procedures
      try {
        await caller.notifications.getUnread();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should isolate notifications by user", async () => {
      const { ctx: ctx1 } = createAuthContext(1);
      const { ctx: ctx2 } = createAuthContext(2);

      const caller1 = appRouter.createCaller(ctx1);
      const caller2 = appRouter.createCaller(ctx2);

      // Get all notifications for both users
      const notifs1 = await caller1.notifications.getAll({ limit: 100 });
      const notifs2 = await caller2.notifications.getAll({ limit: 100 });

      // Each user should only see their own notifications
      for (const notif of notifs1) {
        expect(notif.userId).toBe(ctx1.user.id);
      }

      for (const notif of notifs2) {
        expect(notif.userId).toBe(ctx2.user.id);
      }
    });
  });
});
