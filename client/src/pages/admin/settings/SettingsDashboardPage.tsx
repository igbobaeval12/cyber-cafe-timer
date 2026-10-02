import { useMemo, useState } from "react";
import { Bell, Database, FileText, Lock, Monitor, Receipt, Search, Settings, ShieldCheck, Upload } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function SettingsDashboardPage() {
  const [, navigate] = useLocation();
  const settingsQuery = trpc.settings.get.useQuery();
  const settings = settingsQuery.data ?? {};

  const cards = useMemo(() => [
    { title: "General", description: "Cafe identity and contact details", icon: Settings, href: "/admin/settings/general" },
    { title: "Pricing", description: "Rates, packages, and discounts", icon: Receipt, href: "/admin/settings/pricing" },
    { title: "Notifications", description: "Alerts and notification channels", icon: Bell, href: "/admin/settings/notifications" },
    { title: "Backup", description: "Backups, restore, and exports", icon: Database, href: "/admin/settings/backup" },
    { title: "Security", description: "Auth, policy, and access controls", icon: Lock, href: "/admin/settings/security" },
    { title: "Receipt", description: "Receipt formatting and branding", icon: FileText, href: "/admin/settings/receipt" },
    { title: "Logs", description: "System activity and audit trail", icon: ShieldCheck, href: "/admin/settings/logs" },
    { title: "PC", description: "Session and workstation defaults", icon: Monitor, href: "/admin/settings/pc" },
  ], []);

  return (
    <AdminShell title="Settings" description="Configure the cyber café platform">
      <div className="space-y-6">
        <Card className="border-slate-800 bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-white">System Overview</CardTitle>
            <CardDescription className="text-slate-400">Manage the operational configuration for your café.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm text-slate-400">Cafe Name</p>
              <p className="mt-1 text-xl font-semibold text-white">{settings.general?.cafeName ?? "Cyber Café"}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm text-slate-400">Default Hourly Rate</p>
              <p className="mt-1 text-xl font-semibold text-white">{settings.business?.defaultHourlyRate ?? 5}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button key={card.title} onClick={() => navigate(card.href)} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left transition hover:border-cyan-500/50 hover:bg-slate-800">
                <div className="flex items-center gap-2 text-cyan-400"><Icon className="h-4 w-4" /><span className="text-sm font-medium">{card.title}</span></div>
                <p className="mt-3 text-sm text-slate-400">{card.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
