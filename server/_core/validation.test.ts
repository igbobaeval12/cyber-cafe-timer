import { describe, expect, it } from "vitest";
import { createApiErrorPayload, getRequestId, normalizeDateInput, normalizeEmail, normalizeOptionalString, normalizePositiveInteger } from "./validation";

describe("validation helpers", () => {
  it("trims and normalizes optional text values", () => {
    expect(normalizeOptionalString("  Alice  ")).toBe("Alice");
    expect(normalizeOptionalString("   ")).toBeNull();
    expect(normalizeOptionalString(undefined)).toBeNull();
  });

  it("normalizes emails, dates and positive integers", () => {
    expect(normalizeEmail("  USER@Example.COM  ")).toBe("user@example.com");
    expect(normalizeDateInput("2024-01-02T03:04:05.000Z")).toBeInstanceOf(Date);
    expect(normalizeDateInput("not-a-date")).toBeNull();
    expect(normalizePositiveInteger("0", 5)).toBe(5);
    expect(normalizePositiveInteger("12", 5)).toBe(12);
  });

  it("builds consistent API error payloads and request ids", () => {
    expect(createApiErrorPayload("Not found", "NOT_FOUND", "req-123")).toEqual({
      success: false,
      error: "Not found",
      code: "NOT_FOUND",
      requestId: "req-123",
    });

    const req = { headers: { "x-request-id": "header-id" } } as any;
    const res = { getHeader: () => "res-id" } as any;
    expect(getRequestId(req, res)).toBe("header-id");
  });
});
