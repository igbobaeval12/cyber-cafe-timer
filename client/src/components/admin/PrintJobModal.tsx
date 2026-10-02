import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/currency";

interface PrintJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: any | null;
  customers: any[];
  computers: any[];
  services: any[];
  onSubmit: (payload: any) => void;
}

const paperSizes = ["A4", "A3", "Letter", "Legal"];
const printTypes = ["single_sided", "double_sided"];
const colorOptions = ["black_white", "color"];

export function PrintJobModal({ open, onOpenChange, initialValues, customers, computers, services, onSubmit }: PrintJobModalProps) {
  const [customerId, setCustomerId] = useState(initialValues?.customerId ?? "");
  const [computerId, setComputerId] = useState(initialValues?.computerId ?? "");
  const [serviceName, setServiceName] = useState(initialValues?.serviceName ?? services[0]?.name ?? "Black & White Printing");
  const [jobName, setJobName] = useState(initialValues?.jobName ?? "");
  const [paperSize, setPaperSize] = useState(initialValues?.paperSize ?? "A4");
  const [printType, setPrintType] = useState(initialValues?.printType ?? "single_sided");
  const [colorOption, setColorOption] = useState(initialValues?.colorOption ?? "black_white");
  const [pageCount, setPageCount] = useState(initialValues?.pageCount ?? 1);
  const [quantity, setQuantity] = useState(initialValues?.quantity ?? 1);
  const [unitPrice, setUnitPrice] = useState(initialValues?.unitPrice ?? services[0]?.unitPrice ?? 1.5);
  const [notes, setNotes] = useState(initialValues?.notes ?? "");

  useEffect(() => {
    setCustomerId(initialValues?.customerId ?? "");
    setComputerId(initialValues?.computerId ?? "");
    setServiceName(initialValues?.serviceName ?? services[0]?.name ?? "Black & White Printing");
    setJobName(initialValues?.jobName ?? "");
    setPaperSize(initialValues?.paperSize ?? "A4");
    setPrintType(initialValues?.printType ?? "single_sided");
    setColorOption(initialValues?.colorOption ?? "black_white");
    setPageCount(initialValues?.pageCount ?? 1);
    setQuantity(initialValues?.quantity ?? 1);
    setUnitPrice(initialValues?.unitPrice ?? services[0]?.unitPrice ?? 1.5);
    setNotes(initialValues?.notes ?? "");
  }, [initialValues, open, services]);

  const total = useMemo(() => Number((pageCount * quantity * Number(unitPrice || 0)).toFixed(2)), [pageCount, quantity, unitPrice]);

  const handleSubmit = () => {
    onSubmit({
      customerId: customerId ? Number(customerId) : undefined,
      computerId: computerId ? Number(computerId) : undefined,
      serviceName,
      jobName,
      paperSize,
      printType,
      colorOption,
      pageCount: Number(pageCount || 0),
      quantity: Number(quantity || 1),
      unitPrice: Number(unitPrice || 0),
      notes,
      totalCost: total,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle>{initialValues ? "Edit Print Job" : "New Print Job"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Customer</Label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
              <option value="">Walk-in / Guest</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name ?? `Customer #${customer.id}`}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>PC</Label>
            <select value={computerId} onChange={(e) => setComputerId(e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
              <option value="">Select a PC</option>
              {computers.map((computer) => <option key={computer.id} value={computer.id}>{computer.pcName}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Service</Label>
            <select value={serviceName} onChange={(e) => { setServiceName(e.target.value); const chosen = services.find((item) => item.name === e.target.value); if (chosen) setUnitPrice(Number(chosen.unitPrice ?? 0)); }} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
              {services.map((service) => <option key={service.id} value={service.name}>{service.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Job Name</Label>
            <Input value={jobName} onChange={(e) => setJobName(e.target.value)} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label>Paper Size</Label>
            <select value={paperSize} onChange={(e) => setPaperSize(e.target.value as any)} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
              {paperSizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Print Type</Label>
            <select value={printType} onChange={(e) => setPrintType(e.target.value as any)} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
              {printTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Color Option</Label>
            <select value={colorOption} onChange={(e) => setColorOption(e.target.value as any)} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
              {colorOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Pages</Label>
            <Input type="number" min="1" value={pageCount} onChange={(e) => setPageCount(Number(e.target.value))} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label>Unit Price</Label>
            <Input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Automatic Total</Label>
            <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-300">{formatCurrency(total)}</div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="border-slate-700 bg-slate-950" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
