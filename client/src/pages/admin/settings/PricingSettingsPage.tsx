import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function PricingSettingsPage() {
  const settingsQuery = trpc.settings.get.useQuery();
  const utils = trpc.useUtils();
  const updateMutation = trpc.settings.update.useMutation({ onSuccess: async () => { toast.success("Pricing settings saved"); await utils.settings.get.invalidate(); }, onError: (error) => toast.error(error.message) });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (settingsQuery.data?.business) setForm(settingsQuery.data.business); }, [settingsQuery.data]);

  const save = () => updateMutation.mutate({ business: form });

  return (
    <AdminShell title="Pricing Settings" description="Configure pricing, packages, and discounts">
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-white">Business Pricing</CardTitle>
          <CardDescription className="text-slate-400">Set defaults for sessions, printing, and membership discounts.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Default hourly rate" value={form.defaultHourlyRate ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, defaultHourlyRate: Number(e.target.value) }))} />
          <Input placeholder="VAT / Tax %" value={form.vatPercentage ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, vatPercentage: Number(e.target.value) }))} />
          <Input placeholder="Printing Black & White" value={form.printingPrices?.blackWhite ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, printingPrices: { ...(current.printingPrices ?? {}), blackWhite: Number(e.target.value) } }))} />
          <Input placeholder="Printing Color" value={form.printingPrices?.color ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, printingPrices: { ...(current.printingPrices ?? {}), color: Number(e.target.value) } }))} />
          <Input placeholder="Scanning Price" value={form.scanningPrices ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, scanningPrices: Number(e.target.value) }))} />
          <Input placeholder="Photocopy Price" value={form.photocopyPrices ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, photocopyPrices: Number(e.target.value) }))} />
          <Input placeholder="Membership Discount %" value={form.membershipDiscounts?.vip ?? ""} onChange={(e) => setForm((current: any) => ({ ...current, membershipDiscounts: { ...(current.membershipDiscounts ?? {}), vip: Number(e.target.value) } }))} />
        </CardContent>
        <div className="p-6 pt-0"><Button disabled={updateMutation.isPending} onClick={save}>{updateMutation.isPending ? "Saving..." : "Save Pricing Settings"}</Button></div>
      </Card>
    </AdminShell>
  );
}
