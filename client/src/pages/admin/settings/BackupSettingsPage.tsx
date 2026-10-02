import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function BackupSettingsPage() {
  const utils = trpc.useUtils();
  const backupMutation = trpc.settings.createBackup.useMutation({ onSuccess: async () => { toast.success("Backup created successfully"); await utils.settings.getBackups.invalidate(); }, onError: (error) => toast.error(error.message) });
  const backupHistory = trpc.settings.getBackups.useQuery();

  return (
    <AdminShell title="Backup Settings" description="Create and review backup history">
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-white">Backup Management</CardTitle>
          <CardDescription className="text-slate-400">Trigger a backup and review recent recovery points.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button disabled={backupMutation.isPending} onClick={() => backupMutation.mutate()}>{backupMutation.isPending ? "Creating..." : "Create Backup"}</Button>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Recent Backups</p>
            {backupHistory.data?.length ? backupHistory.data.map((entry: any) => (
              <div key={entry.id} className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2">
                <span>{entry.name ?? entry.description ?? "Backup"}</span>
                <span className="text-slate-400">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}</span>
              </div>
            )) : <p className="mt-2 text-slate-400">No backups recorded yet.</p>}
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
