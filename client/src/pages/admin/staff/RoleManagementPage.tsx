import { useEffect, useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function RoleManagementPage() {
  const rolesQuery = trpc.staffs.getRoles.useQuery();
  const permissionsQuery = trpc.staffs.getPermissions.useQuery();
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
    const rolePermissionsQuery = trpc.staffs.getRolePermissions.useQuery({ roleId: selectedRole ?? 1 }, { enabled: selectedRole !== null });
    const assignMutation = trpc.staffs.assignPermissions.useMutation({
      onSuccess: async () => {
        toast.success("Role permissions saved");
        await rolePermissionsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    });

  const handleRoleSelect = (roleId: number) => {
    setSelectedRole(roleId);
    setSelectedPermissions([]);
  };

  useEffect(() => {
    setSelectedPermissions((rolePermissionsQuery.data ?? []).map((item: any) => item.permissionId));
  }, [rolePermissionsQuery.data]);

  const roles = rolesQuery.data ?? [];
  const permissions = permissionsQuery.data ?? [];

  const handleSave = () => {
    if (selectedRole) assignMutation.mutate({ roleId: selectedRole, permissionIds: selectedPermissions });
  };

  return (
    <AdminShell title="Role Management" description="Manage role-based access and permissions">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="border-slate-800 bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-white">Roles</CardTitle>
            <CardDescription className="text-slate-400">Choose a role to edit permissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {roles.map((role: any) => (
              <button key={role.id} onClick={() => handleRoleSelect(role.id)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${selectedRole === role.id ? "border-cyan-500 bg-cyan-500/10 text-white" : "border-slate-800 bg-slate-950/60 text-slate-300"}`}>
                <span>{role.name}</span>
                <ShieldCheck className="h-4 w-4" />
              </button>
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-white">Permissions</CardTitle>
            <CardDescription className="text-slate-400">Grant or remove capabilities for the selected role.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {permissions.map((permission: any) => (
              <label key={permission.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                <span>{permission.label}</span>
                <input type="checkbox" checked={selectedPermissions.includes(permission.id)} onChange={() => setSelectedPermissions((current) => current.includes(permission.id) ? current.filter((id) => id !== permission.id) : [...current, permission.id])} />
              </label>
            ))}
            {assignMutation.error && <p className="text-sm text-red-400" role="alert">{assignMutation.error.message}</p>}
            <Button className="w-full" disabled={!selectedRole || assignMutation.isPending || rolePermissionsQuery.isLoading} onClick={handleSave}>{assignMutation.isPending ? "Saving..." : "Save Permissions"}</Button>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
