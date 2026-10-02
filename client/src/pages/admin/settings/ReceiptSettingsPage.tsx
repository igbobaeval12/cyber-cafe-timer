import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ReceiptSettingsPage() {
  const settingsQuery = trpc.settings.get.useQuery();
  const utils = trpc.useUtils();
  const updateMutation = trpc.settings.update.useMutation({ onSuccess: async () => { toast.success("Receipt settings saved"); await utils.settings.get.invalidate(); }, onError: (error) => toast.error(error.message) });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (settingsQuery.data?.receipt) setForm(settingsQuery.data.receipt); }, [settingsQuery.data]);

  const save = () => updateMutation.mutate({ receipt: form });

  return (
    <AdminShell title="Receipt Settings" description="Customize receipt output and branding">
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-white">Receipt Preferences</CardTitle>
          <CardDescription className="text-slate-400">Set branding, footer text, and receipt defaults.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Header text" value={form.header ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, header: e.target.value }))} />
          <Input placeholder="Footer text" value={form.footer ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, footer: e.target.value }))} />
          <Input placeholder="Business information" value={form.businessInformation ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, businessInformation: e.target.value }))} />
          <Input placeholder="QR code (true/false)" value={String(form.qrCode ?? false)} onChange={(e) => setForm((current: any) => ({ ...current, qrCode: e.target.value === "true" }))} />
          <Input placeholder="Receipt number format" value={form.receiptNumberFormat ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, receiptNumberFormat: e.target.value }))} />
        </CardContent>
        <div className="p-6 pt-0"><Button disabled={updateMutation.isPending} onClick={save}>{updateMutation.isPending ? "Saving..." : "Save Receipt Settings"}</Button></div>
      </Card>
    </AdminShell>
  );
}
