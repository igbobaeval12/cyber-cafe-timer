import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: any | null;
  onSubmit: (payload: any) => void;
  isSaving?: boolean;
  errorMessage?: string | null;
}

export function ProductModal({ open, onOpenChange, initialValues, onSubmit, isSaving = false, errorMessage }: ProductModalProps) {
  const [form, setForm] = useState({
    productCode: "",
    name: "",
    category: "general",
    barcode: "",
    description: "",
    costPrice: "0",
    sellingPrice: "0",
    quantityInStock: "0",
    minimumStockLevel: "0",
    supplierId: "",
  });

  useEffect(() => {
    if (initialValues) {
      setForm({
        productCode: initialValues.productCode ?? "",
        name: initialValues.name ?? "",
        category: initialValues.category ?? "general",
        barcode: initialValues.barcode ?? "",
        description: initialValues.description ?? "",
        costPrice: String(initialValues.costPrice ?? 0),
        sellingPrice: String(initialValues.sellingPrice ?? 0),
        quantityInStock: String(initialValues.quantityInStock ?? 0),
        minimumStockLevel: String(initialValues.minimumStockLevel ?? 0),
        supplierId: String(initialValues.supplierId ?? ""),
      });
    } else {
      setForm({
        productCode: "",
        name: "",
        category: "general",
        barcode: "",
        description: "",
        costPrice: "0",
        sellingPrice: "0",
        quantityInStock: "0",
        minimumStockLevel: "0",
        supplierId: "",
      });
    }
  }, [initialValues, open]);

  const submit = () => {
    if (!form.name.trim() || isSaving) return;
    onSubmit({
      productCode: form.productCode || undefined,
      name: form.name,
      category: form.category,
      barcode: form.barcode || undefined,
      description: form.description || undefined,
      costPrice: Number(form.costPrice || 0),
      sellingPrice: Number(form.sellingPrice || 0),
      quantityInStock: Number(form.quantityInStock || 0),
      minimumStockLevel: Number(form.minimumStockLevel || 0),
      supplierId: form.supplierId ? Number(form.supplierId) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle>{initialValues ? "Edit Product" : "Create Product"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Product Name</Label>
            <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label>Product Code</Label>
            <Input value={form.productCode} onChange={(e) => setForm((prev) => ({ ...prev, productCode: e.target.value }))} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label>Barcode</Label>
            <Input value={form.barcode} onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label>Cost Price</Label>
            <Input type="number" value={form.costPrice} onChange={(e) => setForm((prev) => ({ ...prev, costPrice: e.target.value }))} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label>Selling Price</Label>
            <Input type="number" value={form.sellingPrice} onChange={(e) => setForm((prev) => ({ ...prev, sellingPrice: e.target.value }))} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label>Quantity In Stock</Label>
            <Input type="number" value={form.quantityInStock} onChange={(e) => setForm((prev) => ({ ...prev, quantityInStock: e.target.value }))} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label>Minimum Stock Level</Label>
            <Input type="number" value={form.minimumStockLevel} onChange={(e) => setForm((prev) => ({ ...prev, minimumStockLevel: e.target.value }))} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="border-slate-700 bg-slate-950" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {errorMessage ? <p className="mr-auto text-sm text-red-400">{errorMessage}</p> : null}
          <Button disabled={isSaving || !form.name.trim()} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={submit}>{isSaving ? "Saving..." : "Save Product"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
