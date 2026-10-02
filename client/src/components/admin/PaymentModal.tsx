import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BillRecord {
  id: number;
  totalAmount: string | number;
  status: string;
}

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill?: BillRecord | null;
  onSubmit: (payload: { amount: number; paymentMethod: string; referenceNumber: string; notes: string }) => void;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'pos', label: 'POS / Card' },
  { value: 'mobile', label: 'Mobile Payment' },
];

export function PaymentModal({ open, onOpenChange, bill, onSubmit }: PaymentModalProps) {
  const [amount, setAmount] = useState<string>(bill ? String(bill.totalAmount ?? 0) : "0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (bill) {
      setAmount(String(bill.totalAmount ?? 0));
    }
  }, [bill]);

  const handleSubmit = () => {
    onSubmit({
      amount: Number(amount || 0),
      paymentMethod,
      referenceNumber,
      notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input value={amount} onChange={(event) => setAmount(event.target.value)} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Reference Number</Label>
            <Input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">Save Payment</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
