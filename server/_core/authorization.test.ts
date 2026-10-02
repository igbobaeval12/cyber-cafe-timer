import { describe, expect, it } from "vitest";
import { hasAdminAccess, hasPermission } from "./authorization";

describe("authorization helpers", () => {
  it("recognizes admin and super admin roles", () => {
    expect(hasAdminAccess("admin")).toBe(true);
    expect(hasAdminAccess("super_admin")).toBe(true);
    expect(hasAdminAccess("manager")).toBe(false);
  });

  it("grants permissions based on role policy", () => {
    expect(hasPermission("manager", "view_reports")).toBe(true);
    expect(hasPermission("cashier", "manage_billing")).toBe(true);
    expect(hasPermission("staff", "start_sessions")).toBe(true);
    expect(hasPermission("staff", "manage_inventory")).toBe(false);
  });

  it("treats database permission arrays as the source of truth", () => {
    expect(hasPermission(["manage_pcs", "manage_sessions"], "manage_pcs")).toBe(true);
    expect(hasPermission(["manage_inventory"], "manage_pcs")).toBe(false);
    expect(hasPermission(["all"], "manage_inventory")).toBe(true);
    expect(hasPermission({ role: "staff", permissions: [] }, "start_sessions")).toBe(false);
  });
});
