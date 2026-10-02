import { eq, desc, and, gte, lte, ilike, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, InsertComputer, users, computers, sessions, transactions, receipts, pricingConfigs, printJobs, auditLogs, notifications, notificationPreferences, InsertNotification, InsertNotificationPreference, staffs, staffRoles, staffPermissions, staffRolePermissions, staffLoginHistory, staffActivityLogs, InsertStaff, InsertStaffRole, InsertStaffPermission, InsertStaffRolePermission, InsertStaffLoginHistory, InsertStaffActivityLog, systemConfig, backupHistory, InsertSystemConfig, InsertBackupHistory, trialRegistrations, salesInquiries, InsertTrialRegistration, InsertSalesInquiry } from "../drizzle/schema";
import { ENV } from './_core/env';
import { logger } from './_core/logger';

let _db: ReturnType<typeof drizzle> | null = null;
const notificationPreferenceStore = new Map<number, InsertNotificationPreference>();
const notificationStore = new Map<number, Array<InsertNotification & { id: number; createdAt: Date; readAt?: Date | null; isRead: boolean }>>();

const FALLBACK_STAFF_ROLES = [
  { id: 1, name: "Super Admin", slug: "super_admin", description: "Full system access", permissions: ["all"], isSystem: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 2, name: "Admin", slug: "admin", description: "Administrative access", permissions: ["manage_pcs", "manage_customers", "manage_billing", "manage_inventory", "manage_printing", "view_reports"], isSystem: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 3, name: "Manager", slug: "manager", description: "Operational oversight", permissions: ["manage_sessions", "manage_customers", "manage_printing", "manage_inventory", "view_reports"], isSystem: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 4, name: "Cashier", slug: "cashier", description: "Billing and customer service", permissions: ["manage_billing", "manage_pos", "manage_printing", "manage_customers"], isSystem: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 5, name: "Staff", slug: "staff", description: "Limited session support", permissions: ["start_sessions", "end_sessions", "view_customers"], isSystem: true, createdAt: new Date(), updatedAt: new Date() },
];

const FALLBACK_STAFF_PERMISSIONS = [
  { id: 1, key: "all", label: "Full Access", description: "All system capabilities", category: "system", createdAt: new Date() },
  { id: 2, key: "manage_pcs", label: "Manage PCs", description: "Create and edit workstations", category: "operations", createdAt: new Date() },
  { id: 3, key: "manage_customers", label: "Manage Customers", description: "Create and update customer records", category: "customers", createdAt: new Date() },
  { id: 4, key: "manage_billing", label: "Manage Billing", description: "Process billing and receipts", category: "billing", createdAt: new Date() },
  { id: 5, key: "manage_inventory", label: "Manage Inventory", description: "Manage stock and products", category: "inventory", createdAt: new Date() },
  { id: 6, key: "manage_printing", label: "Manage Printing", description: "Handle print jobs", category: "printing", createdAt: new Date() },
  { id: 7, key: "view_reports", label: "View Reports", description: "Review reports and analytics", category: "reports", createdAt: new Date() },
  { id: 8, key: "manage_sessions", label: "Manage Sessions", description: "Control session lifecycle", category: "sessions", createdAt: new Date() },
  { id: 9, key: "manage_pos", label: "Manage POS", description: "Access POS sales", category: "pos", createdAt: new Date() },
  { id: 10, key: "start_sessions", label: "Start Sessions", description: "Open new sessions", category: "sessions", createdAt: new Date() },
  { id: 11, key: "end_sessions", label: "End Sessions", description: "Close sessions", category: "sessions", createdAt: new Date() },
  { id: 12, key: "view_customers", label: "View Customers", description: "Read customer records", category: "customers", createdAt: new Date() },
];

