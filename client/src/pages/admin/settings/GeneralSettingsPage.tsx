import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function GeneralSettingsPage() {
  const settingsQuery = trpc.settings.get.useQuery();
  const utils = trpc.useUtils();
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: async () => { toast.success("General settings saved"); await utils.settings.get.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (settingsQuery.data?.general) setForm(settingsQuery.data.general); }, [settingsQuery.data]);

  const save = () => updateMutation.mutate({ general: form });

  return (
    <AdminShell title="General Settings" description="Configure the café identity and contact information">
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-white">General Configuration</CardTitle>
          <CardDescription className="text-slate-400">Update the basic business identity and localization settings.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><label className="text-sm font-medium text-white">Cyber Café Name</label><Input placeholder="e.g. Ba-eval Cyber Café" value={form.cafeName ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, cafeName: e.target.value }))} />
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-white">Business Address</label><Input placeholder="e.g. 123 Main Street, Calabar" value={form.address ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, address: e.target.value }))} />
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-white">Phone Number</label><Input placeholder="e.g. 08012345678" value={form.phoneNumber ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, phoneNumber: e.target.value }))} />
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-white">Email Address</label><Input type="email" placeholder="e.g. cafe@example.com" value={form.email ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, email: e.target.value }))} />
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-white">Website</label><Input placeholder="e.g. https://example.com" value={form.website ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, website: e.target.value }))} />
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-white">Currency</label><Input value="NGN (₦)" disabled />
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-white">Time Zone</label><Input placeholder="e.g. Africa/Lagos" value={form.timeZone ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, timeZone: e.target.value }))} />
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-white">Date Format</label><Input placeholder="e.g. DD/MM/YYYY" value={form.dateFormat ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, dateFormat: e.target.value }))} />
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-white">Language</label><Input placeholder="e.g. English" value={form.language ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, language: e.target.value }))} />
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-white">Theme</label><Input placeholder="e.g. dark" value={form.theme ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, theme: e.target.value }))} />
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-white">System Version</label><Input placeholder="e.g. 1.0.0" value={form.systemVersion ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, systemVersion: e.target.value }))} />
          </div>
        </CardContent>
        <div className="p-6 pt-0"><Button disabled={updateMutation.isPending} onClick={save}>{updateMutation.isPending ? "Saving..." : "Save General Settings"}</Button></div>
      </Card>
    </AdminShell>
  );
}
