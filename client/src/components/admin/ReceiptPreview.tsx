import { formatCurrency } from "@/lib/currency";
import { useSettings } from "@/hooks/useSettings";

interface ReceiptPreviewProps {
  receipt: {
    receiptNumber?: string;
    customerName?: string;
    computerId?: number;
    startTime?: string | Date;
    endTime?: string | Date;
    durationMinutes?: number;
    servicesUsed?: string;
    itemizedCharges?: string;
    discountAmount?: string | number;
    totalAmount?: string | number;
    paymentMethod?: string;
    staffName?: string;
  } | null;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
}

export function ReceiptPreview({ receipt, onPrint, onDownloadPdf }: ReceiptPreviewProps) {
  if (!receipt) return null;
  const settingsQuery = useSettings();

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950 p-6 text-sm text-slate-200">
      <div className="mb-4 text-center">
        <p className="text-lg font-semibold text-white">Cyber Café Receipt</p>
        <p className="text-slate-400">{receipt.receiptNumber ?? "N/A"}</p>
      </div>
      <div className="space-y-2">
        <p><span className="text-slate-400">Customer:</span> {receipt.customerName ?? "Guest"}</p>
        <p><span className="text-slate-400">PC:</span> #{receipt.computerId ?? "-"}</p>
        <p><span className="text-slate-400">Start:</span> {receipt.startTime ? new Date(receipt.startTime).toLocaleString() : "-"}</p>
        <p><span className="text-slate-400">End:</span> {receipt.endTime ? new Date(receipt.endTime).toLocaleString() : "-"}</p>
        <p><span className="text-slate-400">Duration:</span> {receipt.durationMinutes ?? 0} min</p>
        <p><span className="text-slate-400">Services:</span> {receipt.servicesUsed ?? "PC Session"}</p>
        <p className="whitespace-pre-wrap"><span className="text-slate-400">Charges:</span> {receipt.itemizedCharges ?? "-"}</p>
        <p><span className="text-slate-400">Discount:</span> {formatCurrency(Number(receipt.discountAmount || 0))}</p>
        <p><span className="text-slate-400">Total:</span> {formatCurrency(Number(receipt.totalAmount || 0))}</p>
        <p><span className="text-slate-400">Payment:</span> {receipt.paymentMethod ?? "-"}</p>
        <p><span className="text-slate-400">Staff:</span> {receipt.staffName ?? "Admin"}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={onPrint} className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">Print Receipt</button>
        <button onClick={onDownloadPdf} className="rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400">Download PDF</button>
      </div>
    </div>
  );
}