function getDefaultNotificationPreferences(userId: number): InsertNotificationPreference {
  return {
    userId,
    enableSessionExpired: true,
    enableTimeWarning: true,
    enablePcOffline: true,
    enablePaymentFailed: true,
    enableLowBalance: true,
    enableSystemAlert: true,
    enableSoundAlerts: true,
    enablePushNotifications: true,
    enableEmailNotifications: false,
    timeWarningMinutes: 5,
  } as InsertNotificationPreference;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      logger.warn("database_connect_failed", { err: error });
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db) {
    logger.warn("database_unavailable", { action: "upsertUser" });
    return;
  }

  try {
    if (user.openId) {
      const values: InsertUser = { openId: user.openId };
      const updateSet: Record<string, unknown> = {};

      const textFields = ["name", "email", "loginMethod"] as const;
      for (const field of textFields) {
        if (user[field] !== undefined) {
          const normalized = user[field] ?? null;
          values[field] = normalized;
          updateSet[field] = normalized;
        }
      }

      if (user.lastSignedIn !== undefined) {
        values.lastSignedIn = user.lastSignedIn;
        updateSet.lastSignedIn = user.lastSignedIn;
      }
      if (user.role !== undefined) {
        values.role = user.role;
        updateSet.role = user.role;
      } else if (user.openId === ENV.ownerOpenId) {
        values.role = "admin";
        updateSet.role = "admin";
      }

      if (!values.lastSignedIn) {
        values.lastSignedIn = new Date();
      }
      if (Object.keys(updateSet).length === 0) {
        updateSet.lastSignedIn = new Date();
      }

      await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
      return;
    }

    if (!user.username) {
      return;
    }

    const existingUser = await getUserByUsername(user.username);
    if (!existingUser) {
      return;
    }

    const updateSet: Record<string, unknown> = {};
    if (user.name !== undefined) updateSet.name = user.name ?? null;
    if (user.email !== undefined) updateSet.email = user.email ?? null;
    if (user.loginMethod !== undefined) updateSet.loginMethod = user.loginMethod ?? null;
    if (user.role !== undefined) updateSet.role = user.role;
    if (user.passwordHash !== undefined) updateSet.passwordHash = user.passwordHash ?? null;
    if (user.lastSignedIn !== undefined) updateSet.lastSignedIn = user.lastSignedIn;
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.update(users).set({ ...updateSet, updatedAt: new Date() }).where(eq(users.id, existingUser.id));
    return;
  } catch (error) {
    logger.error("database_upsert_user_failed", { err: error });
    throw error;
  }
}

export async function upsertLocalUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db) {
    logger.warn("database_unavailable", { action: "upsertLocalUser" });
    return;
  }

  if (!user.username) {
    throw new Error("Username is required to create a local user");
  }

  const existing = await db.select().from(users).where(eq(users.username, user.username)).limit(1);
  const values: InsertUser = {
    username: user.username,
    passwordHash: user.passwordHash ?? null,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? "local",
    role: user.role ?? "user",
    openId: user.openId ?? null,
    lastSignedIn: user.lastSignedIn ?? new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    await db.update(users).set({ ...values, updatedAt: new Date() }).where(eq(users.id, existing[0].id));
    return;
  }

  await db.insert(users).values(values);
}

export async function createTrialRegistration(input: Omit<InsertTrialRegistration, "id" | "createdAt" | "updatedAt" | "status">) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  const existingTrial = await db.select({ id: trialRegistrations.id }).from(trialRegistrations).where(eq(trialRegistrations.email, input.email)).limit(1);
  if (existingUser.length > 0 || existingTrial.length > 0) {
    throw new Error("An account or trial registration already exists for this email");
  }

  const result = await db.insert(trialRegistrations).values({ ...input, status: "pending_setup" });
  return { id: Number((result as { insertId?: number }).insertId ?? 0), status: "pending_setup" as const };
}

export async function createSalesInquiry(input: Omit<InsertSalesInquiry, "id" | "createdAt" | "updatedAt" | "status">) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const result = await db.insert(salesInquiries).values({ ...input, status: "new" });
  return { id: Number((result as { insertId?: number }).insertId ?? 0), status: "new" as const };
}

export async function listTrialRegistrations() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return await db.select().from(trialRegistrations).orderBy(desc(trialRegistrations.createdAt));
}

export async function updateTrialRegistrationStatus(id: number, status: "pending_setup" | "converted" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(trialRegistrations).set({ status, updatedAt: new Date() }).where(eq(trialRegistrations.id, id));
  return { success: true } as const;
}

export async function listSalesInquiries() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return await db.select().from(salesInquiries).orderBy(desc(salesInquiries.createdAt));
}

export async function updateSalesInquiryStatus(id: number, status: "new" | "contacted" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(salesInquiries).set({ status, updatedAt: new Date() }).where(eq(salesInquiries.id, id));
  return { success: true } as const;
}

