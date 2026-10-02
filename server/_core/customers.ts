import { and, desc, eq, like, or } from 'drizzle-orm';
import { getDb, getUserByUsername } from '../db';
import { bills, sessions, users } from '../../drizzle/schema';
import { hashPassword } from './passwordUtils';

export type CustomerMembershipType = 'walk_in' | 'regular' | 'vip' | 'student' | 'corporate';
export type CustomerStatus = 'active' | 'inactive' | 'blacklisted';

export interface CreateCustomerInput {
  name: string;
  phoneNumber?: string;
  email?: string;
  membershipTier?: CustomerMembershipType;
  customerStatus?: CustomerStatus;
  notes?: string;
  loyaltyPoints?: number;
  prepaidBalance?: number;
}

export const customerMembershipOptions: CustomerMembershipType[] = ['walk_in', 'regular', 'vip', 'student', 'corporate'];

export function normalizeCustomerMembership(value?: string | null): CustomerMembershipType {
  const normalized = (value ?? 'walk_in').toLowerCase().trim();
  if (normalized === 'vip') return 'vip';
  if (normalized === 'student') return 'student';
  if (normalized === 'corporate') return 'corporate';
  if (normalized === 'regular') return 'regular';
  return 'walk_in';
}

export function normalizeCustomerStatus(value?: string | null): CustomerStatus {
  const normalized = (value ?? 'active').toLowerCase().trim();
  if (normalized === 'inactive') return 'inactive';
  if (normalized === 'blacklisted') return 'blacklisted';
  return 'active';
}

export async function createCustomer(input: CreateCustomerInput & { username?: string; password?: string }) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  const requestedUsername = (input.username ?? `customer-${Date.now()}`).trim();
  if (!requestedUsername) {
    throw new Error('Username is required');
  }

  const existing = await getUserByUsername(requestedUsername);
  if (existing) {
    throw new Error('Username already exists');
  }

  const values = {
    username: requestedUsername,
    passwordHash: input.password ? hashPassword(input.password) : null,
    role: 'user' as const,
    name: input.name,
    email: input.email ?? null,
    phoneNumber: input.phoneNumber ?? null,
    membershipTier: normalizeCustomerMembership(input.membershipTier),
    customerStatus: normalizeCustomerStatus(input.customerStatus),
    customerNotes: input.notes ?? null,
    loyaltyPoints: input.loyaltyPoints ?? 0,
    prepaidBalance: String(input.prepaidBalance ?? 0),
    registeredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const result = await db.insert(users).values(values);
  const customerId = Number((result as { insertId?: number }).insertId ?? Date.now());
  return { id: customerId, ...values, passwordHash: undefined };
}

export async function updateCustomer(customerId: number, updates: Partial<CreateCustomerInput & { membershipTier?: string; customerStatus?: string }>) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  const payload: Record<string, unknown> = {
    ...updates,
    updatedAt: new Date(),
  };

  if (payload.membershipTier) {
    payload.membershipTier = normalizeCustomerMembership(String(payload.membershipTier));
  }
  if (payload.customerStatus) {
    payload.customerStatus = normalizeCustomerStatus(String(payload.customerStatus));
  }
  if (payload.prepaidBalance !== undefined) {
    payload.prepaidBalance = String(payload.prepaidBalance);
  }
  if (payload.notes !== undefined) {
    payload.customerNotes = payload.notes;
    delete payload.notes;
  }

  await db.update(users).set(payload).where(eq(users.id, customerId));
  return { success: true };
}

export async function deleteCustomer(customerId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  await db.delete(users).where(eq(users.id, customerId));
  return { success: true };
}

export async function getCustomerById(customerId: number) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, customerId)).limit(1);
  return result[0];
}

export async function searchCustomers(query = '', limit = 50) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const safeQuery = query.trim();
  if (!safeQuery) {
    return await db.select().from(users).where(eq(users.role, 'user')).orderBy(desc(users.createdAt)).limit(limit);
  }

  return await db.select().from(users)
    .where(and(
      or(
        like(users.name, `%${safeQuery}%`),
        like(users.phoneNumber, `%${safeQuery}%`),
        like(users.email, `%${safeQuery}%`),
      ),
      eq(users.role, 'user'),
    ))
    .orderBy(desc(users.createdAt))
    .limit(limit);
}

export async function getCustomerHistory(customerId: number) {
  const db = await getDb();
  if (!db) {
    return { customer: undefined, sessions: [], bills: [] };
  }

  const customer = await getCustomerById(customerId);
  const sessionsList = await db.select().from(sessions).where(eq(sessions.userId, customerId)).orderBy(desc(sessions.startTime));
  const billsList = await db.select().from(bills).where(eq(bills.userId, customerId)).orderBy(desc(bills.createdAt));

  return {
    customer,
    sessions: sessionsList,
    bills: billsList,
  };
}

export async function getCustomerDashboardStats(customerId: number) {
  const history = await getCustomerHistory(customerId);
  const totalVisits = history.sessions.length;
  const totalHoursUsed = history.sessions.reduce((sum, item) => sum + Number(item.totalDurationMinutes ?? 0), 0) / 60;
  const totalAmountSpent = history.bills.reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0);
  const lastVisit = history.sessions[0]?.startTime ?? null;
  const currentActiveSession = history.sessions.find((session) => session.sessionStatus === 'active') ?? null;

  return {
    totalVisits,
    totalHoursUsed: Number(totalHoursUsed.toFixed(2)),
    totalAmountSpent: Number(totalAmountSpent.toFixed(2)),
    lastVisit,
    currentActiveSession,
  };
}
