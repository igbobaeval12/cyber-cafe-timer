import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SecuritySettingsPage() {
  const settingsQuery = trpc.settings.get.useQuery();
  const utils = trpc.useUtils();
  const updateMutation = trpc.settings.update.useMutation({ onSuccess: async () => { toast.success("Security settings saved"); await utils.settings.get.invalidate(); }, onError: (error) => toast.error(error.message) });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (settingsQuery.data?.security) setForm(settingsQuery.data.security); }, [settingsQuery.data]);

  const save = () => updateMutation.mutate({ security: form });

  return (
    <AdminShell title="Security Settings" description="Protect access and enforce compliance">
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-white">Access Controls</CardTitle>
          <CardDescription className="text-slate-400">Configure password policy and session security defaults.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Max login attempts" value={form.maxLoginAttempts ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, maxLoginAttempts: Number(e.target.value) }))} />
          <Input placeholder="Session timeout (minutes)" value={form.sessionTimeout ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, sessionTimeout: Number(e.target.value) }))} />
          <Input placeholder="Password policy" value={form.passwordPolicy ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, passwordPolicy: e.target.value }))} />
          <Input placeholder="Two-factor authentication (true/false)" value={String(form.twoFactorAuthentication ?? false)} onChange={(e) => setForm((current: any) => ({ ...current, twoFactorAuthentication: e.target.value === "true" }))} />
          <Input placeholder="IP restrictions (true/false)" value={String(form.ipRestrictions ?? false)} onChange={(e) => setForm((current: any) => ({ ...current, ipRestrictions: e.target.value === "true" }))} />
        </CardContent>
        <div className="p-6 pt-0"><Button disabled={updateMutation.isPending} onClick={save}>{updateMutation.isPending ? "Saving..." : "Save Security Settings"}</Button></div>
      </Card>
    </AdminShell>
  );
}
