import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureNoActiveSessionForComputer, ensureNoActiveSessionForUser, startSession } from "./sessionEngine";
import * as dbModule from "../db";
import { computers, pricingConfigs, sessions } from "../../drizzle/schema";

describe("session engine concurrency guard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("prevents duplicate active sessions for the same computer", async () => {
    const existingActive = { id: 7, computerId: 3, sessionStatus: "active" };
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([existingActive]) }),
        }),
      }),
      transaction: vi.fn(),
    };

    await expect(ensureNoActiveSessionForComputer(3, fakeDb as any)).rejects.toThrow("Computer already has an active session");
  });

  it("uses transactions when creating a session", async () => {
    const transactionSpy = vi.fn(async (callback: any) => callback({
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({ insertId: 99 }) }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockImplementation((table: unknown) => ({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(async () => {
              if (table === pricingConfigs) return [{ id: 1, hourlyRate: 5 }];
              if (table === computers) return [{ id: 3 }];
              if (table === sessions) return [];
              return [];
            }),
          }),
        })),
      }),
    }));

    const db = {
      transaction: transactionSpy,
      select: vi.fn(),
    };

    vi.spyOn(dbModule, "getDb").mockResolvedValue(db as any);

    await expect(startSession({
      computerId: 3,
      userId: 10,
      pricingConfigId: 1,
      durationMinutes: 30,
    })).resolves.toMatchObject({ sessionId: 99, status: "active" });

    expect(transactionSpy).toHaveBeenCalled();
  });

  it("prevents a customer from having multiple active sessions at once", async () => {
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 8, userId: 11, sessionStatus: "active" }]),
          }),
        }),
      }),
      transaction: vi.fn(),
    };

    await expect(ensureNoActiveSessionForUser(11, fakeDb as any)).rejects.toThrow("Customer already has an active session");
  });
});
