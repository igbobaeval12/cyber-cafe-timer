import { useMemo } from "react";
import { useRoute } from "wouter";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/currency";

export default function CustomerDetailsPage() {
  const [, params] = useRoute("/admin/customers/:id");
  const customerId = Number(params?.id ?? 0);
  const customerQuery = trpc.customers.getById.useQuery({ customerId }, { enabled: Boolean(customerId) });
  const historyQuery = trpc.customers.getHistory.useQuery({ customerId }, { enabled: Boolean(customerId) });

  const customer = customerQuery.data as any;
  const history = useMemo(() => historyQuery.data as any, [historyQuery.data]);
  const stats = useMemo(() => {
    const billTotal = (history?.bills ?? []).reduce((sum: number, bill: any) => sum + Number(bill.totalAmount || 0), 0);
    const hoursUsed = (history?.sessions ?? []).reduce((sum: number, session: any) => sum + Number(session.totalDurationMinutes || 0), 0) / 60;
    return {
      visits: (history?.sessions ?? []).length,
      hoursUsed: Number(hoursUsed.toFixed(2)),
      totalSpent: Number(billTotal.toFixed(2)),
      currentActiveSession: (history?.sessions ?? []).find((session: any) => session.sessionStatus === "active") ?? null,
    };
  }, [history]);

  return (
    <AdminShell title="Customer Profile" description="Detailed customer account and session insights">
      <div className="space-y-6">
        <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>{customer?.name ?? `Customer #${customerId}`}</span>
              <Badge className="bg-slate-700 text-slate-200">{customer?.membershipTier ?? "walk_in"}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <p>Phone: {customer?.phoneNumber ?? "—"}</p>
            <p>Email: {customer?.email ?? "—"}</p>
            <p>Status: {customer?.customerStatus ?? "active"}</p>
            <p>Loyalty Points: {customer?.loyaltyPoints ?? 0}</p>
            <p>Prepaid Balance: {formatCurrency(customer?.prepaidBalance)}</p>
            <p>Notes: {customer?.customerNotes ?? "—"}</p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100"><CardContent className="p-4"><p className="text-sm text-slate-400">Total Visits</p><p className="text-2xl font-semibold text-white">{stats.visits}</p></CardContent></Card>
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100"><CardContent className="p-4"><p className="text-sm text-slate-400">Total Hours Used</p><p className="text-2xl font-semibold text-white">{stats.hoursUsed}</p></CardContent></Card>
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100"><CardContent className="p-4"><p className="text-sm text-slate-400">Total Amount Spent</p><p className="text-2xl font-semibold text-white">{formatCurrency(stats.totalSpent)}</p></CardContent></Card>
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100"><CardContent className="p-4"><p className="text-sm text-slate-400">Current Active Session</p><p className="text-sm font-semibold text-white">{stats.currentActiveSession ? `Session #${stats.currentActiveSession.id}` : "None"}</p></CardContent></Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader><CardTitle>Session History</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(history?.sessions ?? []).length === 0 ? <p className="text-sm text-slate-400">No session history.</p> : (history?.sessions ?? []).map((session: any) => (
                <div key={session.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="font-semibold text-white">Session #{session.id}</p>
                  <p className="text-sm text-slate-400">{new Date(session.startTime).toLocaleString()} • {session.totalDurationMinutes} min</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader><CardTitle>Billing History</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(history?.bills ?? []).length === 0 ? <p className="text-sm text-slate-400">No billing history.</p> : (history?.bills ?? []).map((bill: any) => (
                <div key={bill.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="font-semibold text-white">Bill #{bill.id}</p>
                  <p className="text-sm text-slate-400">{bill.status} • {formatCurrency(bill.totalAmount)} • {bill.paymentMethod}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
      </div>
    </AdminShell>
  );
}
