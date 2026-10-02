import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './passwordUtils';

describe('password hashing', () => {
  it('hashes passwords and verifies them correctly', async () => {
    const password = 'SecureAdminPassword123!';
    const hash = await hashPassword(password);

    expect(hash).toContain('$2b$');
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });
});
