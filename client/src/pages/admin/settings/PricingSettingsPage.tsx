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
  const updateSettingsMutation = trpc.settings.update.useMutation();
  const createPricingMutation = trpc.pricing.create.useMutation();
  const updatePricingMutation = trpc.pricing.update.useMutation();
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (settingsQuery.data?.business) setForm(settingsQuery.data.business);
  }, [settingsQuery.data]);

  const save = async () => {
    const hourlyRate = Number(form.defaultHourlyRate);

    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
      toast.error("Enter a valid Default hourly rate before saving.");
      return;
    }

    try {
      await updateSettingsMutation.mutateAsync({ business: form });

      const pricingConfigs = await utils.pricing.getAll.fetch();
      const activeConfigs = pricingConfigs.filter((config) => config.isActive);

      if (activeConfigs.length > 0) {
        await Promise.all(
          activeConfigs.map((config) =>
            updatePricingMutation.mutateAsync({
              id: config.id,
              isActive: false,
            }),
          ),
        );
        await updatePricingMutation.mutateAsync({
          id: activeConfigs[0].id,
          name: "Default",
          hourlyRate: hourlyRate.toFixed(2),
          minimumCharge: activeConfigs[0].minimumCharge ?? "0",
          discountPercentage: activeConfigs[0].discountPercentage ?? "0",
          isActive: true,
        });
      } else {
        await createPricingMutation.mutateAsync({
          name: "Default",
          hourlyRate: hourlyRate.toFixed(2),
          minimumCharge: "0",
          discountPercentage: "0",
          isActive: true,
        });
      }

      await utils.settings.get.invalidate();
      await utils.pricing.getAll.invalidate();
      await utils.pricing.getActive.invalidate();
      toast.success("Pricing settings saved and the active session rate was updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save pricing settings.");
    }
  };

  const isSaving =
    updateSettingsMutation.isPending ||
    createPricingMutation.isPending ||
    updatePricingMutation.isPending;

  return (
    <AdminShell title="Pricing Settings" description="Configure pricing, packages, and discounts">
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-white">Business Pricing</CardTitle>
          <CardDescription className="text-slate-400">
            Set defaults for sessions, printing, and membership discounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Default hourly rate"
            value={form.defaultHourlyRate ?? ""}
            onChange={(e) =>
              setForm((current: any) => ({
                ...current,
                defaultHourlyRate: Number(e.target.value),
              }))
            }
          />
          <Input
            placeholder="VAT / Tax %"
            value={form.vatPercentage ?? ""}
            onChange={(e) =>
              setForm((current: any) => ({
                ...current,
                vatPercentage: Number(e.target.value),
              }))
            }
          />
          <Input
            placeholder="Printing Black & White"
            value={form.printingPrices?.blackWhite ?? ""}
            onChange={(e) =>
              setForm((current: any) => ({
                ...current,
                printingPrices: {
                  ...(current.printingPrices ?? {}),
                  blackWhite: Number(e.target.value),
                },
              }))
            }
          />
          <Input
            placeholder="Printing Color"
            value={form.printingPrices?.color ?? ""}
            onChange={(e) =>
              setForm((current: any) => ({
                ...current,
                printingPrices: {
                  ...(current.printingPrices ?? {}),
                  color: Number(e.target.value),
                },
              }))
            }
          />
          <Input
            placeholder="Scanning Price"
            value={form.scanningPrices ?? ""}
            onChange={(e) =>
              setForm((current: any) => ({
                ...current,
                scanningPrices: Number(e.target.value),
              }))
            }
          />
          <Input
            placeholder="Photocopy Price"
            value={form.photocopyPrices ?? ""}
            onChange={(e) =>
              setForm((current: any) => ({
                ...current,
                photocopyPrices: Number(e.target.value),
              }))
            }
          />
          <Input
            placeholder="Membership Discount %"
            value={form.membershipDiscounts?.vip ?? ""}
            onChange={(e) =>
              setForm((current: any) => ({
                ...current,
                membershipDiscounts: {
                  ...(current.membershipDiscounts ?? {}),
                  vip: Number(e.target.value),
                },
              }))
            }
          />
        </CardContent>
        <div className="p-6 pt-0">
          <Button disabled={isSaving} onClick={save}>
            {isSaving ? "Saving..." : "Save Pricing Settings"}
          </Button>
        </div>
      </Card>
    </AdminShell>
  );
}
