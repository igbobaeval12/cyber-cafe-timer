import { describe, expect, it, vi } from "vitest";
import {
  calculateResumeDeadline,
  calculateSessionEndTime,
  endSession,
  expireSession,
  formatRemainingTime,
  getSessionTimerState,
  normalizePackageType,
  pauseSession,
  resumeSession,
} from "./_core/sessionEngine";
import * as dbModule from "./db";
import * as billingModule from "./_core/billing";
import { computers, pricingConfigs, sessions } from "../drizzle/schema";

function createSessionDb(sessionRecord: Record<string, unknown>) {
  const updateCalls: Array<Record<string, unknown>> = [];
  const fakeDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockImplementation((table: unknown) => ({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(table === sessions ? [sessionRecord] : table === pricingConfigs ? [{ id: 9, name: "Hourly", hourlyRate: "5", minimumCharge: "0", discountPercentage: "0" }] : []),
        }),
      })),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockImplementation((updates: Record<string, unknown>) => {
        updateCalls.push(updates);
        return { where: vi.fn().mockResolvedValue({}) };
      }),
    }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({ id: 77 }) }),
  };

  return { fakeDb, updateCalls };
}

describe("session timer helpers", () => {
  it("formats countdown values as human-readable text", () => {
    expect(formatRemainingTime(90)).toBe("1m 30s");
    expect(formatRemainingTime(3600)).toBe("1h 0m");
  });

  it("normalizes package types", () => {
    expect(normalizePackageType("Hourly")).toBe("hourly");
    expect(normalizePackageType("Fixed Time")).toBe("fixed");
    expect(normalizePackageType("custom")).toBe("custom");
  });

  it.each([1, 2, 5, 15])("calculates the correct deadline for a %d minute session", (durationMinutes) => {
    const startTime = new Date("2026-01-01T12:00:00.000Z");
    const endTime = calculateSessionEndTime(startTime, durationMinutes);

    expect(endTime.getTime() - startTime.getTime()).toBe(durationMinutes * 60 * 1000);
    expect(endTime.toISOString()).toBe(new Date(startTime.getTime() + durationMinutes * 60 * 1000).toISOString());
  });

  it.each([1, 2, 5, 15])("marks a %d minute session expired when the deadline passes", (durationMinutes) => {
    const startTime = new Date("2026-01-01T12:00:00.000Z");
    const endTime = calculateSessionEndTime(startTime, durationMinutes);
    const now = new Date(endTime.getTime() + 1000);
    const session = {
      sessionStatus: "active" as const,
      startTime,
      endTime,
      totalDurationMinutes: durationMinutes,
      pausedTime: null,
    };

    const state = getSessionTimerState(session, now);
    expect(state.isExpired).toBe(true);
    expect(state.remainingMinutes).toBe(0);
    expect(state.remainingMs).toBe(0);
  });

  it("recalculates the resume deadline so paused time extends the session", () => {
    const pauseTime = new Date("2026-01-01T12:02:00.000Z");
    const resumeTime = new Date("2026-01-01T12:04:00.000Z");
    const session = {
      sessionStatus: "paused" as const,
      startTime: new Date("2026-01-01T12:00:00.000Z"),
      endTime: new Date("2026-01-01T12:05:00.000Z"),
      totalDurationMinutes: 5,
      pausedTime: pauseTime,
    };

    const deadline = calculateResumeDeadline(session, resumeTime);
    expect(deadline.remainingMs).toBe(3 * 60 * 1000);
    expect(deadline.resumeEndTime.toISOString()).toBe("2026-01-01T12:07:00.000Z");
  });

  it("preserves the original 5-minute duration when a session is manually ended", async () => {
    const sessionRecord = {
      id: 42,
      computerId: 7,
      userId: 5,
      pricingConfigId: 9,
      sessionStatus: "active",
      paymentMode: "postpaid",
      startTime: new Date("2026-01-01T12:00:00.000Z"),
      endTime: null,
      totalDurationMinutes: 5,
      createdAt: new Date("2026-01-01T11:59:00.000Z"),
      updatedAt: new Date("2026-01-01T11:59:00.000Z"),
    };

    const updateMock = vi.fn().mockResolvedValue({});
    const insertMock = vi.fn().mockResolvedValue({ id: 77 });
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([sessionRecord]) }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({ id: 77 }),
      }),
    };

    vi.spyOn(dbModule, "getDb").mockResolvedValue(fakeDb as any);
    vi.spyOn(billingModule, "createBill").mockResolvedValue({ id: 77 } as any);
    vi.spyOn(dbModule, "getUserByUsername").mockResolvedValue(undefined);

    const result = await endSession(42);

    expect(result?.status).toBe("completed");
    expect(fakeDb.update).toHaveBeenCalled();
    const setMock = fakeDb.update.mock.results[0].value.set as any;
    expect(setMock).toHaveBeenCalled();
    expect(setMock.mock.calls[0][0].sessionStatus).toBe("completed");
    expect(setMock.mock.calls[0][0].endTime).toBeInstanceOf(Date);
  });

  it("ends an active session and sets its end time", async () => {
    const sessionRecord = { id: 42, computerId: 7, userId: null, pricingConfigId: 9, sessionStatus: "active", paymentMode: "postpaid", startTime: new Date(), endTime: new Date(), totalDurationMinutes: 5 };
    const { fakeDb, updateCalls } = createSessionDb(sessionRecord);
    vi.spyOn(dbModule, "getDb").mockResolvedValue(fakeDb as any);
    vi.spyOn(billingModule, "createBill").mockResolvedValue({ id: 77 } as any);

    await expect(endSession(42)).resolves.toMatchObject({ status: "completed" });
    expect(updateCalls[0]).toMatchObject({ sessionStatus: "completed" });
    expect(updateCalls[0].endTime).toBeInstanceOf(Date);
  });

  it("pauses an active session and sets paused time", async () => {
    const sessionRecord = { id: 42, computerId: 7, sessionStatus: "active" };
    const { fakeDb, updateCalls } = createSessionDb(sessionRecord);
    vi.spyOn(dbModule, "getDb").mockResolvedValue(fakeDb as any);

    await expect(pauseSession(42)).resolves.toMatchObject({ status: "paused" });
    expect(updateCalls[0]).toMatchObject({ sessionStatus: "paused" });
    expect(updateCalls[0].pausedTime).toBeInstanceOf(Date);
  });

  it("resumes a paused session and restores an active deadline", async () => {
    const sessionRecord = { id: 42, computerId: 7, sessionStatus: "paused", startTime: new Date("2026-01-01T12:00:00Z"), endTime: new Date("2026-01-01T12:05:00Z"), pausedTime: new Date("2026-01-01T12:02:00Z"), totalDurationMinutes: 5 };
    const { fakeDb, updateCalls } = createSessionDb(sessionRecord);
    vi.spyOn(dbModule, "getDb").mockResolvedValue(fakeDb as any);

    await expect(resumeSession(42)).resolves.toMatchObject({ status: "active" });
    expect(updateCalls[0]).toMatchObject({ sessionStatus: "active", pausedTime: null });
    expect(updateCalls[0].endTime).toBeInstanceOf(Date);
  });

  it("automatically expires an active session", async () => {
    const sessionRecord = { id: 42, computerId: 7, userId: null, pricingConfigId: 9, sessionStatus: "active", paymentMode: "postpaid", startTime: new Date(), endTime: new Date(), totalDurationMinutes: 5 };
    const { fakeDb, updateCalls } = createSessionDb(sessionRecord);
    vi.spyOn(dbModule, "getDb").mockResolvedValue(fakeDb as any);
    vi.spyOn(billingModule, "createBill").mockResolvedValue({ id: 77 } as any);

    await expect(expireSession(42)).resolves.toMatchObject({ status: "expired" });
    expect(updateCalls[0]).toMatchObject({ sessionStatus: "expired" });
    expect(updateCalls[0].endTime).toBeInstanceOf(Date);
  });
});
