import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

function createMockContext(role: 'admin' | 'super_admin' | 'manager' | 'cashier' | 'staff' = 'admin'): TrpcContext {
  return {
    user: {
      id: 1,
      openId: 'staff-user',
      email: 'staff@example.com',
      username: 'staff-admin',
      name: 'Staff Admin',
      loginMethod: 'local',
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext['res'],
  };
}

describe('Staff RBAC module', () => {
  it('returns a seeded role list', async () => {
    const caller = appRouter.createCaller(createMockContext('admin')) as any;

    const roles = await caller.staffs.getRoles();

    expect(Array.isArray(roles)).toBe(true);
    expect(roles.length).toBeGreaterThan(0);
  });

  it('allows an admin to browse staff records', async () => {
    const caller = appRouter.createCaller(createMockContext('admin')) as any;

    const result = await caller.staffs.list({ search: '' });

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });
});
