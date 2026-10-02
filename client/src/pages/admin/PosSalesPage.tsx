import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from '@/lib/currency';
import { useSettings } from '@/hooks/useSettings';
import { toast } from "sonner";

export default function PosSalesPage() {
  const settingsQuery = useSettings();
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Array<{ productId: number; quantity: number; name: string; price: number }>>([]);

  const productsQuery = trpc.inventory.getProducts.useQuery({ search: query, lowStockOnly: false });
  const salesHistoryQuery = trpc.inventory.getSalesHistory.useQuery({ limit: 10 });
  const createSaleMutation = trpc.inventory.createSale.useMutation({
    onSuccess: async () => {
      toast.success("Sale completed successfully");
      setCart([]);
      await utils.inventory.getProducts.invalidate();
      await utils.inventory.getSalesHistory.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const products = useMemo(() => (productsQuery.data ?? []) as any[], [productsQuery.data]);
  const salesHistory = useMemo(() => (salesHistoryQuery.data ?? []) as any[], [salesHistoryQuery.data]);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product.id, quantity: 1, name: product.name, price: Number(product.sellingPrice ?? 0) }];
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const changeQuantity = (productId: number, delta: number) => {
    setCart((prev) => prev.flatMap((item) => {
      if (item.productId !== productId) return [item];
      const quantity = item.quantity + delta;
      return quantity > 0 ? [{ ...item, quantity }] : [];
    }));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    createSaleMutation.mutate({
      paymentMethod: "cash",
      discountAmount: 0,
      items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    });
  };

  return (
    <AdminShell title="POS Sales" description="Process sales for stocked products using the same admin experience">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products to sell" className="border-slate-700 bg-slate-950" />
          <div className="grid gap-3 md:grid-cols-2">
            {products.map((product) => (
              <Card key={product.id} className="border-slate-800 bg-slate-900/80 text-slate-100">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span>{product.name}</span>
                    <Badge className="bg-slate-700 text-slate-200">{formatCurrency(Number(product.sellingPrice ?? 0), settingsQuery.data?.general?.currency)}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-300">
                  <p>Stock: {product.quantityInStock ?? 0}</p>
                  <Button size="sm" className="bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={() => addToCart(product)}>Add to Cart</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader><CardTitle>Cart</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              {cart.length === 0 ? <p>No items yet.</p> : cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/70 px-3 py-2">
                  <span className="min-w-0 flex-1">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => changeQuantity(item.productId, -1)}>-</Button>
                    <span>{item.quantity}</span>
                    <Button size="sm" variant="outline" onClick={() => changeQuantity(item.productId, 1)}>+</Button>
                    <span>{formatCurrency(item.price * item.quantity, settingsQuery.data?.general?.currency)}</span>
                    <Button size="sm" variant="outline" onClick={() => setCart((prev) => prev.filter((entry) => entry.productId !== item.productId))}>Remove</Button>
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-white">
                <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal, settingsQuery.data?.general?.currency)}</span></div>
              </div>
              <Button disabled={createSaleMutation.isPending || cart.length === 0} className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={handleCheckout}>{createSaleMutation.isPending ? "Processing..." : "Checkout"}</Button>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader><CardTitle>Recent Sales</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              {salesHistory.length === 0 ? <p>No recent sales.</p> : salesHistory.map((sale) => (
                <div key={sale.id} className="rounded-lg bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between">
                    <span>{sale.saleNumber}</span>
                    <span>{formatCurrency(Number(sale.totalAmount ?? 0), settingsQuery.data?.general?.currency)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
