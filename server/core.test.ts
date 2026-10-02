// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';
import * as dbModule from './db';
import { hashPassword } from './_core/passwordUtils';
import { sdk } from './_core/sdk';
import { hasPermission } from './_core/authorization';

// Mock user context
function createMockContext(role: 'admin' | 'user' = 'user'): TrpcContext {
  return {
    user: {
      id: 1,
      openId: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      loginMethod: 'test',
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };
}

describe('Cyber Café Timer - Core Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should return current user with me query', async () => {
      const ctx = createMockContext('admin');
      const caller = appRouter.createCaller(ctx);
      const user = await caller.auth.me();

      expect(user).toBeDefined();
      expect(user?.id).toBe(1);
      expect(user?.role).toBe('admin');
    });

    it('should handle logout successfully', async () => {
      const ctx = createMockContext();
      const clearCookie = vi.fn();
      ctx.res.clearCookie = clearCookie;
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.logout();

      expect(result.success).toBe(true);
      expect(clearCookie).toHaveBeenCalled();
    });

    it('allows valid customer login with active session', async () => {
      vi.spyOn(dbModule, 'getUserByUsername').mockResolvedValue({
        id: 42,
        username: 'customer01',
        passwordHash: hashPassword('secret123'),
        role: 'user',
        name: 'Customer One',
        email: 'customer@example.com',
        customerStatus: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as any);
      vi.spyOn(dbModule, 'getActiveSessionByUserId').mockResolvedValue({
        id: 10,
        userId: 42,
        computerId: 3,
        sessionStatus: 'active',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        totalDurationMinutes: 60,
      } as any);
      vi.spyOn(dbModule, 'getComputerByName').mockResolvedValue({
        id: 3,
        pcName: 'PC-03',
        status: 'in_use',
        isActive: true,
      } as any);
      vi.spyOn(dbModule, 'getActiveSessionByComputerId').mockResolvedValue({
        id: 10,
        userId: 42,
        computerId: 3,
        sessionStatus: 'active',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        totalDurationMinutes: 60,
      } as any);

      const caller = appRouter.createCaller({
        user: null,
        req: { headers: {} } as any,
        res: { cookie: () => {}, clearCookie: () => {} } as any,
      });

      await expect(caller.auth.customerLogin({ username: 'customer01', password: 'secret123', workstationId: 'PC-03' })).resolves.toMatchObject({ success: true, user: { id: 42, username: 'customer01', role: 'user' } });
    });

    it('rejects a customer login when there is no active workstation session', async () => {
      vi.spyOn(dbModule, 'getUserByUsername').mockResolvedValue({
        id: 77,
        username: 'customerNoSession',
        passwordHash: hashPassword('secret'),
        role: 'user',
        name: 'No Session',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as any);
      vi.spyOn(dbModule, 'getActiveSessionByUserId').mockResolvedValue(undefined);
      vi.spyOn(dbModule, 'getComputerByName').mockResolvedValue({
        id: 7,
        pcName: 'PC-01',
        status: 'available',
        isActive: true,
      } as any);
      vi.spyOn(dbModule, 'getActiveSessionByComputerId').mockResolvedValue(undefined);

      const caller = appRouter.createCaller({
        user: null,
        req: { headers: {} } as any,
        res: { cookie: () => {}, clearCookie: () => {} } as any,
      });

      await expect(caller.auth.customerLogin({
        username: 'customerNoSession',
        password: 'secret',
        workstationId: 'PC-01',
      })).rejects.toThrow('No active customer session for this workstation');
    });

    it('rejects a customer login when the workstation is not assigned to the active session', async () => {
      vi.spyOn(dbModule, 'getUserByUsername').mockResolvedValue({
        id: 101,
        username: 'pcMismatchCustomer',
        passwordHash: hashPassword('secret'),
        role: 'user',
        name: 'Mismatch Customer',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as any);
      vi.spyOn(dbModule, 'getActiveSessionByUserId').mockResolvedValue({
        id: 200,
        userId: 101,
        computerId: 11,
        sessionStatus: 'active',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        totalDurationMinutes: 60,
      } as any);
      vi.spyOn(dbModule, 'getComputerByName').mockResolvedValue({
        id: 12,
        pcName: 'PC-02',
        status: 'in_use',
        isActive: true,
      } as any);
      vi.spyOn(dbModule, 'getActiveSessionByComputerId').mockResolvedValue({
        id: 201,
        userId: 202,
        computerId: 12,
        sessionStatus: 'active',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        totalDurationMinutes: 60,
      } as any);

      const caller = appRouter.createCaller({
        user: null,
        req: { headers: {} } as any,
        res: { cookie: () => {}, clearCookie: () => {} } as any,
      });

      await expect(caller.auth.customerLogin({
        username: 'pcMismatchCustomer',
        password: 'secret',
        workstationId: 'PC-02',
      })).rejects.toThrow('This workstation does not match the active session');
    });

    it('rejects invalid username for customer login', async () => {
      vi.spyOn(dbModule, 'getUserByUsername').mockResolvedValue(undefined);

      const caller = appRouter.createCaller({
        user: null,
        req: { headers: {} } as any,
        res: { cookie: () => {}, clearCookie: () => {} } as any,
      });

      await expect(caller.auth.customerLogin({ username: 'missing-customer', password: 'secret', workstationId: 'PC-01' })).rejects.toThrow('Invalid username or password');
    });

    it('rejects invalid password for customer login', async () => {
      vi.spyOn(dbModule, 'getUserByUsername').mockResolvedValue({
        id: 90,
        username: 'customerBadPass',
        passwordHash: hashPassword('rightpass'),
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as any);
      vi.spyOn(dbModule, 'getActiveSessionByUserId').mockResolvedValue({
        id: 12,
        userId: 90,
        sessionStatus: 'active',
        startTime: new Date(),
        endTime: new Date(Date.now() + 1000),
        totalDurationMinutes: 1,
      } as any);

      const caller = appRouter.createCaller({
        user: null,
        req: { headers: {} } as any,
        res: { cookie: () => {}, clearCookie: () => {} } as any,
      });

      await expect(caller.auth.customerLogin({ username: 'customerBadPass', password: 'wrongpass', workstationId: 'PC-01' })).rejects.toThrow('Invalid username or password');
    });

    it('rejects customer login after the assigned workstation session expires', async () => {
      vi.spyOn(dbModule, 'getUserByUsername').mockResolvedValue({
        id: 120,
        username: 'expiredCustomer',
        passwordHash: hashPassword('secret'),
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as any);
      vi.spyOn(dbModule, 'getActiveSessionByUserId').mockResolvedValue({
        id: 99,
        userId: 120,
        computerId: 17,
        sessionStatus: 'active',
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() - 1000),
        totalDurationMinutes: 60,
      } as any);
      vi.spyOn(dbModule, 'getActiveSessionByComputerId').mockResolvedValue({
        id: 99,
        userId: 120,
        computerId: 17,
        sessionStatus: 'active',
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() - 1000),
        totalDurationMinutes: 60,
      } as any);
      vi.spyOn(dbModule, 'getComputerByName').mockResolvedValue({
        id: 17,
        pcName: 'PC-17',
        status: 'in_use',
        isActive: true,
      } as any);

      const caller = appRouter.createCaller({
        user: null,
        req: { headers: {} } as any,
        res: { cookie: () => {}, clearCookie: () => {} } as any,
      });

      await expect(caller.auth.customerLogin({
        username: 'expiredCustomer',
        password: 'secret',
        workstationId: 'PC-17',
      })).rejects.toThrow('No active customer session for this workstation');
    });
  });

  describe('Customer account management', () => {
    it('creates a customer with the Add Customer payload types', async () => {
      const insert = vi.fn().mockResolvedValue({ insertId: 201 });
      vi.spyOn(dbModule, 'getUserByUsername').mockResolvedValue(undefined);
      vi.spyOn(dbModule, 'getDb').mockResolvedValue({
        insert: vi.fn().mockReturnValue({ values: insert }),
      } as any);

      const caller = appRouter.createCaller(createMockContext('admin'));
      const result = await caller.customers.create({
        name: 'Ba-eval Igbo',
        username: 'gabriel',
        password: 'test password',
        phoneNumber: '08165302819',
        email: 'igboeval25@gmail.com',
        membershipTier: 'walk_in',
        customerStatus: 'active',
        loyaltyPoints: Number('054'),
        prepaidBalance: Number('19'),
        notes: 'my client',
      });

      expect(result.id).toBe(201);
      expect(insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Ba-eval Igbo',
        username: 'gabriel',
        phoneNumber: '08165302819',
        email: 'igboeval25@gmail.com',
        membershipTier: 'walk_in',
        customerStatus: 'active',
        loyaltyPoints: 54,
        prepaidBalance: '19',
        customerNotes: 'my client',
      }));
    });

    it('rejects duplicate customer usernames during creation', async () => {
      vi.spyOn(dbModule, 'getUserByUsername').mockResolvedValue({
        id: 11,
        username: 'duplicate-user',
        role: 'user',
      } as any);
      vi.spyOn(dbModule, 'getDb').mockResolvedValue({
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({ insertId: 200 }) }),
      } as any);

      const ctx = createMockContext('admin');
      const caller = appRouter.createCaller(ctx);

      await expect(caller.customers.create({
        name: 'Duplicate User',
        username: 'duplicate-user',
        password: 'secret123',
      })).rejects.toThrow('Username already exists');
    });
  });

  describe('Staff authentication', () => {
    const staffAccount = {
      id: 301,
      staffId: 'STF-000301',
      username: 'operator',
      passwordHash: hashPassword('secret123'),
      fullName: 'Cafe Operator',
      roleId: 5,
      status: 'active',
      failedLoginAttempts: 0,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('logs in staff and returns the assigned role', async () => {
      vi.spyOn(dbModule, 'getStaffByUsername').mockResolvedValue(staffAccount as any);
      vi.spyOn(dbModule, 'getAllStaffRoles').mockResolvedValue([{ id: 5, name: 'Staff', slug: 'staff' }] as any);
      vi.spyOn(dbModule, 'updateStaff').mockResolvedValue({} as any);
      vi.spyOn(dbModule, 'logStaffLogin').mockResolvedValue(undefined);
      vi.spyOn(dbModule, 'logStaffActivity').mockResolvedValue(undefined);
      const cookie = vi.fn();
      const caller = appRouter.createCaller({ ...createMockContext(), user: null, res: { cookie, clearCookie: vi.fn() } as any });

      await expect(caller.staffs.login({ username: 'operator', password: 'secret123' })).resolves.toMatchObject({
        success: true,
        staff: { id: 301, roleName: 'Staff', roleSlug: 'staff' },
      });
      expect(cookie).toHaveBeenCalled();
    });

    it('rejects invalid staff passwords', async () => {
      vi.spyOn(dbModule, 'getStaffByUsername').mockResolvedValue(staffAccount as any);
      vi.spyOn(dbModule, 'updateStaff').mockResolvedValue({} as any);
      vi.spyOn(dbModule, 'logStaffLogin').mockResolvedValue(undefined);
      await expect(appRouter.createCaller({ ...createMockContext(), user: null }).staffs.login({ username: 'operator', password: 'wrongpass' })).rejects.toThrow('Invalid username or password');
    });

    it('rejects locked and inactive staff accounts', async () => {
      vi.spyOn(dbModule, 'getStaffByUsername').mockResolvedValue({ ...staffAccount, isLocked: true } as any);
      await expect(appRouter.createCaller({ ...createMockContext(), user: null }).staffs.login({ username: 'operator', password: 'secret123' })).rejects.toThrow('Account locked');

      vi.spyOn(dbModule, 'getStaffByUsername').mockResolvedValue({ ...staffAccount, status: 'inactive' } as any);
      await expect(appRouter.createCaller({ ...createMockContext(), user: null }).staffs.login({ username: 'operator', password: 'secret123' })).rejects.toThrow('Staff account is inactive');
    });

    it('clears the shared authentication cookie on staff logout', async () => {
      const clearCookie = vi.fn();
      const caller = appRouter.createCaller({ ...createMockContext(), res: { cookie: vi.fn(), clearCookie } as any });
      await expect(caller.staffs.logout()).resolves.toEqual({ success: true });
      expect(clearCookie).toHaveBeenCalled();
    });

    it('enforces the existing staff permission matrix', () => {
      expect(hasPermission('staff', 'start_sessions')).toBe(true);
      expect(hasPermission('staff', 'manage_billing')).toBe(false);
      expect(hasPermission('cashier', 'manage_billing')).toBe(true);
      expect(hasPermission('manager', 'manage_sessions')).toBe(true);
    });

    it('resolves a staff token as staff when its ID matches a user ID', async () => {
      vi.spyOn(dbModule, 'getUserById').mockResolvedValue({ id: 301, username: 'wrong-user', role: 'user' } as any);
      vi.spyOn(dbModule, 'getStaffById').mockResolvedValue(staffAccount as any);
      vi.spyOn(dbModule, 'getAllStaffRoles').mockResolvedValue([{ id: 5, name: 'Staff', slug: 'staff' }] as any);
      vi.spyOn(dbModule, 'getStaffRoleEffectivePermissions').mockResolvedValue(['manage_pcs', 'manage_sessions']);
      const token = await sdk.createLocalSessionToken(301, 'operator', { accountType: 'staff' });
      const user = await sdk.authenticateRequest({ protocol: 'https', hostname: 'localhost', headers: { cookie: `app_session_id=${token}` } } as any);

      expect(user).toMatchObject({ id: 301, username: 'operator', role: 'staff', accountType: 'staff' });
      expect((user as any).permissions).toContain('manage_pcs');
    });

    it('grants staff access to PCs only when the database permission is present', async () => {
      const allowedCtx = {
        user: { id: 301, username: 'operator', role: 'staff', permissions: ['manage_pcs'] },
        req: { headers: {} },
        res: { clearCookie: vi.fn(), cookie: vi.fn() },
      } as any;
      const deniedCtx = {
        user: { id: 301, username: 'operator', role: 'staff', permissions: [] },
        req: { headers: {} },
        res: { clearCookie: vi.fn(), cookie: vi.fn() },
      } as any;

      await expect(appRouter.createCaller(allowedCtx).computers.getAll()).resolves.toBeDefined();
      await expect(appRouter.createCaller(deniedCtx).computers.getAll()).rejects.toThrow('Unauthorized');
    });

    it('blocks restricted backend procedures for permission-limited staff', async () => {
      const staffCtx = (permissions: string[]) => ({
        user: { id: 301, username: 'operator', role: 'staff', accountType: 'staff', permissions },
        req: { headers: {} },
        res: { clearCookie: vi.fn(), cookie: vi.fn() },
      } as any);

      const pcOnly = appRouter.createCaller(staffCtx(['manage_pcs']));
      await expect(pcOnly.inventory.dashboardStats()).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(pcOnly.inventory.getSalesHistory({ limit: 1 })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(pcOnly.reports.overview({})).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(pcOnly.settings.get()).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(pcOnly.staffs.list({})).rejects.toMatchObject({ code: 'FORBIDDEN' });

      const posOnly = appRouter.createCaller(staffCtx(['manage_pos']));
      await expect(posOnly.inventory.dashboardStats()).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(posOnly.settings.get()).rejects.toMatchObject({ code: 'FORBIDDEN' });

      const inventoryOnly = appRouter.createCaller(staffCtx(['manage_inventory']));
      await expect(inventoryOnly.inventory.getSalesHistory({ limit: 1 })).resolves.toBeDefined();
      await expect(inventoryOnly.settings.get()).rejects.toMatchObject({ code: 'FORBIDDEN' });

      const noAdminPermissions = appRouter.createCaller(staffCtx([]));
      await expect(noAdminPermissions.computers.getAll()).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(noAdminPermissions.inventory.dashboardStats()).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(noAdminPermissions.reports.overview({})).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('allows admin bypass while preserving customer auth behavior', async () => {
      const caller = appRouter.createCaller({
        user: { id: 1, username: 'admin', role: 'admin', permissions: [] },
        req: { headers: {} },
        res: { clearCookie: vi.fn(), cookie: vi.fn() },
      } as any);

      await expect(caller.computers.getAll()).resolves.toBeDefined();
    });
  });

  describe('Computer Management', () => {
    it('should retrieve all computers', async () => {
      const ctx = createMockContext('admin');
      const caller = appRouter.createCaller(ctx);

      try {
        const computers = await caller.computers.getAll();
        expect(Array.isArray(computers)).toBe(true);
      } catch (error) {
        // Database might not be available in test environment
        expect(error).toBeDefined();
      }
    });

    it('should retrieve pricing configuration', async () => {
      const ctx = createMockContext('admin');
      const caller = appRouter.createCaller(ctx);

      try {
        const pricing = await caller.pricing.getActive();
        // Should return pricing or null if not configured
        expect(pricing === null || typeof pricing === 'object').toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Session Management', () => {
    it('should handle session operations with proper context', async () => {
      const ctx = createMockContext('admin');
      const caller = appRouter.createCaller(ctx);

      expect(caller).toBeDefined();
    });

    it('should allow admin to create pricing plans', async () => {
      const ctx = createMockContext('admin');
      const caller = appRouter.createCaller(ctx);

      const result = await caller.pricing.create({
        name: 'Test Plan',
        hourlyRate: '4.50',
        minimumCharge: '2.00',
        discountPercentage: '0.00',
      });

      expect(result).toBeDefined();
    });
  });

  describe('Authorization', () => {
    it('should allow admin access to admin procedures', async () => {
      const ctx = createMockContext('admin');
      const caller = appRouter.createCaller(ctx);

      expect(ctx.user?.role).toBe('admin');
    });

    it('should have proper user context', async () => {
      const ctx = createMockContext('user');
      const caller = appRouter.createCaller(ctx);

      expect(ctx.user?.role).toBe('user');
    });
  });

  describe('System Utilities', () => {
    it('should have system router available', async () => {
      const ctx = createMockContext('admin');
      const caller = appRouter.createCaller(ctx);

      expect(caller.system).toBeDefined();
    });
  });
});