export async function ensureDefaultStaffSetup() {
  const db = await getDb();
  if (!db) return;

  const existingRoles = await db.select().from(staffRoles);
  if (existingRoles.length === 0) {
    const seededRoles = [
      { name: "Super Admin", slug: "super_admin", description: "Full system access", permissions: ["all"], isSystem: true },
      { name: "Admin", slug: "admin", description: "Administrative access", permissions: ["manage_pcs", "manage_customers", "manage_billing", "manage_inventory", "manage_printing", "view_reports"], isSystem: true },
      { name: "Manager", slug: "manager", description: "Operational oversight", permissions: ["manage_sessions", "manage_customers", "manage_printing", "manage_inventory", "view_reports"], isSystem: true },
      { name: "Cashier", slug: "cashier", description: "Billing and customer service", permissions: ["manage_billing", "manage_pos", "manage_printing", "manage_customers"], isSystem: true },
      { name: "Staff", slug: "staff", description: "Limited session support", permissions: ["start_sessions", "end_sessions", "view_customers"], isSystem: true },
    ];

    for (const role of seededRoles) {
      await db.insert(staffRoles).values({
        name: role.name,
        slug: role.slug,
        description: role.description,
        permissions: role.permissions as any,
        isSystem: role.isSystem,
      });
    }
  }

  const existingPermissions = await db.select().from(staffPermissions);
  if (existingPermissions.length === 0) {
    const seededPermissions = [
      { key: "all", label: "Full Access", description: "All system capabilities" , category: "system" },
      { key: "manage_pcs", label: "Manage PCs", description: "Create and edit workstations", category: "operations" },
      { key: "manage_customers", label: "Manage Customers", description: "Create and update customer records", category: "customers" },
      { key: "manage_billing", label: "Manage Billing", description: "Process billing and receipts", category: "billing" },
      { key: "manage_inventory", label: "Manage Inventory", description: "Manage stock and products", category: "inventory" },
      { key: "manage_printing", label: "Manage Printing", description: "Handle print jobs", category: "printing" },
      { key: "view_reports", label: "View Reports", description: "Review reports and analytics", category: "reports" },
      { key: "manage_sessions", label: "Manage Sessions", description: "Control session lifecycle", category: "sessions" },
      { key: "manage_pos", label: "Manage POS", description: "Access POS sales", category: "pos" },
      { key: "start_sessions", label: "Start Sessions", description: "Open new sessions", category: "sessions" },
      { key: "end_sessions", label: "End Sessions", description: "Close sessions", category: "sessions" },
      { key: "view_customers", label: "View Customers", description: "Read customer records", category: "customers" },
    ];

    for (const permission of seededPermissions) {
      await db.insert(staffPermissions).values(permission as InsertStaffPermission);
    }
  }

  const roles = await db.select().from(staffRoles);
  const permissions = await db.select().from(staffPermissions);
  const existingRolePermissions = await db.select().from(staffRolePermissions);
  if (existingRolePermissions.length === 0) {
    const roleMap = new Map(roles.map((role) => [role.slug, role.id]));
    const permissionMap = new Map(permissions.map((permission) => [permission.key, permission.id]));
    const assignments: Array<[roleSlug: string, permissionKey: string]> = [
      ["super_admin", "all"],
      ["admin", "manage_pcs"],
      ["admin", "manage_customers"],
      ["admin", "manage_billing"],
      ["admin", "manage_inventory"],
      ["admin", "manage_printing"],
      ["admin", "view_reports"],
      ["manager", "manage_sessions"],
      ["manager", "manage_customers"],
      ["manager", "manage_printing"],
      ["manager", "manage_inventory"],
      ["manager", "view_reports"],
      ["cashier", "manage_billing"],
      ["cashier", "manage_pos"],
      ["cashier", "manage_printing"],
      ["cashier", "manage_customers"],
      ["staff", "start_sessions"],
      ["staff", "end_sessions"],
      ["staff", "view_customers"],
    ];
    for (const [roleSlug, permissionKey] of assignments) {
      const roleId = roleMap.get(roleSlug);
      const permissionId = permissionMap.get(permissionKey);
      if (roleId && permissionId) {
        await db.insert(staffRolePermissions).values({ roleId, permissionId } as InsertStaffRolePermission);
      }
    }
  }
}

