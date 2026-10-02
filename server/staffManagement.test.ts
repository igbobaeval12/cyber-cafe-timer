import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import * as dbModule from "./db";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "manager" = "admin"): TrpcContext {
  return {
    user: { id: 1, role, username: role, openId: null, name: role, email: null, loginMethod: "local", phoneNumber: null, membershipTier: "none", customerStatus: "active", prepaidBalance: "0", loyaltyPoints: 0, customerNotes: null, registeredAt: new Date(), createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as any,
    req: { headers: {}, protocol: "https" } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("staff management mutations", () => {
  it("creates a staff member through the existing authorized router", async () => {
    const createStaffSpy = vi.spyOn(dbModule, "createStaff").mockResolvedValue({ id: 8 } as any);
    const caller = appRouter.createCaller(context("admin"));

    await expect(caller.staffs.create({
      fullName: "Cafe Operator",
      username: "operator",
      email: "operator@example.com",
      password: "secret123",
      roleId: 5,
      status: "active",
    })).resolves.toMatchObject({ id: 8 });
    expect(createStaffSpy).toHaveBeenCalled();
  });

  it("deletes an existing staff member through the authorized router", async () => {
    const deleteStaffSpy = vi.spyOn(dbModule, "deleteStaff").mockResolvedValue({ affectedRows: 1 } as any);
    const caller = appRouter.createCaller(context("admin"));

    await expect(caller.staffs.delete({ id: 7 })).resolves.toMatchObject({ affectedRows: 1 });
    expect(deleteStaffSpy).toHaveBeenCalledWith(7);
  });

  it("rejects deletion of a nonexistent staff member", async () => {
    vi.spyOn(dbModule, "deleteStaff").mockRejectedValue(new Error("Staff member not found"));
    await expect(appRouter.createCaller(context("admin")).staffs.delete({ id: 999 })).rejects.toThrow("Staff member not found");
  });

  it("replaces role permissions and supports clearing all permissions", async () => {
    const assignSpy = vi.spyOn(dbModule, "assignPermissionsToRole").mockResolvedValue({ roleId: 3, permissionIds: [2, 5] });
    const caller = appRouter.createCaller(context("admin"));

    await expect(caller.staffs.assignPermissions({ roleId: 3, permissionIds: [2, 5] })).resolves.toEqual({ roleId: 3, permissionIds: [2, 5] });
    expect(assignSpy).toHaveBeenCalledWith(3, [2, 5]);

    assignSpy.mockResolvedValue({ roleId: 3, permissionIds: [] });
    await expect(caller.staffs.assignPermissions({ roleId: 3, permissionIds: [] })).resolves.toEqual({ roleId: 3, permissionIds: [] });
  });

  it("rejects role permission changes from non-admin staff", async () => {
    const caller = appRouter.createCaller(context("manager"));
    await expect(caller.staffs.assignPermissions({ roleId: 3, permissionIds: [2] })).rejects.toThrow("Unauthorized");
    await expect(caller.staffs.getRolePermissions({ roleId: 3 })).rejects.toThrow("Unauthorized");
  });

  it("rejects staff management from a staff account even with an admin role slug", async () => {
    const adminContext = context("admin");
    const staffContext = {
      ...adminContext,
      user: { ...adminContext.user, role: "staff", staffRoleSlug: "admin", accountType: "staff" },
    } as any;
    const caller = appRouter.createCaller(staffContext);

    await expect(caller.staffs.list({})).rejects.toThrow("Unauthorized");
    await expect(caller.settings.get()).rejects.toThrow("Unauthorized");
  });
});
