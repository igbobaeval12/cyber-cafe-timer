import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

function createMockContext(role: 'admin' | 'user' = 'admin'): TrpcContext {
  return {
    user: {
      id: 1,
      openId: 'settings-user',
      email: 'settings@example.com',
      username: 'settings-admin',
      name: 'Settings Admin',
      loginMethod: 'local',
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    req: { protocol: 'https', headers: {} } as TrpcContext['req'],
    res: { clearCookie: () => {}, cookie: () => {} } as TrpcContext['res'],
  };
}

describe('Settings module', () => {
  it('returns a default settings payload for admins', async () => {
    const caller = appRouter.createCaller(createMockContext('admin')) as any;
    const settings = await caller.settings.get();

    expect(settings.general.cafeName).toContain('Cyber');
    expect(settings.business.defaultHourlyRate).toBeGreaterThan(0);
    expect(settings.notifications.sessionEndingSoon).toBe(true);
  });

  it('persists updated settings values', async () => {
    const caller = appRouter.createCaller(createMockContext('admin')) as any;
    const updated = await caller.settings.update({
      general: { cafeName: 'Test Café' },
    });

    expect(updated.general.cafeName).toBe('Test Café');
  });
});