export async function getStaffByUsername(username: string) {
  const db = await getDb();
  if (!db) {
    logger.warn("database_unavailable", { action: "getStaffByUsername" });
    return undefined;
  }

  const result = await db.select().from(staffs).where(eq(staffs.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    logger.warn("database_unavailable", { action: "getUserByOpenId" });
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    logger.warn("database_unavailable", { action: "getUserById" });
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) {
    logger.warn("database_unavailable", { action: "getUserByUsername" });
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getStaffById(staffId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(staffs).where(eq(staffs.id, staffId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listStaffs(options: { search?: string; status?: string; roleId?: number } = {}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const whereClauses = [] as any[];
  if (options.search) {
    whereClauses.push(or(ilike(staffs.fullName, `%${options.search}%`), ilike(staffs.username, `%${options.search}%`), ilike(staffs.email, `%${options.search}%`)));
  }
  if (options.status) whereClauses.push(eq(staffs.status, options.status as any));
  if (options.roleId) whereClauses.push(eq(staffs.roleId, options.roleId));

  const items = await db.select().from(staffs)
    .leftJoin(staffRoles, eq(staffs.roleId, staffRoles.id))
    .where(whereClauses.length > 0 ? and(...whereClauses) : undefined)
    .orderBy(desc(staffs.createdAt));

  return { items: items.map((row: any) => ({ ...row.staffs, role: row.staffRoles })), total: items.length };
}

export async function createStaff(payload: InsertStaff) {
  const db = await getDb();
  if (!db) {
    const id = Date.now();
    return { id, ...payload, createdAt: new Date(), updatedAt: new Date() };
  }

  const inserted = await db.insert(staffs).values({
    ...payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as InsertStaff);
  return { id: (inserted as any)?.insertId ?? Date.now(), ...payload };
}

export async function updateStaff(staffId: number, updates: Partial<InsertStaff>) {
  const db = await getDb();
  if (!db) return { id: staffId, ...updates, updatedAt: new Date() };
  return await db.update(staffs).set({ ...updates, updatedAt: new Date() }).where(eq(staffs.id, staffId));
}

export async function deleteStaff(staffId: number) {
  const db = await getDb();
  if (!db) return { id: staffId, deleted: true };
  const existing = await db.select({ id: staffs.id }).from(staffs).where(eq(staffs.id, staffId)).limit(1);
  if (existing.length === 0) {
    throw new Error("Staff member not found");
  }
  return await db.delete(staffs).where(eq(staffs.id, staffId));
}

export async function getAllStaffRoles() {
  const db = await getDb();
  if (!db) return FALLBACK_STAFF_ROLES as any[];
  return await db.select().from(staffRoles).orderBy(staffRoles.name);
}

export async function getAllStaffPermissions() {
  const db = await getDb();
  if (!db) return FALLBACK_STAFF_PERMISSIONS as any[];
  return await db.select().from(staffPermissions).orderBy(staffPermissions.category, staffPermissions.label);
}

export async function getRolePermissions(roleId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(staffRolePermissions).where(eq(staffRolePermissions.roleId, roleId));
  return rows;
}

export async function assignPermissionsToRole(roleId: number, permissionIds: number[]) {
  const db = await getDb();
  if (!db) return { roleId, permissionIds };
  await db.delete(staffRolePermissions).where(eq(staffRolePermissions.roleId, roleId));
  if (permissionIds.length === 0) return { roleId, permissionIds };
  await db.insert(staffRolePermissions).values(permissionIds.map((permissionId) => ({ roleId, permissionId })) as InsertStaffRolePermission[]);
  return { roleId, permissionIds };
}

/**
 * Get effective permission keys for a staff role.
 * Queries staffRolePermissions and staffPermissions tables.
 * Returns array of permission key strings (e.g., ['manage_pcs', 'manage_customers'])
 */
export async function getStaffRoleEffectivePermissions(roleId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const rolePerms = await db
      .select({
        permissionKey: staffPermissions.key,
      })
      .from(staffRolePermissions)
      .leftJoin(staffPermissions, eq(staffRolePermissions.permissionId, staffPermissions.id))
      .where(eq(staffRolePermissions.roleId, roleId));
    
    return rolePerms
      .map(rp => rp.permissionKey)
      .filter((key): key is string => key !== null);
  } catch (error) {
    logger.error("get_staff_role_permissions_failed", { roleId, err: error });
    return [];
  }
}

export async function logStaffLogin(entry: InsertStaffLoginHistory) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.insert(staffLoginHistory).values(entry as InsertStaffLoginHistory);
}

export async function getStaffLoginHistory(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(staffLoginHistory).where(eq(staffLoginHistory.staffId, staffId)).orderBy(desc(staffLoginHistory.loginAt));
}

export async function logStaffActivity(entry: InsertStaffActivityLog) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.insert(staffActivityLogs).values(entry as InsertStaffActivityLog);
}

export async function getStaffActivityLogs(staffId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (staffId) {
    return await db.select().from(staffActivityLogs).where(eq(staffActivityLogs.staffId, staffId)).orderBy(desc(staffActivityLogs.createdAt));
  }
  return await db.select().from(staffActivityLogs).orderBy(desc(staffActivityLogs.createdAt));
}

// Computer management queries
function normalizeComputerStatus(status: string | null | undefined) {
  const normalized = (status ?? "offline").toString().trim().toLowerCase();
  switch (normalized) {
    case "available":
    case "online":
      return "available";
    case "in use":
    case "in_use":
    case "busy":
      return "in_use";
    case "reserved":
      return "reserved";
    case "maintenance":
    case "offline":
    default:
      return "offline";
  }
}

export async function getComputerById(computerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(computers).where(eq(computers.id, computerId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getComputerByName(pcName: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(computers).where(eq(computers.pcName, pcName)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllComputers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(computers).orderBy(computers.pcNumber, computers.pcName);
}

export async function createComputer(computerData: InsertComputer) {
  const db = await getDb();
  if (!db) {
    return { id: Date.now(), ...computerData, createdAt: new Date(), updatedAt: new Date() };
  }

  const payload = {
    ...computerData,
    status: normalizeComputerStatus(computerData.status as string | undefined),
    hourlyRate: computerData.hourlyRate ?? "0",
    isActive: computerData.isActive ?? true,
    lastActivity: computerData.lastActivity ?? new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as InsertComputer;

  const result = await db.insert(computers).values(payload);
  return { id: (result as any)?.insertId ?? Date.now(), ...payload };
}

export async function updateComputer(computerId: number, updates: Partial<InsertComputer>) {
  const db = await getDb();
  if (!db) {
    return { id: computerId, ...updates, updatedAt: new Date() };
  }

  const payload: Partial<InsertComputer> = { ...updates, updatedAt: new Date() };
  if (payload.status) {
    payload.status = normalizeComputerStatus(payload.status as string) as any;
  }

  return await db.update(computers).set(payload).where(eq(computers.id, computerId));
}

export async function deleteComputer(computerId: number) {
  const db = await getDb();
  if (!db) {
    return { id: computerId, deleted: true };
  }
  return await db.delete(computers).where(eq(computers.id, computerId));
}

export async function updateComputerStatus(computerId: number, status: string) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.update(computers).set({ status: normalizeComputerStatus(status), updatedAt: new Date() }).where(eq(computers.id, computerId));
}

// Session management queries
export async function createSession(sessionData: any) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(sessions).values(sessionData);
  return result;
}

export async function getActiveSessionByComputerId(computerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sessions)
    .where(and(eq(sessions.computerId, computerId), eq(sessions.sessionStatus, 'active')))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getActiveSessionByComputerName(pcName: string) {
  const db = await getDb();
  if (!db) return undefined;
  const computer = await getComputerByName(pcName);
  if (!computer) return undefined;
  return await getActiveSessionByComputerId(computer.id);
}

export async function getActiveSessionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.sessionStatus, 'active')))
    .orderBy(desc(sessions.startTime))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateSession(sessionId: number, updates: any) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.update(sessions).set({ ...updates, updatedAt: new Date() }).where(eq(sessions.id, sessionId));
}

export async function getSessionById(sessionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSessionHistory(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(sessions).orderBy(desc(sessions.startTime)).limit(limit);
}

// Pricing queries
export async function getActivePricingConfig() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pricingConfigs).where(eq(pricingConfigs.isActive, true)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllPricingConfigs() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(pricingConfigs).orderBy(desc(pricingConfigs.createdAt));
}

export async function createPricingConfig(configData: any) {
  const db = await getDb();
  if (!db) {
    return { id: Date.now(), ...configData, isActive: true };
  }
  return await db.insert(pricingConfigs).values(configData);
}

export async function updatePricingConfig(id: number, updates: any) {
  const db = await getDb();
  if (!db) {
    return { id, ...updates };
  }
  return await db.update(pricingConfigs).set({ ...updates, updatedAt: new Date() }).where(eq(pricingConfigs.id, id));
}

export async function deletePricingConfig(id: number) {
  const db = await getDb();
  if (!db) {
    return { id, deleted: true };
  }
  return await db.delete(pricingConfigs).where(eq(pricingConfigs.id, id));
}

// Transaction queries
export async function createTransaction(transactionData: any) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.insert(transactions).values(transactionData);
}

export async function getTransactionsBySessionId(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(transactions).where(eq(transactions.sessionId, sessionId));
}

// Receipt queries
export async function createReceipt(receiptData: any) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.insert(receipts).values(receiptData);
}

export async function getReceiptBySessionId(sessionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(receipts).where(eq(receipts.sessionId, sessionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Print job queries
export async function createPrintJob(printJobData: any) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.insert(printJobs).values(printJobData);
}

export async function getPrintJobsBySessionId(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(printJobs).where(eq(printJobs.sessionId, sessionId));
}

// Daily earnings query
export async function getDailyEarnings(date: Date) {
  const db = await getDb();
  if (!db) return 0;
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const result = await db.select().from(transactions)
    .where(and(
      gte(transactions.createdAt, startOfDay),
      lte(transactions.createdAt, endOfDay),
      eq(transactions.status, 'completed')
    ));
  
  return result.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
}

// Notification queries
export async function createNotification(notification: InsertNotification): Promise<void> {
  const db = await getDb();
  if (!db) {
    const userId = notification.userId;
    const nextNotification = {
      ...(notification as InsertNotification & { id?: number }),
      id: Date.now(),
      isRead: false,
      createdAt: new Date(),
      readAt: null,
    } as InsertNotification & { id: number; createdAt: Date; readAt?: Date | null; isRead: boolean };

    if (!userId) {
      return;
    }

    const existing = notificationStore.get(userId) ?? [];
    notificationStore.set(userId, [nextNotification, ...existing]);
    return;
  }

  try {
    await db.insert(notifications).values(notification);
  } catch (error) {
    logger.error("database_create_notification_failed", { err: error });
    throw error;
  }
}

export async function getNotificationsByUserId(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) {
    const stored = notificationStore.get(userId) ?? [];
    return stored.slice(0, limit);
  }

  try {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return result;
  } catch (error) {
    logger.error("database_get_notifications_failed", { err: error });
    throw error;
  }
}

export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) {
    const stored = notificationStore.get(userId) ?? [];
    return stored.filter((notification) => !notification.isRead);
  }

  try {
    const result = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .orderBy(desc(notifications.createdAt));
    return result;
  } catch (error) {
    logger.error("database_get_unread_notifications_failed", { err: error });
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    for (const [userId, storedNotifications] of Array.from(notificationStore.entries())) {
      const target = storedNotifications.find((notification) => notification.id === notificationId);
      if (target) {
        target.isRead = true;
        target.readAt = new Date();
        notificationStore.set(userId, [...storedNotifications]);
        break;
      }
    }
    return;
  }

  try {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, notificationId));
  } catch (error) {
    logger.error("database_mark_notification_read_failed", { err: error });
    throw error;
  }
}

