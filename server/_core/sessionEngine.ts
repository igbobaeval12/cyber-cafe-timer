import { and, desc, eq } from 'drizzle-orm';
import { createAuditLog, getDb, getUserByUsername } from '../db';
import { computers, sessions, pricingConfigs, transactions, receipts } from '../../drizzle/schema';
import { calculateBill, createBill } from './billing';
import { logger } from './logger';
import { NotificationService } from '../notificationService';
import { ENV } from './env';

export interface SessionEngineEvent {
  type: 'session:started' | 'session:updated' | 'session:ended' | 'pc:updated';
  payload: unknown;
}

export type SessionStatus = 'active' | 'paused' | 'completed' | 'expired';

export interface SessionTimerState {
  isExpired: boolean;
  isPaused: boolean;
  remainingMs: number;
  remainingMinutes: number;
  endTime: Date | null;
}

export function formatRemainingTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function normalizePackageType(packageType?: string | null): 'hourly' | 'fixed' | 'custom' {
  const normalized = (packageType || '').trim().toLowerCase();
  if (normalized.includes('fixed')) return 'fixed';
  if (normalized.includes('hour')) return 'hourly';
  return 'custom';
}

export function calculateSessionEndTime(startTime: Date | string, durationMinutes: number | string | null | undefined): Date {
  const normalizedDurationMinutes = Math.max(0, Number(durationMinutes ?? 0) || 0);
  return new Date(new Date(startTime).getTime() + normalizedDurationMinutes * 60_000);
}

export function getSessionTimerState(
  session: {
    sessionStatus: SessionStatus;
    startTime: Date | string;
    endTime?: Date | string | null;
    totalDurationMinutes?: number | string | null;
    pausedTime?: Date | string | null;
  },
  now = new Date(),
): SessionTimerState {
  const startMs = new Date(session.startTime).getTime();
  const configuredDurationMs = (Number(session.totalDurationMinutes ?? 0) || 0) * 60_000;
  const endMs = session.endTime ? new Date(session.endTime).getTime() : startMs + configuredDurationMs;
  const isPaused = session.sessionStatus === 'paused';
  const pauseReferenceMs = session.pausedTime ? new Date(session.pausedTime).getTime() : now.getTime();
  const remainingMs = isPaused ? Math.max(0, endMs - pauseReferenceMs) : Math.max(0, endMs - now.getTime());
  const isExpired = !isPaused && endMs <= now.getTime();

  return {
    isExpired,
    isPaused,
    remainingMs,
    remainingMinutes: Math.max(0, Math.ceil(remainingMs / 60_000)),
    endTime: new Date(endMs),
  };
}

export function calculateResumeDeadline(
  session: {
    startTime: Date | string;
    endTime?: Date | string | null;
    totalDurationMinutes?: number | string | null;
    pausedTime?: Date | string | null;
  },
  now = new Date(),
) {
  const originalEndMs = session.endTime ? new Date(session.endTime).getTime() : new Date(session.startTime).getTime() + (Number(session.totalDurationMinutes ?? 0) || 0) * 60_000;
  if (!session.pausedTime) {
    const remainingMs = Math.max(0, originalEndMs - now.getTime());
    return {
      pauseDurationMs: 0,
      resumeEndTime: new Date(originalEndMs),
      remainingMs,
      remainingMinutes: Math.max(0, Math.ceil(remainingMs / 60_000)),
    };
  }

  const pausedAtMs = new Date(session.pausedTime).getTime();
  const pauseDurationMs = Math.max(0, now.getTime() - pausedAtMs);
  const resumeEndTime = new Date(originalEndMs + pauseDurationMs);
  const remainingMs = Math.max(0, resumeEndTime.getTime() - now.getTime());

  return {
    pauseDurationMs,
    resumeEndTime,
    remainingMs,
    remainingMinutes: Math.max(0, Math.ceil(remainingMs / 60_000)),
  };
}

