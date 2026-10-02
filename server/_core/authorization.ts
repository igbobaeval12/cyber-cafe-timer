export function hasAdminAccess(userRole: string | undefined) {
  return userRole === "admin" || userRole === "super_admin";
}

/**
 * Check if a user has permission based on database-loaded permissions.
 * This is the primary authorization function for staff RBAC.
 */
export function hasStaffPermission(effectivePermissions: string[] | undefined, permission: string): boolean {
  if (!effectivePermissions) return false;
  return effectivePermissions.includes(permission) || effectivePermissions.includes("all");
}

/**
 * Permission helper that prefers the database-backed permissions array when it exists.
 * The role-based fallback exists only for legacy compatibility and should not win over
 * the actual staffRolePermissions assignments in the database.
 */
export function hasPermission(
  userOrPermissions: string[] | { permissions?: string[]; role?: string } | string | undefined,
  permission: string
) {
  if (!userOrPermissions) return false;

  if (Array.isArray(userOrPermissions)) {
    return hasStaffPermission(userOrPermissions, permission);
  }

  if (typeof userOrPermissions === "object") {
    const effectivePermissions = userOrPermissions.permissions ?? [];
    if ("permissions" in userOrPermissions) {
      return hasStaffPermission(effectivePermissions, permission);
    }

    if (userOrPermissions.role) {
      return hasPermission(userOrPermissions.role, permission);
    }

    return false;
  }

  const role = userOrPermissions.toLowerCase();
  if (role === "super_admin") return true;
  if (role === "admin") {
    return [
      "manage_pcs",
      "manage_customers",
      "manage_billing",
      "manage_inventory",
      "manage_printing",
      "view_reports",
      "manage_sessions",
      "manage_pos",
      "start_sessions",
      "end_sessions",
      "view_customers",
    ].includes(permission);
  }

  if (permission === "view_reports" && role === "manager") return true;
  if (permission === "manage_billing" && (role === "cashier" || role === "admin")) return true;
  if (permission === "manage_pos" && role === "cashier") return true;
  if (permission === "manage_customers" && (role === "admin" || role === "manager" || role === "cashier")) return true;
  if (permission === "manage_inventory" && (role === "admin" || role === "manager")) return true;
  if (permission === "manage_printing" && (role === "admin" || role === "manager" || role === "cashier")) return true;
  if (permission === "manage_sessions" && role === "manager") return true;
  if (permission === "start_sessions" && role === "staff") return true;
  if (permission === "end_sessions" && role === "staff") return true;
  if (permission === "view_customers" && role === "staff") return true;
  return false;
}