export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) {
    const stored = notificationPreferenceStore.get(userId);
    if (stored) {
      return stored;
    }
    return getDefaultNotificationPreferences(userId);
  }

  try {
    const result = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
    if (result.length > 0) {
      return {
        ...getDefaultNotificationPreferences(userId),
        ...result[0],
        userId,
      };
    }
    return getDefaultNotificationPreferences(userId);
  } catch (error) {
    logger.error("database_get_notification_preferences_failed", { err: error });
    throw error;
  }
}

export async function updateNotificationPreferences(
  userId: number,
  preferences: Partial<InsertNotificationPreference>
): Promise<void> {
  const db = await (await import("./db")).getDb();
  if (!db) {
    const existing = notificationPreferenceStore.get(userId) ?? getDefaultNotificationPreferences(userId);
    notificationPreferenceStore.set(userId, {
      ...existing,
      ...preferences,
      userId,
    } as InsertNotificationPreference);
    return;
  }

  const updatePayload = Object.fromEntries(
    Object.entries(preferences).filter(([, value]) => value !== undefined)
  ) as Partial<InsertNotificationPreference>;

  try {
    const existingRows = await db
      .select({ userId: notificationPreferences.userId })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (existingRows.length > 0) {
      if (Object.keys(updatePayload).length === 0) {
        return;
      }

      await db
        .update(notificationPreferences)
        .set(updatePayload)
        .where(eq(notificationPreferences.userId, userId));
      return;
    }

    const defaultPreferences = getDefaultNotificationPreferences(userId);
    await db.insert(notificationPreferences).values({
      ...defaultPreferences,
      ...updatePayload,
      userId,
    } as InsertNotificationPreference);
  } catch (error) {
    logger.error("database_update_notification_preferences_failed", { err: error });
    throw error;
  }
}

