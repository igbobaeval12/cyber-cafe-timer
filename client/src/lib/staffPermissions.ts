const rolePermissions: Record<string, string[]> = {
  super_admin: ["all"],
  admin: ["manage_pcs", "manage_customers", "manage_billing", "manage_inventory", "manage_printing", "view_reports"],
  manager: ["manage_sessions", "manage_customers", "manage_printing", "manage_inventory", "view_reports"],
  cashier: ["manage_billing", "manage_pos", "manage_printing", "manage_customers"],
  staff: ["start_sessions", "end_sessions", "view_customers"],
};

export function hasPermission(
  userOrRole: { permissions?: string[]; role?: string } | string | undefined,
  permission: string
) {
  if (!userOrRole) return false;

  if (typeof userOrRole === "string") {
    const permissions = rolePermissions[userOrRole.toLowerCase()] ?? [];
    return permissions.includes("all") || permissions.includes(permission);
  }

  const dbPermissions = userOrRole.permissions ?? [];
  if ("permissions" in userOrRole) {
    return dbPermissions.includes("all") || dbPermissions.includes(permission);
  }

  const role = userOrRole.role;
  if (!role) return false;

  const permissions = rolePermissions[role.toLowerCase()] ?? [];
  return permissions.includes("all") || permissions.includes(permission);
}