export async function ensureNoActiveSessionForComputer(computerId: number, dbOrTx: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const activeSession = await dbOrTx.select().from(sessions).where(and(eq(sessions.computerId, computerId), eq(sessions.sessionStatus, 'active'))).limit(1);
  if (activeSession[0]) {
    throw new Error('Computer already has an active session');
  }
}

export async function ensureNoActiveSessionForUser(userId: number, dbOrTx: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const activeSession = await dbOrTx.select().from(sessions).where(and(eq(sessions.userId, userId), eq(sessions.sessionStatus, 'active'))).limit(1);
  if (activeSession[0]) {
    throw new Error('Customer already has an active session');
  }
}

export async function startSession(input: {
  computerId: number;
  userId: number;
  customerId?: number;
  pricingConfigId: number;
  paymentMode?: 'prepaid' | 'postpaid';
  durationMinutes?: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  const startSessionInTransaction = async (connection: NonNullable<Awaited<ReturnType<typeof getDb>>>) => {
    try {
      const pricing = await connection.select().from(pricingConfigs).where(eq(pricingConfigs.id, input.pricingConfigId)).limit(1);
      const selectedPricing = pricing[0];
      if (!selectedPricing) {
        throw new Error('Pricing configuration not found');
      }

      const computer = await connection.select().from(computers).where(eq(computers.id, input.computerId)).limit(1);
      const selectedComputer = computer[0];
      if (!selectedComputer) {
        throw new Error('Computer not found');
      }

      const sessionUserId = input.customerId ?? input.userId;
      await ensureNoActiveSessionForComputer(input.computerId, connection);
      await ensureNoActiveSessionForUser(sessionUserId, connection);

      const durationMinutes = input.durationMinutes ?? 60;
      const startTime = new Date();
      const endTime = calculateSessionEndTime(startTime, durationMinutes);
      const result = await connection.insert(sessions).values({
        computerId: input.computerId,
        userId: sessionUserId,
        pricingConfigId: input.pricingConfigId,
        sessionStatus: 'active',
        paymentMode: input.paymentMode ?? 'postpaid',
        startTime,
        endTime,
        totalDurationMinutes: durationMinutes,
        totalCost: selectedPricing.hourlyRate,
        notes: input.notes,
      });

      const sessionId = Number((result as { insertId?: number }).insertId ?? Date.now());

      await connection.update(computers).set({
        status: 'in_use',
        currentCustomer: String(sessionUserId),
        remainingTime: String(durationMinutes),
        currentSession: String(sessionId),
        lastActivity: startTime,
      }).where(eq(computers.id, input.computerId));

      return { sessionId, status: 'active' as const };
    } catch (error) {
      logger.error('session_engine_start_failed', { error, computerId: input.computerId, userId: input.userId, pricingConfigId: input.pricingConfigId });
      throw error;
    }
  };

  if (typeof (db as { transaction?: (callback: (tx: Awaited<ReturnType<typeof getDb>>) => Promise<any>) => Promise<any> }).transaction === 'function') {
    try {
      return await (db as { transaction: (callback: (tx: Awaited<ReturnType<typeof getDb>>) => Promise<any>) => Promise<any> }).transaction(async (tx) => startSessionInTransaction(tx));
    } catch (error) {
      if (error instanceof Error && /active session|duplicate/i.test(error.message)) {
        throw new Error('Computer already has an active session');
      }
      throw error;
    }
  }

  return startSessionInTransaction(db);
}

export async function pauseSession(sessionId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  try {
    const existing = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    const session = existing[0];
    if (!session) throw new Error('Session not found');

    await db.update(sessions).set({ sessionStatus: 'paused', pausedTime: new Date() }).where(eq(sessions.id, sessionId));
    await db.update(computers).set({ status: 'reserved', lastActivity: new Date() }).where(eq(computers.id, session.computerId));
    return { sessionId, status: 'paused' as const };
  } catch (error) {
    logger.error('session_engine_pause_failed', { error, sessionId });
    throw error;
  }
}

export async function resumeSession(sessionId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  try {
    const existing = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    const session = existing[0];
    if (!session) throw new Error('Session not found');

    const now = new Date();
    const deadline = calculateResumeDeadline(session, now);

    await db.update(sessions).set({
      sessionStatus: 'active',
      pausedTime: null,
      endTime: deadline.resumeEndTime,
      updatedAt: now,
    }).where(eq(sessions.id, sessionId));
    await db.update(computers).set({ status: 'in_use', remainingTime: String(Math.max(0, deadline.remainingMinutes)), lastActivity: now }).where(eq(computers.id, session.computerId));
    return { sessionId, status: 'active' as const, remainingMinutes: deadline.remainingMinutes };
  } catch (error) {
    logger.error('session_engine_resume_failed', { error, sessionId });
    throw error;
  }
}

export async function extendSession(sessionId: number, additionalMinutes: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  try {
    const existing = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    const session = existing[0];
    if (!session) throw new Error('Session not found');

    const originalEndMs = session.endTime ? new Date(session.endTime).getTime() : new Date(session.startTime).getTime() + (Number(session.totalDurationMinutes || 0) * 60_000);
    const nextEndTime = new Date(originalEndMs + additionalMinutes * 60_000);
    const nextDuration = Number(session.totalDurationMinutes || 0) + additionalMinutes;

    await db.update(sessions).set({
      totalDurationMinutes: nextDuration,
      endTime: nextEndTime,
      updatedAt: new Date(),
    }).where(eq(sessions.id, sessionId));
    await db.update(computers).set({ remainingTime: String(nextDuration), lastActivity: new Date() }).where(eq(computers.id, session.computerId));
    return { sessionId, totalDurationMinutes: nextDuration, endTime: nextEndTime };
  } catch (error) {
    logger.error('session_engine_extend_failed', { error, sessionId, additionalMinutes });
    throw error;
  }
}

export async function expireSession(sessionId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  const existing = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  const session = existing[0];
  if (!session) return null;
  if (session.sessionStatus === 'expired' || session.sessionStatus === 'completed') {
    return { sessionId, status: session.sessionStatus };
  }

  const endedAt = new Date();
  const pricingConfig = session.pricingConfigId
    ? (await db.select().from(pricingConfigs).where(eq(pricingConfigs.id, session.pricingConfigId)).limit(1))[0]
    : undefined;

  const durationMinutes = Math.max(0, Number(session.totalDurationMinutes ?? 0));
  const pricingType = normalizePackageType(pricingConfig?.name ?? 'hourly');
  const hourlyRate = Number(pricingConfig?.hourlyRate ?? 0);
  const fixedPackagePrice = Number(pricingConfig?.minimumCharge ?? 0);
  const customPrice = Number(pricingConfig?.minimumCharge ?? 0);

  await db.update(sessions).set({
    sessionStatus: 'expired',
    endTime: endedAt,
    updatedAt: endedAt,
  }).where(eq(sessions.id, sessionId));

  await db.update(computers).set({
    status: 'available',
    currentCustomer: null,
    remainingTime: null,
    currentSession: null,
    lastActivity: endedAt,
  }).where(eq(computers.id, session.computerId));

  const bill = await createBill({
    sessionId,
    userId: session.userId ?? undefined,
    pricingType,
    hourlyRate,
    fixedPackagePrice,
    customPrice,
    durationMinutes,
    paymentMethod: session.paymentMode === 'prepaid' ? 'mobile' : 'cash',
    notes: 'Session expired',
    status: 'unpaid',
  });

  const calculation = calculateBill({
    pricingType,
    hourlyRate,
    fixedPackagePrice,
    customPrice,
    durationMinutes,
    additionalCharges: [],
    discountAmount: Number(pricingConfig?.discountPercentage ?? 0),
  });

  await db.insert(transactions).values({
    sessionId,
    userId: session.userId ?? 0,
    transactionType: 'session_charge',
    amount: String(calculation.totalAmount),
    paymentMethod: session.paymentMode === 'prepaid' ? 'prepaid_balance' : 'cash',
    status: 'completed',
    notes: 'Session expired',
  });

  await db.insert(receipts).values({
    billId: bill.id,
    sessionId,
    receiptNumber: `RCPT-${sessionId}-${Date.now()}`,
    userId: session.userId ?? 0,
    computerId: session.computerId,
    customerName: session.userId ? `User #${session.userId}` : 'Walk-in',
    startTime: session.startTime,
    endTime: endedAt,
    durationMinutes,
    servicesUsed: 'PC Session',
    itemizedCharges: `Base Charge: ₦${calculation.baseCharge.toFixed(2)}\nAdditional Charges: ₦${calculation.additionalCharges.toFixed(2)}\nDiscount: -₦${calculation.discountAmount.toFixed(2)}`,
    discountAmount: String(calculation.discountAmount),
    totalAmount: String(calculation.totalAmount),
    paymentMethod: session.paymentMode === 'prepaid' ? 'mobile' : 'cash',
    staffName: 'Admin',
    notes: 'Session expired',
  });

  const adminUser = await getUserByUsername(ENV.adminUsername);
  const targetUserIds = [session.userId, adminUser?.id].filter((value): value is number => Boolean(value));
  const uniqueUserIds = [...new Set(targetUserIds)];

  for (const userId of uniqueUserIds) {
    await NotificationService.notifySessionExpired(userId, session.computerId, sessionId, `PC-${session.computerId}`);
  }

  await createAuditLog({
    userId: session.userId ?? adminUser?.id,
    computerId: session.computerId,
    action: 'SESSION_EXPIRED',
    details: `Session ${sessionId} expired on computer ${session.computerId}`,
  });

  return { sessionId, billId: bill.id, status: 'expired' as const };
}

export async function endSession(sessionId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  try {
    const existing = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    const session = existing[0];
    if (!session) throw new Error('Session not found');

    if (session.sessionStatus === 'expired') {
      return { sessionId, status: 'expired' as const };
    }

    const pricingConfig = session.pricingConfigId
      ? (await db.select().from(pricingConfigs).where(eq(pricingConfigs.id, session.pricingConfigId)).limit(1))[0]
      : undefined;

    const endedAt = new Date();
    await db.update(sessions).set({ sessionStatus: 'completed', endTime: endedAt, updatedAt: endedAt }).where(eq(sessions.id, sessionId));
    await db.update(computers).set({
      status: 'available',
      currentCustomer: null,
      remainingTime: null,
      currentSession: null,
      lastActivity: endedAt,
    }).where(eq(computers.id, session.computerId));

    const pricingType = normalizePackageType(pricingConfig?.name ?? 'hourly');
    const hourlyRate = Number(pricingConfig?.hourlyRate ?? 0);
    const fixedPackagePrice = Number(pricingConfig?.minimumCharge ?? 0);
    const customPrice = Number(pricingConfig?.minimumCharge ?? 0);
    const durationMinutes = Number(session.totalDurationMinutes ?? 0);
    const bill = await createBill({
      sessionId,
      userId: session.userId ?? undefined,
      pricingType,
      hourlyRate,
      fixedPackagePrice,
      customPrice,
      durationMinutes,
      paymentMethod: session.paymentMode === 'prepaid' ? 'mobile' : 'cash',
      notes: 'Session completed',
    });

    const calculation = calculateBill({
      pricingType,
      hourlyRate,
      fixedPackagePrice,
      customPrice,
      durationMinutes,
      additionalCharges: [],
      discountAmount: Number(pricingConfig?.discountPercentage ?? 0),
    });

    await db.insert(transactions).values({
      sessionId,
      userId: session.userId ?? 0,
      transactionType: 'session_charge',
      amount: String(calculation.totalAmount),
      paymentMethod: session.paymentMode === 'prepaid' ? 'prepaid_balance' : 'cash',
      status: 'completed',
      notes: 'Session completed',
    });

    await db.insert(receipts).values({
      billId: bill.id,
      sessionId,
      receiptNumber: `RCPT-${sessionId}-${Date.now()}`,
      userId: session.userId ?? 0,
      computerId: session.computerId,
      customerName: session.userId ? `User #${session.userId}` : 'Walk-in',
      startTime: session.startTime,
      endTime: endedAt,
      durationMinutes,
      servicesUsed: 'PC Session',
      itemizedCharges: `Base Charge: ₦${calculation.baseCharge.toFixed(2)}\nAdditional Charges: ₦${calculation.additionalCharges.toFixed(2)}\nDiscount: -₦${calculation.discountAmount.toFixed(2)}`,
      discountAmount: String(calculation.discountAmount),
      totalAmount: String(calculation.totalAmount),
      paymentMethod: session.paymentMode === 'prepaid' ? 'mobile' : 'cash',
      staffName: 'Admin',
      notes: 'Session completed',
    });

    return { sessionId, billId: bill.id, status: 'completed' as const };
  } catch (error) {
    logger.error('session_engine_end_failed', { error, sessionId });
    throw error;
  }
}

export async function getActiveSessions() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return db.select({
    id: sessions.id,
    computerId: sessions.computerId,
    userId: sessions.userId,
    sessionStatus: sessions.sessionStatus,
    startTime: sessions.startTime,
    totalDurationMinutes: sessions.totalDurationMinutes,
    totalCost: sessions.totalCost,
    computerName: computers.pcName,
  }).from(sessions)
    .leftJoin(computers, eq(sessions.computerId, computers.id))
    .where(eq(sessions.sessionStatus, 'active'))
    .orderBy(desc(sessions.startTime));
}

