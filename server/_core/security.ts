import { randomBytes } from "crypto";
import type { InsertAuditLog } from "../../drizzle/schema";
import * as db from "../db";
import { logger } from "./logger";

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function validateSessionToken(sessionId: number, token: string): Promise<boolean> {
  try {
    const session = await db.getSessionById(sessionId);
    if (!session?.sessionToken) return false;
    if (session.sessionToken !== token) return false;
    if (session.tokenExpiresAt && new Date() > session.tokenExpiresAt) return false;
    return true;
  } catch (error) {
    logger.error("security_token_validation_failed", { err: error });
    return false;
  }
}

export async function logAuditEvent(
  userId: number | undefined,
  action: string,
  details: string,
  ipAddress?: string,
  computerId?: number,
): Promise<void> {
  try {
    const auditLog: InsertAuditLog = {
      userId,
      computerId,
      action,
      details,
      ipAddress,
    };
    await db.createAuditLog(auditLog);
  } catch (error) {
    logger.error("security_audit_log_failed", { userId, action, err: error });
  }
}

export async function logSessionEvent(
  sessionId: number,
  userId: number | undefined,
  event: "session_start" | "session_pause" | "session_resume" | "session_stop" | "session_expired" | "unauthorized_access_attempt",
  details?: string,
  ipAddress?: string,
): Promise<void> {
  const eventMessages: Record<string, string> = {
    session_start: `Session ${sessionId} started`,
    session_pause: `Session ${sessionId} paused`,
    session_resume: `Session ${sessionId} resumed`,
    session_stop: `Session ${sessionId} stopped`,
    session_expired: `Session ${sessionId} expired`,
    unauthorized_access_attempt: `Unauthorized access attempt on session ${sessionId}`,
  };

  await logAuditEvent(userId, `SESSION_${event.toUpperCase()}`, details || eventMessages[event], ipAddress, undefined);
}

export async function logSecurityEvent(
  userId: number | undefined,
  event: "login_success" | "login_failed" | "admin_access" | "unauthorized_admin_access" | "token_generated" | "token_validated" | "invalid_token",
  details?: string,
  ipAddress?: string,
): Promise<void> {
  const eventMessages: Record<string, string> = {
    login_success: "User successfully logged in",
    login_failed: "Login attempt failed",
    admin_access: "Admin functionality accessed",
    unauthorized_admin_access: "Unauthorized admin access attempt",
    token_generated: "Session token generated",
    token_validated: "Session token validated",
    invalid_token: "Invalid or expired session token",
  };

  await logAuditEvent(userId, `SECURITY_${event.toUpperCase()}`, details || eventMessages[event], ipAddress);
}

export async function getUserAuditLogs(userId: number, limit = 100): Promise<any[]> {
  try {
    return await db.getAuditLogs(userId, limit);
  } catch (error) {
    logger.error("security_audit_log_lookup_failed", { userId, err: error });
    return [];
  }
}

export async function checkSuspiciousActivity(userId: number | undefined, ipAddress?: string, timeWindowMinutes = 15): Promise<number> {
  try {
    return await db.getFailedLoginAttempts(userId, ipAddress, timeWindowMinutes);
  } catch (error) {
    logger.error("security_suspicious_activity_check_failed", { userId, ipAddress, err: error });
    return 0;
  }
}