// ============== SYSTEM SETTINGS FUNCTIONS ==============

const fallbackSettings = {
    general: {
    cafeName: "Cyber Café",
    logo: "",
    address: "Main Street",
    phoneNumber: "+1 555 0100",
    email: "hello@cybercafe.dev",
    website: "https://cybercafe.dev",
    currency: "NGN",
    currencySymbol: "₦",
    timeZone: "UTC",
    dateFormat: "MM/DD/YYYY",
    language: "en",
    theme: "dark",
    systemVersion: "1.0.0",
  },
  business: {
    defaultHourlyRate: 5,
    customPackages: [{ name: "Daily Pass", duration: 240, price: 15 }],
    printingPrices: { blackWhite: 0.2, color: 0.5 },
    scanningPrices: 0.1,
    photocopyPrices: 0.2,
    vatPercentage: 0,
    discountRules: { membership: 10, loyalty: 5 },
    membershipDiscounts: { regular: 5, vip: 10 },
  },
  pc: {
    defaultSessionDuration: 120,
    warningNotificationTime: 10,
    autoLogoutAfterSessionEnds: true,
    autoLockPc: true,
    autoShutdown: false,
  },
  receipt: {
    header: "Cyber Café",
    footer: "Thank you for visiting",
    logo: "",
    qrCode: true,
    receiptNumberFormat: "INV-{YYYY}-{MM}-{NN}",
    businessInformation: "VAT ID: 000000",
  },
  notifications: {
    sessionEndingSoon: true,
    sessionExpired: true,
    newCustomer: true,
    lowInventory: true,
    outOfStock: true,
    failedLoginAttempts: true,
    successfulBackup: true,
    systemErrors: true,
    soundNotifications: true,
    inAppNotifications: true,
    emailNotifications: false,
  },
  security: {
    passwordPolicy: "8+ chars with mix",
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    twoFactorAuthentication: false,
    ipRestrictions: false,
  },
  backup: {
    manualBackup: true,
    automaticDailyBackup: true,
    weeklyBackup: true,
    monthlyBackup: true,
    restoreBackup: true,
    backupHistory: true,
    databaseExport: true,
    databaseImport: true,
  },
};

