import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedDatabase = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: () => mockedDatabase,
}));

import * as dbModule from "./db";

describe("updateNotificationPreferences", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "mysql://test:test@localhost/test");
    mockedDatabase.select.mockReset();
    mockedDatabase.update.mockReset();
    mockedDatabase.insert.mockReset();
  });

  it("inserts default notification preferences when no row exists and no fields are provided", async () => {
    const insertValues = vi.fn().mockResolvedValue({});
    mockedDatabase.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    mockedDatabase.insert.mockReturnValue({ values: insertValues });

    await dbModule.updateNotificationPreferences(42, {});

    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      enableSessionExpired: true,
      enableTimeWarning: true,
      enablePushNotifications: true,
    }));
    expect(mockedDatabase.update).not.toHaveBeenCalled();
  });
});
