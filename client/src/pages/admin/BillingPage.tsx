import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PaymentModal } from "@/components/admin/PaymentModal";
import { ReceiptPreview } from "@/components/admin/ReceiptPreview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/currency";
import { useSettings } from "@/hooks/useSettings";

interface BillRecord {
  id: number;
  sessionId: number;
  totalAmount: string | number;
  status: string;
  paymentMethod: string;
  createdAt?: string | Date;
  discountAmount?: string | number;
  baseCharge?: string | number;
  additionalCharges?: string | number;
  notes?: string | null;
}

export default function BillingPage() {
  const utils = trpc.useUtils();
  const [selectedBill, setSelectedBill] = useState<BillRecord | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  const billsQuery = trpc.bills.getAll.useQuery();
  const summaryQuery = trpc.bills.summary.useQuery();
  const settingsQuery = useSettings();
  const receiptHistoryQuery = trpc.bills.getReceiptHistory.useQuery({ limit: 10 });
  const createReceiptMutation = trpc.bills.generateReceipt.useMutation({
    onSuccess: async (data) => {
      setReceipt(data);
      setReceiptOpen(true);
      await utils.bills.getAll.invalidate();
      await utils.bills.summary.invalidate();
    },
  });
  const recordPaymentMutation = trpc.bills.recordPayment.useMutation({
    onSuccess: async () => {
      setPaymentOpen(false);
      await utils.bills.getAll.invalidate();
      await utils.bills.summary.invalidate();
    },
  });

  const bills = useMemo<BillRecord[]>(() => (billsQuery.data ?? []) as BillRecord[], [billsQuery.data]);
  const summary = summaryQuery.data;
  const receiptHistory = useMemo(() => (receiptHistoryQuery.data ?? []) as any[], [receiptHistoryQuery.data]);

  const openPayment = (bill: BillRecord) => {
    setSelectedBill(bill);
    setPaymentOpen(true);
  };

  const handlePaymentSubmit = (payload: { amount: number; paymentMethod: string; referenceNumber: string; notes: string }) => {
    if (!selectedBill) return;
    recordPaymentMutation.mutate({
      billId: selectedBill.id,
      sessionId: selectedBill.sessionId,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod as any,
      referenceNumber: payload.referenceNumber,
      notes: payload.notes,
    });
  };

  const handleGenerateReceipt = (bill: BillRecord) => {
    createReceiptMutation.mutate({
      billId: bill.id,
      sessionId: bill.sessionId,
      customerName: "Guest",
      staffName: "Admin",
      paymentMethod: bill.paymentMethod as any,
      servicesUsed: "PC Session",
      itemizedCharges: `Base Charge: ${formatCurrency(bill.baseCharge)}\nAdditional Charges: ${formatCurrency(bill.additionalCharges)}\nDiscount: -${formatCurrency(bill.discountAmount)}`,
    });
  };

  const handlePrintReceipt = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDownloadReceiptPdf = () => {
    if (!receipt) return;

    const lines = [
      `Receipt: ${receipt.receiptNumber ?? "N/A"}`,
      `Customer: ${receipt.customerName ?? "Guest"}`,
      `PC: #${receipt.computerId ?? "-"}`,
      `Start: ${receipt.startTime ? new Date(receipt.startTime).toLocaleString() : "-"}`,
      `End: ${receipt.endTime ? new Date(receipt.endTime).toLocaleString() : "-"}`,
      `Duration: ${receipt.durationMinutes ?? 0} minutes`,
      `Services: ${receipt.servicesUsed ?? "PC Session"}`,
      `Charges: ${receipt.itemizedCharges ?? "-"}`,
      `Discount: ${formatCurrency(receipt.discountAmount)}`,
      `Total: ${formatCurrency(receipt.totalAmount)}`,
      `Payment: ${receipt.paymentMethod ?? "-"}`,
      `Staff: ${receipt.staffName ?? "Admin"}`,
    ];

    const escapePdfText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const content = lines.map((line, index) => `BT /F1 12 Tf 50 ${740 - index * 18} Td (${escapePdfText(line)}) Tj ET`).join("\n");
    const contentStream = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
      contentStream,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ];

    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(receipt.receiptNumber ?? "receipt").replace(/\s+/g, "-")}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell title="Billing & Receipts" description="Manage invoices, payments, and receipt history">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader><CardTitle className="text-sm text-slate-400">Today’s Revenue</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold text-white">{formatCurrency(Number(summary?.todayRevenue ?? 0), settingsQuery.data?.general?.currency)}</p></CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader><CardTitle className="text-sm text-slate-400">Total Revenue</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold text-white">{formatCurrency(Number(summary?.totalRevenue ?? 0), settingsQuery.data?.general?.currency)}</p></CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader><CardTitle className="text-sm text-slate-400">Pending Payments</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold text-white">{summary?.pendingPayments ?? 0}</p></CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader><CardTitle className="text-sm text-slate-400">Recent Transactions</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold text-white">{summary?.recentTransactions ?? 0}</p></CardContent>
          </Card>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader><CardTitle>Billing Records</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {bills.length === 0 ? <p className="text-sm text-slate-400">No bills have been created yet.</p> : bills.map((bill) => (
                <div key={bill.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">Bill #{bill.id}</p>
                      <p className="text-sm text-slate-400">Session {bill.sessionId} • {bill.createdAt ? new Date(bill.createdAt).toLocaleString() : "-"}</p>
                    </div>
                    <Badge className={bill.status === "paid" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}>{bill.status}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                    <span className="rounded-full bg-slate-800 px-2.5 py-1">{formatCurrency(Number(bill.totalAmount || 0), settingsQuery.data?.general?.currency)}</span>
                    <span className="rounded-full bg-slate-800 px-2.5 py-1">{bill.paymentMethod}</span>
                    <span className="rounded-full bg-slate-800 px-2.5 py-1">Discount: {formatCurrency(Number(bill.discountAmount || 0), settingsQuery.data?.general?.currency)}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openPayment(bill)}>Record Payment</Button>
                    <Button size="sm" variant="outline" onClick={() => handleGenerateReceipt(bill)}>Preview Receipt</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader>
              <CardTitle>Receipt History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {receiptHistory.length === 0 ? (
                <p className="text-sm text-slate-400">No receipt history available yet.</p>
              ) : (
                receiptHistory.map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{item.receiptNumber ?? `Receipt #${item.id}`}</p>
                        <p className="text-sm text-slate-400">{item.customerName ?? "Guest"} • {new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                      <Badge className="bg-slate-700 text-slate-200">{item.paymentMethod}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setReceipt(item); setReceiptOpen(true); }}>
                        <Printer className="mr-2 h-4 w-4" /> Reprint
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setReceipt(item); setReceiptOpen(true); }}>
                        <Download className="mr-2 h-4 w-4" /> PDF
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <PaymentModal open={paymentOpen} onOpenChange={setPaymentOpen} bill={selectedBill} onSubmit={handlePaymentSubmit} />

      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-2xl border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Receipt Preview</DialogTitle>
          </DialogHeader>
          <ReceiptPreview receipt={receipt} onPrint={handlePrintReceipt} onDownloadPdf={handleDownloadReceiptPdf} />
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