let cachedSettings: any = null;

function buildSystemSettings(settings?: Partial<any> | null) {
  const baseSettings = { ...fallbackSettings, ...(cachedSettings ?? {}) };
  return {
    ...baseSettings,
    ...(settings ?? {}),
    general: { ...baseSettings.general, ...((settings?.general) ?? {}) },
    business: { ...baseSettings.business, ...((settings?.business) ?? {}) },
    pc: { ...baseSettings.pc, ...((settings?.pc) ?? {}) },
    receipt: { ...baseSettings.receipt, ...((settings?.receipt) ?? {}) },
    notifications: { ...baseSettings.notifications, ...((settings?.notifications) ?? {}) },
    security: { ...baseSettings.security, ...((settings?.security) ?? {}) },
    backup: { ...baseSettings.backup, ...((settings?.backup) ?? {}) },
    updatedAt: new Date(),
  };
}

export async function getSystemSettings() {
  const db = await getDb();
  if (!db) {
    return fallbackSettings;
  }

  try {
    const rows = await db.select().from(systemConfig).orderBy(desc(systemConfig.updatedAt)).limit(1);
    if (rows.length > 0) {
      return buildSystemSettings(rows[0] as any);
    }
    return fallbackSettings;
  } catch (error) {
    logger.error("database_get_system_settings_failed", { err: error });
    return fallbackSettings;
  }
}

