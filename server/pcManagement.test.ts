import { describe, expect, it } from "vitest";
import { getPcDashboardStats, normalizePcManagementStatus } from "./_core/pcManagement";

describe("PC management helpers", () => {
  it("counts dashboard totals from PC records", () => {
    const stats = getPcDashboardStats([
      { id: 1, status: "available", isActive: true },
      { id: 2, status: "in_use", isActive: true },
      { id: 3, status: "reserved", isActive: true },
      { id: 4, status: "offline", isActive: false },
    ] as any);

    expect(stats).toEqual({
      totalPCs: 4,
      availablePCs: 1,
      inUsePCs: 1,
      offlinePCs: 1,
    });
  });

  it("normalizes UI status values", () => {
    expect(normalizePcManagementStatus("Available")).toBe("available");
    expect(normalizePcManagementStatus("In Use")).toBe("in_use");
    expect(normalizePcManagementStatus("offline")).toBe("offline");
    expect(normalizePcManagementStatus("unknown" as any)).toBe("offline");
  });
});
