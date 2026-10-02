import { useMemo, useState, type FormEvent } from "react";
import { Search, Plus, Edit3, Trash2, Monitor, Eye, Power, RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from '@/lib/currency';
import { useSettings } from '@/hooks/useSettings';
import { PcStatusBadge } from "@/components/admin/PcStatusBadge";

const statusOptions = ["all", "available", "in_use", "reserved", "offline"] as const;

type PcFormState = {
  pcNumber: string;
  pcName: string;
  status: string;
  currentCustomer: string;
  remainingTime: string;
  currentSession: string;
  hourlyRate: string;
  lastActivity: string;
  isActive: boolean;
};

const emptyFormState = (): PcFormState => ({
  pcNumber: "",
  pcName: "",
  status: "available",
  currentCustomer: "",
  remainingTime: "",
  currentSession: "",
  hourlyRate: "",
  lastActivity: "",
  isActive: true,
});

export default function PcManagementPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingPc, setViewingPc] = useState<any | null>(null);
  const [editingPc, setEditingPc] = useState<any | null>(null);
  const [formState, setFormState] = useState<PcFormState>(emptyFormState());
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const pcsQuery = trpc.computers.getAll.useQuery();
  const createMutation = trpc.computers.create.useMutation({
    onSuccess: async () => {
      await utils.computers.getAll.invalidate();
      setIsModalOpen(false);
      setEditingPc(null);
      setFormState(emptyFormState());
    },
  });
  const updateMutation = trpc.computers.update.useMutation({
    onSuccess: async () => {
      await utils.computers.getAll.invalidate();
      setIsModalOpen(false);
      setEditingPc(null);
      setFormState(emptyFormState());
    },
  });
  const deleteMutation = trpc.computers.delete.useMutation({
    onSuccess: async () => {
      await utils.computers.getAll.invalidate();
      setDeleteTarget(null);
    },
  });
  const statusMutation = trpc.computers.changeStatus.useMutation({
    onSuccess: async () => {
      await utils.computers.getAll.invalidate();
    },
  });

  const pcs = useMemo(() => {
    const list = (pcsQuery.data ?? []) as any[];
    return list.filter((pc) => {
      const matchesSearch = [pc.pcName, pc.pcNumber, pc.currentCustomer, pc.currentSession]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || (pc.status ?? "offline") === statusFilter || (statusFilter === "in_use" && (pc.status ?? "offline") === "in_use");
      return matchesSearch && matchesStatus;
    });
  }, [pcsQuery.data, search, statusFilter]);

  const readOnlyDetails = useMemo(() => {
    if (!viewingPc) return null;
    return [
      { label: "PC Number", value: viewingPc.pcNumber ?? "—" },
      { label: "PC Name", value: viewingPc.pcName ?? "—" },
      { label: "Status", value: viewingPc.status ?? "offline" },
      { label: "Current Customer", value: viewingPc.currentCustomer ?? "—" },
      { label: "Remaining Time", value: viewingPc.remainingTime ?? "—" },
      { label: "Current Session", value: viewingPc.currentSession ?? "—" },
      { label: "Hourly Rate", value: viewingPc.hourlyRate ? formatCurrency(Number(viewingPc.hourlyRate), settingsQuery.data?.general?.currency) : "—" },
      { label: "Last Activity", value: viewingPc.lastActivity ?? "—" },
    ];
  }, [viewingPc]);

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingPc(null);
    setFormState(emptyFormState());
  };

  const openCreateModal = () => {
    setEditingPc(null);
    setFormState(emptyFormState());
    setIsModalOpen(true);
  };

  const settingsQuery = useSettings();

  const openEditModal = (pc: any) => {
    setEditingPc(pc);
    setFormState({
      pcNumber: pc.pcNumber?.toString() ?? "",
      pcName: pc.pcName ?? "",
      status: pc.status ?? "available",
      currentCustomer: pc.currentCustomer ?? "",
      remainingTime: pc.remainingTime ?? "",
      currentSession: pc.currentSession ?? "",
      hourlyRate: pc.hourlyRate?.toString() ?? "",
      lastActivity: pc.lastActivity ?? "",
      isActive: pc.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      pcNumber: Number(formState.pcNumber) || 0,
      pcName: formState.pcName.trim(),
      status: formState.status,
      currentCustomer: formState.currentCustomer.trim(),
      remainingTime: formState.remainingTime.trim(),
      currentSession: formState.currentSession.trim(),
      hourlyRate: formState.hourlyRate.trim(),
      lastActivity: formState.lastActivity.trim() || new Date().toISOString(),
      isActive: formState.isActive,
    };

    if (!payload.pcName) return;

    if (editingPc) {
      updateMutation.mutate({ id: editingPc.id, ...payload });
      return;
    }

    createMutation.mutate(payload);
  };

  return (
    <AdminShell title="PC Management" description="Manage all workstations and their live status">
      <div className="space-y-6">
        <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-slate-400">Total PCs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{pcsQuery.data?.length ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Available</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-300">{pcs.filter((pc) => (pc.status ?? "offline") === "available").length}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">In Use</p>
            <p className="mt-2 text-3xl font-semibold text-amber-300">{pcs.filter((pc) => (pc.status ?? "offline") === "in_use").length}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Offline</p>
            <p className="mt-2 text-3xl font-semibold text-rose-300">{pcs.filter((pc) => (pc.status ?? "offline") === "offline").length}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Workstations</h2>
              <p className="text-sm text-slate-400">Search, filter, and manage every PC</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PCs" className="h-8 w-full border-0 bg-transparent p-0 text-sm" />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as (typeof statusOptions)[number])}>
                <SelectTrigger className="w-40 border-slate-700 bg-slate-950/70 text-slate-200">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option === "all" ? "All Status" : option.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={openCreateModal} className="gap-2">
                <Plus className="h-4 w-4" /> Add PC
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">PC #</TableHead>
                  <TableHead className="text-slate-400">PC Name</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Customer</TableHead>
                  <TableHead className="text-slate-400">Remaining</TableHead>
                  <TableHead className="text-slate-400">Session</TableHead>
                  <TableHead className="text-slate-400">Rate</TableHead>
                  <TableHead className="text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pcsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-slate-400">Loading PCs...</TableCell>
                  </TableRow>
                ) : pcs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-slate-400">No PCs match the current filter.</TableCell>
                  </TableRow>
                ) : (
                  pcs.map((pc) => (
                    <TableRow key={pc.id} className="border-slate-800 hover:bg-slate-800/40">
                      <TableCell className="font-medium text-white">{pc.pcNumber ?? "—"}</TableCell>
                      <TableCell>{pc.pcName}</TableCell>
                      <TableCell><PcStatusBadge status={pc.status} /></TableCell>
                      <TableCell>{pc.currentCustomer ?? "—"}</TableCell>
                      <TableCell>{pc.remainingTime ?? "—"}</TableCell>
                      <TableCell>{pc.currentSession ?? "—"}</TableCell>
                      <TableCell>{pc.hourlyRate ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setViewingPc(pc)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(pc)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(pc)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => statusMutation.mutate({ id: pc.id, status: pc.status === "offline" ? "available" : "offline" })}>
                            {pc.status === "offline" ? <Power className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => (!open ? resetModal() : setIsModalOpen(true))}>
        <DialogContent className="max-w-2xl border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>{editingPc ? "Edit PC" : "Add New PC"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitForm} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="pcNumber">PC Number</Label>
                <Input id="pcNumber" value={formState.pcNumber} onChange={(e) => setFormState({ ...formState, pcNumber: e.target.value })} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="pcName">PC Name</Label>
                <Input id="pcName" value={formState.pcName} onChange={(e) => setFormState({ ...formState, pcName: e.target.value })} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formState.status} onValueChange={(value) => setFormState({ ...formState, status: value })}>
                  <SelectTrigger id="status" className="mt-2 border-slate-700 bg-slate-950/70 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.filter((option) => option !== "all").map((option) => (
                      <SelectItem key={option} value={option}>{option.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="hourlyRate">Hourly Rate</Label>
                <Input id="hourlyRate" value={formState.hourlyRate} onChange={(e) => setFormState({ ...formState, hourlyRate: e.target.value })} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="currentCustomer">Current Customer</Label>
                <Input id="currentCustomer" value={formState.currentCustomer} onChange={(e) => setFormState({ ...formState, currentCustomer: e.target.value })} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="remainingTime">Remaining Time</Label>
                <Input id="remainingTime" value={formState.remainingTime} onChange={(e) => setFormState({ ...formState, remainingTime: e.target.value })} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="currentSession">Current Session</Label>
                <Input id="currentSession" value={formState.currentSession} onChange={(e) => setFormState({ ...formState, currentSession: e.target.value })} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="lastActivity">Last Activity</Label>
                <Input id="lastActivity" value={formState.lastActivity} onChange={(e) => setFormState({ ...formState, lastActivity: e.target.value })} className="mt-2" />
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
              <input id="isActive" type="checkbox" checked={formState.isActive} onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })} />
              <Label htmlFor="isActive" className="cursor-pointer">Enable PC</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetModal}>Cancel</Button>
              <Button type="submit">{editingPc ? "Save Changes" : "Create PC"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingPc)} onOpenChange={(open) => (!open ? setViewingPc(null) : undefined)}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Monitor className="h-5 w-5" />{viewingPc?.pcName ?? "PC Details"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {readOnlyDetails?.map((detail) => (
              <div key={detail.label} className="flex justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                <span className="text-slate-400">{detail.label}</span>
                <span className="text-right font-medium text-white">{detail.value}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? setDeleteTarget(null) : undefined)}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Delete PC</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">Are you sure you want to delete {deleteTarget?.pcName ?? "this PC"}?</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => deleteMutation.mutate({ id: deleteTarget?.id })}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
