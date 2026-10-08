import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function PcSettingsPage() {
  const settingsQuery = trpc.settings.get.useQuery();
  const utils = trpc.useUtils();
  const updateMutation = trpc.settings.update.useMutation({ onSuccess: async () => { toast.success("PC settings saved"); await utils.settings.get.invalidate(); }, onError: (error) => toast.error(error.message) });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (settingsQuery.data?.pc) setForm(settingsQuery.data.pc); }, [settingsQuery.data]);

  const save = () => updateMutation.mutate({ pc: form });

  return (
    <AdminShell title="PC Settings" description="Configure workstation defaults and session behavior">
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-white">Workstation Defaults</CardTitle>
          <CardDescription className="text-slate-400">Adjust default machine session settings for newly created PCs.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><label className="text-sm font-medium text-white">Default Session Length (minutes)</label><Input type="number" min="1" placeholder="e.g. 60" value={form.defaultSessionDuration ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, defaultSessionDuration: Number(e.target.value) }))} />
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-white">Warning Notification Time (minutes)</label><Input type="number" min="0" placeholder="e.g. 10" value={form.warningNotificationTime ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, warningNotificationTime: Number(e.target.value) }))} />
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-white">Auto Lock PC</label><Input placeholder="Type true or false" value={String(form.autoLockPc ?? false)} onChange={(e) => setForm((current: any) => ({ ...current, autoLockPc: e.target.value === "true" }))} />
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-white">Auto Shutdown</label><Input placeholder="Type true or false" value={String(form.autoShutdown ?? false)} onChange={(e) => setForm((current: any) => ({ ...current, autoShutdown: e.target.value === "true" }))} />
          </div>
        </CardContent>
        <div className="p-6 pt-0"><Button disabled={updateMutation.isPending} onClick={save}>{updateMutation.isPending ? "Saving..." : "Save PC Settings"}</Button></div>
      </Card>
    </AdminShell>
  );
}
