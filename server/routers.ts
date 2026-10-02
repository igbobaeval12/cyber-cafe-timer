import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { createApiErrorPayload, getRequestId, normalizeDateInput, normalizeEmail, normalizeOptionalString, normalizePositiveInteger } from "./_core/validation";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { logger } from "./_core/logger";
import { hashPassword, verifyPassword } from "./_core/passwordUtils";
import { getPcDashboardStats } from "./_core/pcManagement";
import {
  endSession,
  expireSession,
  extendSession,
  getActiveSessions,
  getSessionHistory,
  pauseSession,
  resumeSession,
  startSession,
  syncSessionTimer,
} from "./_core/sessionEngine";
import {
  calculateBill,
  createBill,
  generateReceipt,
  getAllBills,
  getBillingSummary,
  getBillById,
  getReceiptHistory,
  recordPayment,
  updateBill,
} from "./_core/billing";
import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomerDashboardStats,
  getCustomerHistory,
  searchCustomers,
  updateCustomer,
} from "./_core/customers";
import {
  completePrintJob,
  createPrintJob,
  deletePrintJob,
  getPrintDashboardStats,
  getPrintHistory,
  getPrintJobs,
  getPrintServices,
  updatePrintJob,
} from "./_core/printing";
import {
  createProduct,
  createSale,
  deleteProduct,
  getInventoryDashboardStats,
  getProducts,
  getSalesHistory,
  stockInProduct,
  stockOutProduct,
  updateProduct,
} from "./_core/inventory";
import {
  getCustomerReport,
  getInventoryReport,
  getPrintingReport,
  getRevenueReport,
  getReportsOverview,
  getSessionReport,
  getStaffReport,
} from "./_core/reports";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { hasAdminAccess, hasPermission, hasStaffPermission } from "./_core/authorization";
import { notifyLeadInBackground } from "./_core/email";

function normalizeRoleSlug(role: string | undefined) {
  return (role || "staff").toLowerCase().replace(/\s+/g, "_");
}

function createApiError(message: string, code = "INTERNAL_SERVER_ERROR") {
  return { success: false, error: message, code };
}