export async function getSessionHistory(limit = 20) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return db.select({
    id: sessions.id,
    computerId: sessions.computerId,
    userId: sessions.userId,
    sessionStatus: sessions.sessionStatus,
    startTime: sessions.startTime,
    endTime: sessions.endTime,
    totalDurationMinutes: sessions.totalDurationMinutes,
    totalCost: sessions.totalCost,
    computerName: computers.pcName,
  }).from(sessions)
    .leftJoin(computers, eq(sessions.computerId, computers.id))
    .orderBy(desc(sessions.createdAt))
    .limit(limit);
}

export async function getSessionById(sessionId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
}

export async function reconcileExpiredSessions() {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const activeSessions = await db.select().from(sessions).where(eq(sessions.sessionStatus, 'active'));
  const expiredSessionIds: number[] = [];

  for (const session of activeSessions) {
    const timerState = getSessionTimerState(session, new Date());
    if (timerState.isExpired) {
      expiredSessionIds.push(session.id);
      await expireSession(session.id);
    }
  }

  return expiredSessionIds;
}

export function startSessionExpiryMonitor(intervalMs = 30_000) {
  const globalObject = globalThis as typeof globalThis & {
    __cyberCafeSessionExpiryMonitor?: NodeJS.Timeout;
  };

  if (globalObject.__cyberCafeSessionExpiryMonitor) {
    return globalObject.__cyberCafeSessionExpiryMonitor;
  }

  globalObject.__cyberCafeSessionExpiryMonitor = setInterval(() => {
    void reconcileExpiredSessions().catch((error) => {
      logger.error('session_reconcile_failed', { error });
    });
  }, intervalMs);

  return globalObject.__cyberCafeSessionExpiryMonitor;
}

export async function syncSessionTimer(sessionId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  const existing = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  const session = existing[0];
  if (!session) throw new Error('Session not found');
  if (session.sessionStatus !== 'active') return null;

  const timerState = getSessionTimerState(session, new Date());
  if (timerState.isExpired) {
    await expireSession(sessionId);
    return { sessionId, status: 'expired' as const, remainingMinutes: 0 };
  }

  await db.update(computers).set({ remainingTime: String(timerState.remainingMinutes), lastActivity: new Date() }).where(eq(computers.id, session.computerId));
  return { sessionId, status: 'active' as const, remainingMinutes: timerState.remainingMinutes };
}
