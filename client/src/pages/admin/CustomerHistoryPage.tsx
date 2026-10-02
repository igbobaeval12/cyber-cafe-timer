import { useMemo } from "react";
import { useRoute } from "wouter";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/currency";

export default function CustomerHistoryPage() {
  const [, params] = useRoute("/admin/customers/:id/history");
  const customerId = Number(params?.id ?? 0);
  const historyQuery = trpc.customers.getHistory.useQuery({ customerId }, { enabled: Boolean(customerId) });
  const history = useMemo(() => (historyQuery.data ?? {}) as any, [historyQuery.data]);

  return (
    <AdminShell title="Customer History" description="Review sessions and billing activity for this customer">
      <div className="space-y-6">
        <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>{history?.customer?.name ?? `Customer #${customerId}`}</span>
              <Badge className="bg-slate-700 text-slate-200">{history?.customer?.membershipTier ?? "walk_in"}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <p>Phone: {history?.customer?.phoneNumber ?? "—"}</p>
            <p>Email: {history?.customer?.email ?? "—"}</p>
            <p>Status: {history?.customer?.customerStatus ?? "active"}</p>
            <p>Loyalty Points: {history?.customer?.loyaltyPoints ?? 0}</p>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader>
              <CardTitle>Session Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(history?.sessions ?? []).length === 0 ? (
                <p className="text-sm text-slate-400">No session history recorded.</p>
              ) : (
                (history?.sessions ?? []).map((session: any) => (
                  <div key={session.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="font-semibold text-white">Session #{session.id}</p>
                    <p className="text-sm text-slate-400">
                      {new Date(session.startTime).toLocaleString()} • {session.totalDurationMinutes ?? 0} min • {session.sessionStatus}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader>
              <CardTitle>Billing Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(history?.bills ?? []).length === 0 ? (
                <p className="text-sm text-slate-400">No billing history recorded.</p>
              ) : (
                (history?.bills ?? []).map((bill: any) => (
                  <div key={bill.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="font-semibold text-white">Bill #{bill.id}</p>
                    <p className="text-sm text-slate-400">
                      {bill.status} • {formatCurrency(bill.totalAmount)} • {bill.paymentMethod}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
      </div>
    </AdminShell>
  );
}