function ensureAdminAccess(userRole: string | undefined) {
  if (!hasAdminAccess(userRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
  }
}

/**
 * Check if user has required permission using loaded database permissions.
 * For admin/super_admin: grants access automatically.
 * For staff: checks permissions loaded from staffRolePermissions table.
 */
function ensurePermissionFromContext(ctx: any, permission: string) {
  const user = ctx.user;

  if (hasAdminAccess(user?.role)) {
    return;
  }

  const effectivePermissions = (user as any)?.permissions;

  if (!hasStaffPermission(effectivePermissions, permission)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized: insufficient permissions" });
  }
}

function ensureCustomerAccount(ctx: any) {
  if (ctx.user?.accountType !== "user") {
    throw new TRPCError({ code: "FORBIDDEN", message: "This operation is only available to customer accounts" });
  }
}

/**
 * Legacy permission check based on role slug.
 * Used for backward compatibility.
 */
function ensureStaffPermission(userRole: string | undefined, permission: string) {
  if (!hasPermission(userRole, permission) && !hasAdminAccess(userRole)) {
    throw new Error("Unauthorized");
  }
}

const leadContactFields = {
  fullName: z.string().trim().min(1).max(160),
  businessName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(7).max(30).regex(/^[+()\d\s.-]+$/, "Invalid phone number"),
  numberOfPcs: z.number().int().positive().max(100000),
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({ username: z.string().trim().min(1), password: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const requestId = getRequestId(ctx.req, ctx.res);
        try {
          const user = await db.getUserByUsername(input.username);

          if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
            logger.warn("auth_login_failed", { requestId, reason: "invalid_credentials", username: input.username });
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
          }

          if (!hasAdminAccess(user.role)) {
            logger.warn("auth_login_failed", { requestId, reason: "forbidden_role", username: input.username, role: user.role });
            throw new Error("Only administrators can access this portal");
          }

          const sessionToken = await sdk.createLocalSessionToken(user.id, user.username!, { expiresInMs: ONE_YEAR_MS });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

          await db.upsertUser({
            openId: user.openId,
            lastSignedIn: new Date(),
          });

          return { success: true, user: { ...user, passwordHash: undefined } };
        } catch (error: unknown) {
          if (error instanceof TRPCError) {
            throw error;
          }
          const message = error instanceof Error ? error.message : "Login failed";
          logger.error("auth_login_error", { requestId, err: error });
          throw new Error(message || "Login failed");
        }
      }),
    customerLogin: publicProcedure
      .input(z.object({
        username: z.string().trim().min(1),
        password: z.string().min(1),
        workstationId: z.string().trim().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const requestId = getRequestId(ctx.req, ctx.res);
        try {
          const workstationId = input.workstationId.trim();
          const user = await db.getUserByUsername(input.username.trim());

          if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
            logger.warn("customer_login_failed", { requestId, reason: "invalid_credentials", username: input.username });
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
          }

          if (user.role !== "user") {
            logger.warn("customer_login_failed", { requestId, reason: "forbidden_role", username: input.username, role: user.role });
            throw new TRPCError({ code: "FORBIDDEN", message: "Only customer accounts can access this portal" });
          }

          const workstation = await db.getComputerByName(workstationId);

          if (!workstation) {
            logger.warn("customer_login_failed", { requestId, reason: "unknown_workstation", username: input.username, workstationId });
            throw new TRPCError({ code: "FORBIDDEN", message: "This workstation is not registered" });
          }

          let [activeSession, workstationSession] = await Promise.all([
            db.getActiveSessionByUserId(user.id),
            db.getActiveSessionByComputerId(workstation.id),
          ]);

          if (!activeSession || !workstationSession) {
            logger.warn("customer_login_failed", { requestId, reason: "no_active_workstation_session", username: input.username, workstationId });
            throw new TRPCError({ code: "UNAUTHORIZED", message: "No active customer session for this workstation" });
          }

          if (activeSession.id !== workstationSession.id || activeSession.userId !== user.id || activeSession.computerId !== workstation.id) {
            logger.warn("customer_login_failed", { requestId, reason: "workstation_session_mismatch", username: input.username, userId: user.id, workstationId, sessionId: activeSession.id, workstationSessionId: workstationSession.id });
            throw new TRPCError({ code: "FORBIDDEN", message: "This workstation does not match the active session" });
          }

          if (activeSession && (activeSession.sessionStatus !== "active" || (activeSession.endTime && new Date(activeSession.endTime).getTime() <= Date.now()))) {
            try {
              await expireSession(activeSession.id);
            } catch (_error) {
              // Keep the existing expiration bookkeeping while blocking client access.
            }
            logger.info("customer_login_without_active_session", { requestId, userId: user.id, sessionId: activeSession.id });
            activeSession = undefined;
          }

          if (!activeSession) {
            logger.warn("customer_login_failed", { requestId, reason: "no_active_session_after_validation", username: input.username, workstationId });
            throw new TRPCError({ code: "UNAUTHORIZED", message: "No active customer session for this workstation" });
          }

          const sessionToken = await sdk.createLocalSessionToken(user.id, user.username!, { expiresInMs: ONE_YEAR_MS });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

          await db.upsertUser({
            openId: user.openId,
            lastSignedIn: new Date(),
          });

          return {
            success: true,
            user: { ...user, passwordHash: undefined },
            session: activeSession && activeSession.sessionStatus === "active" && (!activeSession.endTime || new Date(activeSession.endTime).getTime() > Date.now())
              ? {
                  id: activeSession.id,
                  userId: activeSession.userId,
                  computerId: activeSession.computerId,
                  startTime: activeSession.startTime,
                  endTime: activeSession.endTime,
                  totalDurationMinutes: activeSession.totalDurationMinutes,
                  sessionStatus: activeSession.sessionStatus,
                }
              : null,
          };
        } catch (error: unknown) {
          if (error instanceof TRPCError) {
            throw error;
          }
          const message = error instanceof Error ? error.message : "Login failed";
          logger.error("customer_login_error", { requestId, err: error });
          throw new Error(message || "Login failed");
        }
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  leads: router({
    registerTrial: publicProcedure
      .input(z.object(leadContactFields))
      .mutation(async ({ input }) => {
        const result = await db.createTrialRegistration(input);
        notifyLeadInBackground({ type: "trial", lead: input });
        return result;
      }),
    submitSalesInquiry: publicProcedure
      .input(z.object({ ...leadContactFields, message: z.string().trim().min(1).max(5000) }))
      .mutation(async ({ input }) => {
        const result = await db.createSalesInquiry(input);
        notifyLeadInBackground({ type: "sales", lead: input });
        return result;
      }),
    listTrialRegistrations: adminProcedure.query(async () => {
      return await db.listTrialRegistrations();
    }),
    updateTrialRegistrationStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["pending_setup", "converted", "rejected"]) }))
      .mutation(async ({ input }) => {
        return await db.updateTrialRegistrationStatus(input.id, input.status);
      }),
    listSalesInquiries: adminProcedure.query(async () => {
      return await db.listSalesInquiries();
    }),
    updateSalesInquiryStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["new", "contacted", "closed"]) }))
      .mutation(async ({ input }) => {
        return await db.updateSalesInquiryStatus(input.id, input.status);
      }),
  }),

  staffs: router({
    login: publicProcedure
      .input(z.object({ username: z.string().trim().min(1), password: z.string().min(1), ipAddress: z.string().optional(), userAgent: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const requestId = getRequestId(ctx.req, ctx.res);
        const staff = await db.getStaffByUsername(input.username);
        if (!staff) {
          logger.warn("staff_login_failed", { requestId, reason: "unknown_user", username: input.username });
          throw new Error("Invalid username or password");
        }

        if (staff.isLocked || (staff.failedLoginAttempts ?? 0) >= 5) {
          logger.warn("staff_login_failed", { requestId, reason: "account_locked", staffId: staff.id });
          throw new Error("Account locked. Please contact an administrator.");
        }

        if (staff.status !== "active") {
          logger.warn("staff_login_failed", { requestId, reason: "inactive_account", staffId: staff.id, status: staff.status });
          throw new Error("Staff account is inactive");
        }

        const passwordOk = bcrypt.compareSync(input.password, staff.passwordHash);
        if (!passwordOk) {
          const failedAttempts = (staff.failedLoginAttempts ?? 0) + 1;
          await db.updateStaff(staff.id, { failedLoginAttempts: failedAttempts, isLocked: failedAttempts >= 5 });
          await db.logStaffLogin({ staffId: staff.id, ipAddress: input.ipAddress, userAgent: input.userAgent, success: false, details: "Incorrect password" });
          logger.warn("staff_login_failed", { requestId, reason: "invalid_password", staffId: staff.id });
          throw new Error("Invalid username or password");
        }

        const role = await db.getAllStaffRoles().then((roles) => roles.find((item) => item.id === staff.roleId));
        const sessionToken = await sdk.createLocalSessionToken(staff.id, staff.username, { expiresInMs: ONE_YEAR_MS, accountType: "staff" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        await db.updateStaff(staff.id, { lastLogin: new Date(), failedLoginAttempts: 0, isLocked: false });
        await db.logStaffLogin({ staffId: staff.id, ipAddress: input.ipAddress, userAgent: input.userAgent, success: true, details: "Successful login" });
        await db.logStaffActivity({ staffId: staff.id, action: "login", details: "Staff signed in", ipAddress: input.ipAddress });

        const effectivePermissions = await db.getStaffRoleEffectivePermissions(staff.roleId);

        return {
          success: true,
          staff: {
            ...staff,
            passwordHash: undefined,
            roleName: role?.name,
            roleSlug: role?.slug,
            permissions: effectivePermissions,
            accountType: "staff",
          },
        };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
    list: protectedProcedure
      .input(z.object({ search: z.string().optional(), status: z.string().optional(), roleId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        return await db.listStaffs(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        return await db.getStaffById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        fullName: z.string().trim().min(1),
        username: z.string().trim().min(1),
        email: z.string().trim().email().optional().or(z.literal("")),
        phoneNumber: z.string().trim().optional(),
        password: z.string().min(6),
        roleId: z.number().int().positive(),
        profilePhoto: z.string().trim().optional(),
        employmentDate: z.string().optional(),
        salary: z.string().trim().optional(),
        status: z.enum(["active", "suspended", "inactive"]).default("active"),
      }))
      .mutation(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        const staffId = `STF-${Date.now().toString().slice(-6)}`;
        const hashedPassword = bcrypt.hashSync(input.password, 10);
        return await db.createStaff({
          staffId,
          fullName: normalizeOptionalString(input.fullName) ?? input.fullName,
          username: normalizeOptionalString(input.username) ?? input.username,
          email: normalizeEmail(input.email) ?? null,
          phoneNumber: normalizeOptionalString(input.phoneNumber) ?? null,
          passwordHash: hashedPassword,
          roleId: input.roleId,
          profilePhoto: normalizeOptionalString(input.profilePhoto) ?? null,
          employmentDate: normalizeDateInput(input.employmentDate) ?? new Date(),
          salary: normalizeOptionalString(input.salary) ?? null,
          status: input.status,
        } as any);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        fullName: z.string().optional(),
        username: z.string().optional(),
        email: z.string().optional(),
        phoneNumber: z.string().optional(),
        roleId: z.number().optional(),
        profilePhoto: z.string().optional(),
        employmentDate: z.string().optional(),
        salary: z.string().optional(),
        status: z.enum(["active", "suspended", "inactive"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        const updates: Record<string, unknown> = {};
        if (input.fullName !== undefined) updates.fullName = normalizeOptionalString(input.fullName) ?? input.fullName;
        if (input.username !== undefined) updates.username = normalizeOptionalString(input.username) ?? input.username;
        if (input.email !== undefined) updates.email = normalizeEmail(input.email) ?? null;
        if (input.phoneNumber !== undefined) updates.phoneNumber = normalizeOptionalString(input.phoneNumber) ?? null;
        if (input.roleId !== undefined) updates.roleId = normalizePositiveInteger(input.roleId, 1);
        if (input.profilePhoto !== undefined) updates.profilePhoto = normalizeOptionalString(input.profilePhoto) ?? null;
        if (input.employmentDate !== undefined) updates.employmentDate = normalizeDateInput(input.employmentDate) ?? new Date();
        if (input.salary !== undefined) updates.salary = normalizeOptionalString(input.salary) ?? null;
        if (input.status !== undefined) updates.status = input.status;
        return await db.updateStaff(input.id, updates);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        return await db.deleteStaff(input.id);
      }),
    suspend: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(["active", "suspended", "inactive"]).default("suspended") }))
      .mutation(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        return await db.updateStaff(input.id, { status: input.status });
      }),
    resetPassword: protectedProcedure
      .input(z.object({ id: z.number(), password: z.string().min(6) }))
      .mutation(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        return await db.updateStaff(input.id, { passwordHash: bcrypt.hashSync(input.password, 10), failedLoginAttempts: 0, isLocked: false });
      }),
    changePassword: protectedProcedure
      .input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(6) }))
      .mutation(async ({ input, ctx }) => {
        const staff = await db.getStaffById(ctx.user.id);
        if (!staff) throw new Error("Staff not found");
        const passwordOk = bcrypt.compareSync(input.currentPassword, staff.passwordHash);
        if (!passwordOk) throw new Error("Current password is incorrect");
        await db.updateStaff(staff.id, { passwordHash: bcrypt.hashSync(input.newPassword, 10) });
        return { success: true };
      }),
    getRoles: protectedProcedure.query(async ({ ctx }) => {
      ensureAdminAccess(ctx.user.role);
      return await db.getAllStaffRoles();
    }),
    getPermissions: protectedProcedure.query(async ({ ctx }) => {
      ensureAdminAccess(ctx.user.role);
      return await db.getAllStaffPermissions();
    }),
    getRolePermissions: protectedProcedure
      .input(z.object({ roleId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        return await db.getRolePermissions(input.roleId);
      }),
    assignPermissions: protectedProcedure
      .input(z.object({ roleId: z.number(), permissionIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        return await db.assignPermissionsToRole(input.roleId, input.permissionIds);
      }),
    loginHistory: protectedProcedure
      .input(z.object({ id: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        const targetId = input.id ?? ctx.user.id;
        return await db.getStaffLoginHistory(targetId);
      }),
    activityLogs: protectedProcedure.query(async ({ ctx }) => {
      ensureAdminAccess(ctx.user.role);
      return await db.getStaffActivityLogs();
    }),
    dashboardStats: protectedProcedure.query(async ({ ctx }) => {
      ensureAdminAccess(ctx.user.role);
      const staffsList = await db.listStaffs();
      const activeStaff = staffsList.items.filter((staff: any) => staff.status === "active").length;
      return {
        totalStaff: staffsList.items.length,
        activeStaff,
        onlineStaff: staffsList.items.filter((staff: any) => staff.lastLogin).length,
        currentlyWorking: staffsList.items.filter((staff: any) => staff.status === "active").length,
      };
    }),
  }),

  // Computer management
  computers: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      ensurePermissionFromContext(ctx, "manage_pcs");
      return await db.getAllComputers();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_pcs");
        return await db.getComputerById(input.id);
      }),
    getByName: protectedProcedure
      .input(z.object({ pcName: z.string() }))
      .query(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_pcs");
        return await db.getComputerByName(input.pcName);
      }),
    create: protectedProcedure
      .input(z.object({
        pcNumber: z.number().int().positive().optional(),
        pcName: z.string().min(1),
        status: z.string().default('available'),
        currentCustomer: z.string().optional().default(''),
        remainingTime: z.string().optional().default(''),
        currentSession: z.string().optional().default(''),
        hourlyRate: z.string().optional().default('0'),
        lastActivity: z.string().optional().default(''),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_pcs");
        return await db.createComputer({
          pcNumber: input.pcNumber,
          pcName: input.pcName,
          status: input.status,
          currentCustomer: normalizeOptionalString(input.currentCustomer) ?? null,
          remainingTime: normalizeOptionalString(input.remainingTime) ?? null,
          currentSession: normalizeOptionalString(input.currentSession) ?? null,
          hourlyRate: normalizeOptionalString(input.hourlyRate) ?? "0",
          lastActivity: normalizeDateInput(input.lastActivity) ?? new Date(),
          isActive: input.isActive,
        } as any);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        pcNumber: z.number().int().positive().optional(),
        pcName: z.string().min(1).optional(),
        status: z.string().optional(),
        currentCustomer: z.string().optional(),
        remainingTime: z.string().optional(),
        currentSession: z.string().optional(),
        hourlyRate: z.string().optional(),
        lastActivity: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_pcs");
        const updates: any = {};
        if (input.pcNumber !== undefined) updates.pcNumber = input.pcNumber;
        if (input.pcName !== undefined) updates.pcName = input.pcName;
        if (input.status !== undefined) updates.status = input.status;
        if (input.currentCustomer !== undefined) updates.currentCustomer = normalizeOptionalString(input.currentCustomer) ?? null;
        if (input.remainingTime !== undefined) updates.remainingTime = normalizeOptionalString(input.remainingTime) ?? null;
        if (input.currentSession !== undefined) updates.currentSession = normalizeOptionalString(input.currentSession) ?? null;
        if (input.hourlyRate !== undefined) updates.hourlyRate = normalizeOptionalString(input.hourlyRate) ?? "0";
        if (input.lastActivity !== undefined) updates.lastActivity = normalizeDateInput(input.lastActivity) ?? null;
        if (input.isActive !== undefined) updates.isActive = input.isActive;
        return await db.updateComputer(input.id, updates);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_pcs");
        return await db.deleteComputer(input.id);
      }),
    changeStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.string() }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_pcs");
        return await db.updateComputerStatus(input.id, input.status);
      }),
    dashboardStats: protectedProcedure.query(async ({ ctx }) => {
      ensurePermissionFromContext(ctx, "manage_pcs");
      const pcs = await db.getAllComputers();
      return getPcDashboardStats(pcs.map((pc: any) => ({
        id: pc.id,
        status: pc.status,
        isActive: pc.isActive,
      })));
    }),
  }),

  // Session management
  sessions: router({
    start: protectedProcedure
      .input(z.object({
        computerId: z.number(),
        customerId: z.number().optional(),
        pricingConfigId: z.number().optional(),
        paymentMode: z.enum(['prepaid', 'postpaid']).optional(),
        durationMinutes: z.number().int().positive().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_sessions");
        const pricingConfig = input.pricingConfigId
          ? { id: input.pricingConfigId }
          : await db.getActivePricingConfig();
        if (!pricingConfig) {
          throw new Error("No active pricing configuration is available");
        }
        return await startSession({
          computerId: input.computerId,
          userId: ctx.user.id,
          customerId: input.customerId,
          pricingConfigId: pricingConfig.id,
          paymentMode: input.paymentMode,
          durationMinutes: input.durationMinutes,
          notes: input.notes,
        });
      }),
    pause: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_sessions");
        return await pauseSession(input.sessionId);
      }),
    resume: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_sessions");
        return await resumeSession(input.sessionId);
      }),
    extend: protectedProcedure
      .input(z.object({ sessionId: z.number(), additionalMinutes: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_sessions");
        return await extendSession(input.sessionId, input.additionalMinutes);
      }),
    end: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_sessions");
        return await endSession(input.sessionId);
      }),
    getActive: protectedProcedure.query(async ({ ctx }) => {
      ensurePermissionFromContext(ctx, "manage_sessions");
      return await getActiveSessions();
    }),
    getActiveByComputer: protectedProcedure
      .input(z.object({ computerId: z.number() }))
      .query(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_sessions");
        return await db.getActiveSessionByComputerId(input.computerId);
      }),
    syncTimer: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_sessions");
        return await syncSessionTimer(input.sessionId);
      }),
    getById: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input, ctx }) => {
        ensureCustomerAccount(ctx);
        const session = await db.getSessionById(input.sessionId);
        if (!session) {
          return null;
        }
        if (ctx.user.role !== 'admin' && session.userId !== ctx.user.id) {
          throw new Error('Unauthorized');
        }
        return session;
      }),
    getActiveForUser: protectedProcedure
      .query(async ({ ctx }) => {
        ensureCustomerAccount(ctx);
        const session = await db.getActiveSessionByUserId(ctx.user.id);
        if (!session) {
          return null;
        }
        if (session.sessionStatus !== 'active' || (session.endTime && new Date(session.endTime).getTime() <= Date.now())) {
          try {
            await expireSession(session.id);
          } catch (_error) {
            // Preserve the expiration flow without creating a new session.
          }
          return null;
        }
        return session;
      }),
    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_sessions");
        return await getSessionHistory(input.limit);
      }),
  }),

  // Pricing management
  pricing: router({
    getActive: publicProcedure.query(async () => {
      return await db.getActivePricingConfig();
    }),
    getAll: protectedProcedure.query(async ({ ctx }) => {
      ensureAdminAccess(ctx.user.role);
      return await db.getAllPricingConfigs();
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        hourlyRate: z.string(),
        minimumCharge: z.string().default('0'),
        discountPercentage: z.string().default('0'),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        return await db.createPricingConfig({
          name: input.name,
          hourlyRate: input.hourlyRate,
          minimumCharge: input.minimumCharge,
          discountPercentage: input.discountPercentage,
          isActive: input.isActive,
        });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        hourlyRate: z.string().optional(),
        minimumCharge: z.string().optional(),
        discountPercentage: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        return await db.updatePricingConfig(input.id, {
          ...(input.name ? { name: input.name } : {}),
          ...(input.hourlyRate ? { hourlyRate: input.hourlyRate } : {}),
          ...(input.minimumCharge ? { minimumCharge: input.minimumCharge } : {}),
          ...(input.discountPercentage ? { discountPercentage: input.discountPercentage } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        return await db.deletePricingConfig(input.id);
      }),
  }),

  // Customer Management
  customers: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        username: z.string().trim().min(1).optional(),
        password: z.string().min(6).optional(),
        phoneNumber: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        membershipTier: z.enum(['walk_in', 'regular', 'vip', 'student', 'corporate']).optional(),
        customerStatus: z.enum(['active', 'inactive', 'blacklisted']).optional(),
        notes: z.string().optional(),
        loyaltyPoints: z.number().int().nonnegative().optional(),
        prepaidBalance: z.number().nonnegative().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_customers");
        if (!input.password) {
          throw new Error('Password is required');
        }
        return await createCustomer({
          name: input.name,
          username: input.username,
          password: input.password,
          phoneNumber: input.phoneNumber,
          email: input.email || undefined,
          membershipTier: input.membershipTier,
          customerStatus: input.customerStatus,
          notes: input.notes,
          loyaltyPoints: input.loyaltyPoints,
          prepaidBalance: input.prepaidBalance,
        });
      }),
    update: protectedProcedure
      .input(z.object({
        customerId: z.number(),
        name: z.string().optional(),
        phoneNumber: z.string().optional(),
        email: z.string().optional(),
        membershipTier: z.enum(['walk_in', 'regular', 'vip', 'student', 'corporate']).optional(),
        customerStatus: z.enum(['active', 'inactive', 'blacklisted']).optional(),
        notes: z.string().optional(),
        loyaltyPoints: z.number().int().nonnegative().optional(),
        prepaidBalance: z.number().nonnegative().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_customers");
        return await updateCustomer(input.customerId, {
          name: input.name,
          phoneNumber: input.phoneNumber,
          email: input.email,
          membershipTier: input.membershipTier,
          customerStatus: input.customerStatus,
          notes: input.notes,
          loyaltyPoints: input.loyaltyPoints,
          prepaidBalance: input.prepaidBalance,
        });
      }),
    delete: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_customers");
        return await deleteCustomer(input.customerId);
      }),
    getById: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_customers");
        return await getCustomerById(input.customerId);
      }),
    search: protectedProcedure
      .input(z.object({ query: z.string().default(''), limit: z.number().int().positive().default(50) }))
      .query(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_customers");
        return await searchCustomers(input.query, input.limit);
      }),
    getHistory: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_customers");
        return await getCustomerHistory(input.customerId);
      }),
    dashboardStats: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        return await getCustomerDashboardStats(input.customerId);
      }),
  }),

  // Billing & Receipts
  bills: router({
    create: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        userId: z.number().optional(),
        pricingType: z.enum(['hourly', 'fixed', 'custom']).optional(),
        hourlyRate: z.number().optional(),
        fixedPackagePrice: z.number().optional(),
        customPrice: z.number().optional(),
        durationMinutes: z.number().int().nonnegative().optional(),
        additionalCharges: z.array(z.object({
          name: z.string(),
          amount: z.number(),
          quantity: z.number().int().positive().optional(),
        })).optional(),
        discountAmount: z.number().optional(),
        paymentMethod: z.enum(['cash', 'bank_transfer', 'pos', 'mobile']).optional(),
        notes: z.string().optional(),
        status: z.enum(['paid', 'unpaid']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_billing");
        return await createBill({
          sessionId: input.sessionId,
          userId: input.userId ?? ctx.user.id,
          pricingType: input.pricingType,
          hourlyRate: input.hourlyRate,
          fixedPackagePrice: input.fixedPackagePrice,
          customPrice: input.customPrice,
          durationMinutes: input.durationMinutes,
          additionalCharges: input.additionalCharges,
          discountAmount: input.discountAmount,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          status: input.status,
        });
      }),
    update: protectedProcedure
      .input(z.object({
        billId: z.number(),
        pricingType: z.enum(['hourly', 'fixed', 'custom']).optional(),
        paymentMethod: z.enum(['cash', 'bank_transfer', 'pos', 'mobile']).optional(),
        additionalCharges: z.number().optional(),
        discountAmount: z.number().optional(),
        notes: z.string().nullable().optional(),
        status: z.enum(['paid', 'unpaid']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_billing");
        return await updateBill(input.billId, {
          pricingType: input.pricingType,
          paymentMethod: input.paymentMethod,
          additionalCharges: input.additionalCharges,
          discountAmount: input.discountAmount,
          notes: input.notes,
          status: input.status,
        });
      }),
    getById: protectedProcedure
      .input(z.object({ billId: z.number() }))
      .query(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_billing");
        return await getBillById(input.billId);
      }),
    getAll: protectedProcedure.query(async ({ ctx }) => {
      ensurePermissionFromContext(ctx, "manage_billing");
      return await getAllBills();
    }),
    summary: protectedProcedure.query(async ({ ctx }) => {
      ensurePermissionFromContext(ctx, "manage_billing");
      return await getBillingSummary();
    }),
    recordPayment: protectedProcedure
      .input(z.object({
        billId: z.number(),
        sessionId: z.number(),
        amount: z.number().nonnegative(),
        paymentMethod: z.enum(['cash', 'bank_transfer', 'pos', 'mobile']),
        referenceNumber: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_billing");
        return await recordPayment(input);
      }),
    generateReceipt: protectedProcedure
      .input(z.object({
        billId: z.number(),
        sessionId: z.number(),
        customerName: z.string().optional(),
        staffName: z.string().optional(),
        paymentMethod: z.enum(['cash', 'bank_transfer', 'pos', 'mobile']).optional(),
        servicesUsed: z.string().optional(),
        itemizedCharges: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_billing");
        return await generateReceipt(input);
      }),
    getReceiptHistory: protectedProcedure
      .input(z.object({ limit: z.number().int().positive().default(20) }))
      .query(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_billing");
        return await getReceiptHistory(input.limit);
      }),
  }),

  // Transactions
  transactions: router({
    create: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        transactionType: z.enum(['session_charge', 'prepaid_deposit', 'refund', 'print_charge']),
        amount: z.string(),
        paymentMethod: z.enum(['cash', 'card', 'prepaid_balance', 'other']),
      }))
      .mutation(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        return await db.createTransaction({
          sessionId: input.sessionId,
          userId: ctx.user.id,
          transactionType: input.transactionType,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          status: 'completed',
        });
      }),
    getBySession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_billing");
        return await db.getTransactionsBySessionId(input.sessionId);
      }),
  }),

  // Receipts
  receipts: router({
    create: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        receiptNumber: z.string(),
        computerId: z.number(),
        startTime: z.date(),
        endTime: z.date(),
        durationMinutes: z.number(),
        hourlyRate: z.string(),
        sessionCost: z.string(),
        printCost: z.string().optional(),
        totalCost: z.string(),
        paymentMethod: z.enum(['cash', 'card', 'prepaid_balance', 'other']),
      }))
      .mutation(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        return await db.createReceipt({
          sessionId: input.sessionId,
          receiptNumber: input.receiptNumber,
          userId: ctx.user.id,
          computerId: input.computerId,
          startTime: input.startTime,
          endTime: input.endTime,
          durationMinutes: input.durationMinutes,
          hourlyRate: input.hourlyRate,
          sessionCost: input.sessionCost,
          printCost: input.printCost || '0',
          totalCost: input.totalCost,
          paymentMethod: input.paymentMethod,
        });
      }),
    getBySession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input, ctx }) => {
        ensurePermissionFromContext(ctx, "manage_billing");
        return await db.getReceiptBySessionId(input.sessionId);
      }),
  }),

  // Notifications
  notifications: router({
    getUnread: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadNotifications(ctx.user.id);
    }),
    getAll: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        return await db.getNotificationsByUserId(ctx.user.id, input.limit);
      }),
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verify notification belongs to user before marking as read
        const notifications = await db.getNotificationsByUserId(ctx.user.id, 1000);
        const notification = notifications.find((n) => n.id === input.id);
        if (!notification) {
          throw new Error("Notification not found or access denied");
        }
        await db.markNotificationAsRead(input.id);
        return { success: true };
      }),
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      const prefs = await db.getNotificationPreferences(ctx.user.id);
      // Return default preferences if none exist
      return prefs || {
        userId: ctx.user.id,
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
      };
    }),
    updatePreferences: protectedProcedure
      .input(z.object({
        enableSessionExpired: z.boolean().optional(),
        enableTimeWarning: z.boolean().optional(),
        enablePcOffline: z.boolean().optional(),
        enablePaymentFailed: z.boolean().optional(),
        enableLowBalance: z.boolean().optional(),
        enableSystemAlert: z.boolean().optional(),
        enableSoundAlerts: z.boolean().optional(),
        enablePushNotifications: z.boolean().optional(),
        enableEmailNotifications: z.boolean().optional(),
        timeWarningMinutes: z.number().min(1).max(60).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only allow users to update their own preferences
        await db.updateNotificationPreferences(ctx.user.id, input);
        return { success: true };
      }),
  }),

  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      ensureAdminAccess(ctx.user.role);
      return await db.getSystemSettings();
    }),
    update: protectedProcedure
      .input(z.object({
        general: z.object({}).passthrough().optional(),
        business: z.object({}).passthrough().optional(),
        pc: z.object({}).passthrough().optional(),
        receipt: z.object({}).passthrough().optional(),
        notifications: z.object({}).passthrough().optional(),
        security: z.object({}).passthrough().optional(),
        backup: z.object({}).passthrough().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        ensureAdminAccess(ctx.user.role);
        const current = await db.getSystemSettings();
        const updated = await db.updateSystemSettings({
          ...current,
          ...(input.general ? { general: { ...(current.general ?? {}), ...input.general } } : {}),
          ...(input.business ? { business: { ...(current.business ?? {}), ...input.business } } : {}),
          ...(input.pc ? { pc: { ...(current.pc ?? {}), ...input.pc } } : {}),
          ...(input.receipt ? { receipt: { ...(current.receipt ?? {}), ...input.receipt } } : {}),
          ...(input.notifications ? { notifications: { ...(current.notifications ?? {}), ...input.notifications } } : {}),
          ...(input.security ? { security: { ...(current.security ?? {}), ...input.security } } : {}),
          ...(input.backup ? { backup: { ...(current.backup ?? {}), ...input.backup } } : {}),
        });
        await db.createAuditLog({ userId: ctx.user.id, action: 'SETTINGS_CHANGED', details: 'System settings updated' });
        return updated;
      }),
    createBackup: protectedProcedure.mutation(async ({ ctx }) => {
      ensureAdminAccess(ctx.user.role);
      const backup = { name: `backup-${Date.now()}`, type: 'manual', filePath: '/backups/manual.sql', sizeBytes: 1024 };
      await db.createBackupRecord(backup as any);
      await db.createAuditLog({ userId: ctx.user.id, action: 'BACKUP_CREATED', details: 'Manual backup created' });
      return backup;
    }),
    restoreBackup: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      ensureAdminAccess(ctx.user.role);
      await db.createAuditLog({ userId: ctx.user.id, action: 'RESTORE_COMPLETED', details: `Backup restored: ${input.id}` });
      return { success: true };
    }),
    getBackups: protectedProcedure.query(async ({ ctx }) => {
      ensureAdminAccess(ctx.user.role);
      return await db.getBackupHistory();
    }),
    getNotifications: protectedProcedure.query(async ({ ctx }) => {
      ensureAdminAccess(ctx.user.role);
      return await db.getNotificationsByUserId(ctx.user.id, 50);
    }),
    markNotificationRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      ensureAdminAccess(ctx.user.role);
      await db.markNotificationAsRead(input.id);
      return { success: true };
    }),
    getLogs: protectedProcedure.query(async ({ ctx }) => {
      ensureAdminAccess(ctx.user.role);
      return await db.getAuditLogs(ctx.user.id, 100);
    }),
  }),

  // Security & Audit Logging
  security: router({
    getAuditLogs: protectedProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(async ({ ctx, input }) => {
        ensureAdminAccess(ctx.user.role);
        return await db.getAuditLogs(ctx.user.id, input.limit);
      }),
    logEvent: protectedProcedure
      .input(z.object({
        action: z.string(),
        details: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        ensureAdminAccess(ctx.user.role);
        await db.createAuditLog({
          userId: ctx.user.id,
          action: input.action,
          details: input.details,
        });
        return { success: true };
      }),
    generateSessionToken: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        ensureAdminAccess(ctx.user.role);
        const { generateSessionToken } = await import('./_core/security');
        const token = generateSessionToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await db.updateSessionToken(input.sessionId, token, expiresAt);
        return { token, expiresAt };
      }),
    validateSessionToken: publicProcedure
      .input(z.object({ sessionId: z.number(), token: z.string() }))
      .query(async ({ input }) => {
        const { validateSessionToken } = await import('./_core/security');
        const isValid = await validateSessionToken(input.sessionId, input.token);
        return { isValid };
      }),
  }),

  // Remote PC Control
  pcControl: router({
    shutdown: protectedProcedure
      .input(z.object({ computerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        ensureAdminAccess(ctx.user.role);
        // Emit WebSocket event to connected PC
        // This will be handled by the client
        await db.logPCControlEvent(input.computerId, 'shutdown', ctx.user.id, 'pending');
        return { success: true, message: 'Shutdown command sent' };
      }),
    restart: protectedProcedure
      .input(z.object({ computerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        ensureAdminAccess(ctx.user.role);
        await db.logPCControlEvent(input.computerId, 'restart', ctx.user.id, 'pending');
        return { success: true, message: 'Restart command sent' };
      }),
    lock: protectedProcedure
      .input(z.object({ computerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        ensureAdminAccess(ctx.user.role);
        await db.logPCControlEvent(input.computerId, 'lock', ctx.user.id, 'pending');
        return { success: true, message: 'Lock command sent' };
      }),
    unlock: protectedProcedure
      .input(z.object({ computerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        ensureAdminAccess(ctx.user.role);
        await db.logPCControlEvent(input.computerId, 'unlock', ctx.user.id, 'pending');
        return { success: true, message: 'Unlock command sent' };
      }),
  }),

  // Reports & Analytics
  reports: router({
    overview: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        staff: z.string().optional(),
        customer: z.string().optional(),
        pc: z.string().optional(),
        product: z.string().optional(),
        service: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "view_reports");
        return await getReportsOverview(input);
      }),
    revenue: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        staff: z.string().optional(),
        customer: z.string().optional(),
        pc: z.string().optional(),
        product: z.string().optional(),
        service: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "view_reports");
        return await getRevenueReport(input);
      }),
    sessions: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        staff: z.string().optional(),
        customer: z.string().optional(),
        pc: z.string().optional(),
        product: z.string().optional(),
        service: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "view_reports");
        return await getSessionReport(input);
      }),
    customers: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        staff: z.string().optional(),
        customer: z.string().optional(),
        pc: z.string().optional(),
        product: z.string().optional(),
        service: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "view_reports");
        return await getCustomerReport(input);
      }),
    inventory: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        staff: z.string().optional(),
        customer: z.string().optional(),
        pc: z.string().optional(),
        product: z.string().optional(),
        service: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "view_reports");
        return await getInventoryReport(input);
      }),
    printing: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        staff: z.string().optional(),
        customer: z.string().optional(),
        pc: z.string().optional(),
        product: z.string().optional(),
        service: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "view_reports");
        return await getPrintingReport(input);
      }),
    staff: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        staff: z.string().optional(),
        customer: z.string().optional(),
        pc: z.string().optional(),
        product: z.string().optional(),
        service: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "view_reports");
        return await getStaffReport(input);
      }),
  }),

  // Inventory & POS Management
  inventory: router({
    dashboardStats: protectedProcedure.query(async ({ ctx }) => {
      ensurePermissionFromContext(ctx, "manage_inventory");
      return await getInventoryDashboardStats();
    }),
    getProducts: protectedProcedure
      .input(z.object({ search: z.string().optional(), lowStockOnly: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user.permissions?.includes("manage_inventory")) ensurePermissionFromContext(ctx, "manage_pos");
        return await getProducts({ search: input.search, lowStockOnly: input.lowStockOnly });
      }),
    createProduct: protectedProcedure
      .input(z.object({
        productCode: z.string().optional(),
        name: z.string().min(1),
        category: z.string().min(1).default('general'),
        barcode: z.string().optional(),
        description: z.string().optional(),
        costPrice: z.number().nonnegative(),
        sellingPrice: z.number().nonnegative(),
        quantityInStock: z.number().int().nonnegative(),
        minimumStockLevel: z.number().int().nonnegative().default(0),
        supplierId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "manage_inventory");
        return await createProduct(input);
      }),
    updateProduct: protectedProcedure
      .input(z.object({
        productId: z.number(),
        productCode: z.string().optional(),
        name: z.string().min(1).optional(),
        category: z.string().min(1).optional(),
        barcode: z.string().optional(),
        description: z.string().optional(),
        costPrice: z.number().nonnegative().optional(),
        sellingPrice: z.number().nonnegative().optional(),
        quantityInStock: z.number().int().nonnegative().optional(),
        minimumStockLevel: z.number().int().nonnegative().optional(),
        supplierId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "manage_inventory");
        const { productId, ...updates } = input;
        return await updateProduct(productId, updates);
      }),
    deleteProduct: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "manage_inventory");
        return await deleteProduct(input.productId);
      }),
    stockIn: protectedProcedure
      .input(z.object({ productId: z.number(), quantity: z.number().int().positive(), unitCost: z.number().nonnegative().optional(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "manage_inventory");
        return await stockInProduct(input.productId, input);
      }),
    stockOut: protectedProcedure
      .input(z.object({ productId: z.number(), quantity: z.number().int().positive(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "manage_inventory");
        return await stockOutProduct(input.productId, input);
      }),
    createSale: protectedProcedure
      .input(z.object({
        customerId: z.number().optional(),
        sessionId: z.number().optional(),
        paymentMethod: z.enum(['cash', 'bank_transfer', 'pos', 'mobile']).default('cash'),
        discountAmount: z.number().nonnegative().optional(),
        notes: z.string().optional(),
        items: z.array(z.object({ productId: z.number(), quantity: z.number().int().positive() })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user.permissions?.includes("manage_inventory")) ensurePermissionFromContext(ctx, "manage_pos");
        return await createSale(input);
      }),
    getSalesHistory: protectedProcedure
      .input(z.object({ limit: z.number().int().positive().default(20) }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user.permissions?.includes("manage_inventory")) ensurePermissionFromContext(ctx, "manage_pos");
        return await getSalesHistory(input.limit);
      }),
  }),

  // Print Job Management
  printJobs: router({
    services: protectedProcedure.query(async ({ ctx }) => {
      ensurePermissionFromContext(ctx, "manage_printing");
      return await getPrintServices();
    }),
    dashboardStats: protectedProcedure.query(async ({ ctx }) => {
      ensurePermissionFromContext(ctx, "manage_printing");
      return await getPrintDashboardStats();
    }),
    getAll: protectedProcedure
      .input(z.object({ status: z.enum(['pending', 'printing', 'completed', 'cancelled']).optional(), search: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "manage_printing");
        return await getPrintJobs({ status: input.status, search: input.search });
      }),
    getById: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "manage_printing");
        const jobs = await getPrintJobs();
        return jobs.find((job) => job.id === input.jobId);
      }),
    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().int().positive().default(50) }))
      .query(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "manage_printing");
        return await getPrintHistory(input.limit);
      }),
    create: protectedProcedure
      .input(z.object({
        customerId: z.number().optional(),
        sessionId: z.number().optional(),
        computerId: z.number().optional(),
        serviceId: z.number().optional(),
        serviceName: z.string().min(1),
        jobName: z.string().min(1),
        paperSize: z.enum(['A4', 'A3', 'Letter', 'Legal']).default('A4'),
        printType: z.enum(['single_sided', 'double_sided']).default('single_sided'),
        colorOption: z.enum(['black_white', 'color']).default('black_white'),
        pageCount: z.number().int().nonnegative(),
        quantity: z.number().int().positive().default(1),
        unitPrice: z.number().nonnegative(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "manage_printing");
        return await createPrintJob({
          customerId: input.customerId,
          sessionId: input.sessionId,
          computerId: input.computerId,
          serviceId: input.serviceId,
          serviceName: input.serviceName,
          jobName: input.jobName,
          paperSize: input.paperSize,
          printType: input.printType,
          colorOption: input.colorOption,
          pageCount: input.pageCount,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          notes: input.notes,
        });
      }),
    update: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        customerId: z.number().optional(),
        computerId: z.number().optional(),
        serviceId: z.number().optional(),
        serviceName: z.string().optional(),
        jobName: z.string().optional(),
        paperSize: z.enum(['A4', 'A3', 'Letter', 'Legal']).optional(),
        printType: z.enum(['single_sided', 'double_sided']).optional(),
        colorOption: z.enum(['black_white', 'color']).optional(),
        pageCount: z.number().int().nonnegative().optional(),
        quantity: z.number().int().positive().optional(),
        unitPrice: z.number().nonnegative().optional(),
        status: z.enum(['pending', 'printing', 'completed', 'cancelled']).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "manage_printing");
        const { jobId, ...updates } = input;
        return await updatePrintJob(jobId, updates);
      }),
    delete: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "manage_printing");
        return await deletePrintJob(input.jobId);
      }),
    complete: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        ensurePermissionFromContext(ctx, "manage_printing");
        return await completePrintJob(input.jobId);
      }),
  }),
});

export type AppRouter = typeof appRouter;