export async function updateSystemSettings(settings: Partial<any>) {
  const db = await getDb();
  const merged = buildSystemSettings(settings);

  if (!db) {
    cachedSettings = merged;
    return cachedSettings;
  }

  try {
    const existing = await db.select().from(systemConfig).orderBy(desc(systemConfig.updatedAt)).limit(1);
    if (existing.length > 0) {
      await db.update(systemConfig).set(merged as any).where(eq(systemConfig.id, existing[0].id));
    } else {
      await db.insert(systemConfig).values(merged as InsertSystemConfig);
    }
    return merged;
  } catch (error) {
    logger.error("database_update_system_settings_failed", { err: error });
    throw error;
  }
}

export async function getBackupHistory() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(backupHistory).orderBy(desc(backupHistory.createdAt));
}

export async function createBackupRecord(payload: InsertBackupHistory) {
  const db = await getDb();
  if (!db) return { ...payload, id: Date.now() };
  return await db.insert(backupHistory).values(payload as InsertBackupHistory);
}

export async function createAuditLog(logData: any) {
  const db = await getDb();
  if (!db) return undefined;

  const payload = {
    userId: logData?.userId ?? null,
    computerId: logData?.computerId ?? null,
    action: logData?.action ?? "UNKNOWN_ACTION",
    details: logData?.details ?? null,
    ipAddress: logData?.ipAddress ?? null,
    createdAt: new Date(),
  };

  try {
    return await db.insert(auditLogs).values(payload as any);
  } catch (error) {
    logger.warn("database_create_audit_log_failed", { err: error, action: payload.action });
    return undefined;
  }
}

export async function getAuditLogs(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    return result;
  } catch (error) {
    logger.error("database_get_audit_logs_failed", { err: error });
    throw error;
  }
}

export async function getFailedLoginAttempts(
  userId: number | undefined,
  ipAddress: string | undefined,
  timeWindowMinutes: number
): Promise<number> {
  const db = await getDb();
  if (!db) {
    logger.warn("database_unavailable", { action: "getFailedLoginAttempts" });
    return 0;
  }

  try {
    const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const conditions = [
      gte(auditLogs.createdAt, timeWindow),
    ];

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }

    const result = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions));

    return result.filter(log => log.action === 'SECURITY_LOGIN_FAILED').length;
  } catch (error) {
    logger.error("database_get_failed_login_attempts_failed", { err: error });
    throw error;
  }
}

// ============== SESSION SECURITY FUNCTIONS ==============

export async function updateSessionToken(
  sessionId: number,
  token: string,
  expiresAt: Date
): Promise<void> {
  const db = await getDb();
  if (!db) {
    logger.warn("database_unavailable", { action: "updateSessionToken" });
    return;
  }

  try {
    await db
      .update(sessions)
      .set({ sessionToken: token, tokenExpiresAt: expiresAt })
      .where(eq(sessions.id, sessionId));
  } catch (error) {
    logger.error("database_update_session_token_failed", { err: error });
    throw error;
  }
}

// ============== REMOTE PC CONTROL FUNCTIONS ==============

export async function logPCControlEvent(
  computerId: number,
  action: 'shutdown' | 'restart' | 'lock' | 'unlock',
  initiatedBy: number | undefined,
  status: 'pending' | 'success' | 'failed'
): Promise<void> {
  const log: any = {
    computerId,
    action: `PC_${action.toUpperCase()}`,
    details: `PC control action: ${action} - Status: ${status}`,
    userId: initiatedBy,
  };
  await createAuditLog(log);
}

// ============== PRINT JOB TRACKING ==============

export async function getPrintJobsBySession(sessionId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    logger.warn("database_unavailable", { action: "getPrintJobs" });
    return [];
  }

  try {
    const result = await db
      .select()
      .from(printJobs)
      .where(eq(printJobs.sessionId, sessionId));
    return result;
  } catch (error) {
    logger.error("database_get_print_jobs_failed", { err: error });
    throw error;
  }
}

export async function updatePrintJobStatus(
  jobId: number,
  status: 'pending' | 'printing' | 'completed' | 'failed'
): Promise<void> {
  const db = await getDb();
  if (!db) {
    logger.warn("database_unavailable", { action: "updatePrintJob" });
    return;
  }

  try {
    await db
      .update(printJobs)
      .set({ status })
      .where(eq(printJobs.id, jobId));
  } catch (error) {
    logger.error("database_update_print_job_failed", { err: error });
    throw error;
  }
}
