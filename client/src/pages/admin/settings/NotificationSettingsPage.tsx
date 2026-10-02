import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function NotificationSettingsPage() {
  const settingsQuery = trpc.settings.get.useQuery();
  const utils = trpc.useUtils();
  const updateMutation = trpc.settings.update.useMutation({ onSuccess: async () => { toast.success("Notification settings saved"); await utils.settings.get.invalidate(); }, onError: (error) => toast.error(error.message) });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (settingsQuery.data?.notifications) setForm(settingsQuery.data.notifications); }, [settingsQuery.data]);

  const toggle = (key: string, value: boolean) => setForm((current: any) => ({ ...current, [key]: value }));
  const save = () => updateMutation.mutate({ notifications: form });

  const flags = [
    ["sessionEndingSoon", "Session Ending Soon"],
    ["sessionExpired", "Session Expired"],
    ["newCustomer", "New Customer"],
    ["lowInventory", "Low Inventory"],
    ["outOfStock", "Out of Stock"],
    ["failedLoginAttempts", "Failed Login Attempts"],
    ["successfulBackup", "Successful Backup"],
    ["systemErrors", "System Errors"],
    ["soundNotifications", "Sound Notifications"],
    ["inAppNotifications", "In-App Notifications"],
    ["emailNotifications", "Email Notifications"],
  ];

  return (
    <AdminShell title="Notification Settings" description="Choose which alerts and delivery channels should be active">
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-white">Notification Preferences</CardTitle>
          <CardDescription className="text-slate-400">Keep operators informed about critical events.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {flags.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
              <span>{label}</span>
              <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => toggle(key, e.target.checked)} />
            </label>
          ))}
          <Button disabled={updateMutation.isPending} onClick={save}>{updateMutation.isPending ? "Saving..." : "Save Notification Settings"}</Button>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
