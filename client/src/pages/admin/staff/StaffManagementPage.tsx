import { useMemo, useState } from "react";
import { Activity, KeyRound, Search, ShieldCheck, Users, UserPlus, Clock3, History, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function StaffManagementPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(1);
  const [status, setStatus] = useState<"active" | "suspended" | "inactive">("active");

  const staffQuery = trpc.staffs.list.useQuery({ search });
  const rolesQuery = trpc.staffs.getRoles.useQuery();
  const statsQuery = trpc.staffs.dashboardStats.useQuery();
  const createMutation = trpc.staffs.create.useMutation({
    onSuccess: () => {
      staffQuery.refetch();
      setOpen(false);
    },
  });
  const deleteMutation = trpc.staffs.delete.useMutation({
    onSuccess: async () => {
      toast.success("Staff member deleted");
      await staffQuery.refetch();
      await statsQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const staffItems = useMemo(() => staffQuery.data?.items ?? [], [staffQuery.data]);
  const stats = statsQuery.data;

  const handleCreate = () => {
    createMutation.mutate({ fullName, username, email, password, roleId, status });
  };

  const handleDelete = (staff: any) => {
    if (window.confirm(`Delete staff member "${staff.fullName}"? This cannot be undone.`)) {
      deleteMutation.mutate({ id: staff.id });
    }
  };

  return (
    <AdminShell title="Staff Management" description="Secure staff onboarding, RBAC, and access tracking">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Total Staff</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-semibold text-white">{stats?.totalStaff ?? 0}</div></CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Active Staff</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-semibold text-emerald-400">{stats?.activeStaff ?? 0}</div></CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Online Staff</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-semibold text-cyan-400">{stats?.onlineStaff ?? 0}</div></CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Currently Working</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-semibold text-violet-400">{stats?.currentlyWorking ?? 0}</div></CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-500 hover:bg-cyan-600"><UserPlus className="mr-2 h-4 w-4" />Add Staff</Button>
            </DialogTrigger>
            <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input type="password" placeholder="Temporary Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <select className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2" value={roleId} onChange={(e) => setRoleId(Number(e.target.value))}>
                  {(rolesQuery.data ?? []).map((role: any) => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
                <select className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
                <Button className="w-full" onClick={handleCreate}>Create Staff</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="border-slate-700 text-slate-200" onClick={() => navigate('/admin/staff/roles')}><ShieldCheck className="mr-2 h-4 w-4" />Role Management</Button>
          <Button variant="outline" className="border-slate-700 text-slate-200" onClick={() => navigate('/admin/staff/history')}><History className="mr-2 h-4 w-4" />Login History</Button>
          <Button variant="outline" className="border-slate-700 text-slate-200" onClick={() => navigate('/admin/staff/activity')}><Activity className="mr-2 h-4 w-4" />Activity Log</Button>
        </div>

        <Card className="border-slate-800 bg-slate-900/70">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-white">Staff Directory</CardTitle>
              <CardDescription className="text-slate-400">Search and manage staff accounts.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search by name or username" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Username</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Last Login</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffItems.map((staff: any) => (
                    <tr key={staff.id} className="border-b border-slate-800/80 text-slate-300 last:border-b-0">
                      <td className="px-3 py-3 font-medium text-white">{staff.fullName}</td>
                      <td className="px-3 py-3">{staff.username}</td>
                      <td className="px-3 py-3">{staff.role?.name ?? "Staff"}</td>
                      <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs ${staff.status === "active" ? "bg-emerald-500/15 text-emerald-300" : staff.status === "suspended" ? "bg-amber-500/15 text-amber-300" : "bg-slate-500/15 text-slate-300"}`}>{staff.status}</span></td>
                      <td className="px-3 py-3">{staff.lastLogin ? new Date(staff.lastLogin).toLocaleString() : "Never"}</td>
                      <td className="px-3 py-3">
                        <Button size="sm" variant="outline" disabled={deleteMutation.isPending} onClick={() => handleDelete(staff)}>
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
