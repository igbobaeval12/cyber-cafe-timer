import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductModal } from "@/components/admin/ProductModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

export default function InventoryDashboardPage() {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productError, setProductError] = useState<string | null>(null);

  const productsQuery = trpc.inventory.getProducts.useQuery({ search: query, lowStockOnly: false });
  const statsQuery = trpc.inventory.dashboardStats.useQuery();
  const createProductMutation = trpc.inventory.createProduct.useMutation({
    onSuccess: async () => {
      setProductError(null);
      toast.success("Product created successfully");
      setModalOpen(false);
      setEditingProduct(null);
      await utils.inventory.getProducts.invalidate();
      await utils.inventory.dashboardStats.invalidate();
    },
    onError: (error) => { setProductError(error.message); toast.error(error.message); },
  });
  const updateProductMutation = trpc.inventory.updateProduct.useMutation({
    onSuccess: async () => {
      setProductError(null);
      toast.success("Product updated successfully");
      setModalOpen(false);
      setEditingProduct(null);
      await utils.inventory.getProducts.invalidate();
      await utils.inventory.dashboardStats.invalidate();
    },
    onError: (error) => { setProductError(error.message); toast.error(error.message); },
  });
  const deleteProductMutation = trpc.inventory.deleteProduct.useMutation({
    onSuccess: async () => {
      await utils.inventory.getProducts.invalidate();
      await utils.inventory.dashboardStats.invalidate();
    },
  });

  const products = useMemo(() => (productsQuery.data ?? []) as any[], [productsQuery.data]);
  const stats = statsQuery.data;

  const openCreate = () => {
    setEditingProduct(null);
    setProductError(null);
    setModalOpen(true);
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setProductError(null);
    setModalOpen(true);
  };

  const handleSubmit = (payload: any) => {
    setProductError(null);
    if (editingProduct?.id) {
      updateProductMutation.mutate({ productId: editingProduct.id, ...payload });
      return;
    }
    createProductMutation.mutate(payload);
  };

  return (
    <AdminShell title="Inventory & POS" description="Track stock, manage products, and process point-of-sale sales">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader><CardTitle className="text-sm text-slate-400">Total Products</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold text-white">{stats?.totalProducts ?? 0}</p></CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader><CardTitle className="text-sm text-slate-400">Low Stock</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold text-white">{stats?.lowStock ?? 0}</p></CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader><CardTitle className="text-sm text-slate-400">Out of Stock</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold text-white">{stats?.outOfStock ?? 0}</p></CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader><CardTitle className="text-sm text-slate-400">Today Sales</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold text-white">{formatCurrency(stats?.todaySales)}</p></CardContent>
          </Card>
        </section>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products or SKU" className="border-slate-700 bg-slate-950" />
          </div>
          <Button className="bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={openCreate}>Add Product</Button>
        </div>

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="border-slate-800 bg-slate-900/80 text-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{product.name}</span>
                  <Badge className={product.status === "available" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}>{product.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <p>Code: {product.productCode ?? "—"}</p>
                <p>Category: {product.category ?? "general"}</p>
                <p>Selling Price: {formatCurrency(product.sellingPrice)}</p>
                <p>Stock: {product.quantityInStock ?? 0}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(product)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => deleteProductMutation.mutate({ productId: product.id })}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>

      <ProductModal open={modalOpen} onOpenChange={setModalOpen} initialValues={editingProduct} onSubmit={handleSubmit} errorMessage={productError} isSaving={createProductMutation.isPending || updateProductMutation.isPending} />
    </AdminShell>
  );
}
