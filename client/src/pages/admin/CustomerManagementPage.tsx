import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AdminShell } from "@/components/admin/AdminShell";
import { CustomerModal } from "@/components/admin/CustomerModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CustomerManagementPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);

  const customersQuery = trpc.customers.search.useQuery({ query, limit: 50 });
  const createCustomerMutation = trpc.customers.create.useMutation({
    onSuccess: async () => {
      setCustomerError(null);
      toast.success("Customer created successfully");
      setModalOpen(false);
      setEditingCustomer(null);
      await utils.customers.search.invalidate();
    },
    onError: (error) => {
      setCustomerError(error.message);
      toast.error(error.message);
    },
  });
  const updateCustomerMutation = trpc.customers.update.useMutation({
    onSuccess: async () => {
      setCustomerError(null);
      toast.success("Customer updated successfully");
      setModalOpen(false);
      setEditingCustomer(null);
      await utils.customers.search.invalidate();
    },
    onError: (error) => {
      setCustomerError(error.message);
      toast.error(error.message);
    },
  });
  const deleteCustomerMutation = trpc.customers.delete.useMutation({
    onSuccess: async () => {
      await utils.customers.search.invalidate();
    },
  });

  const customers = useMemo(() => (customersQuery.data ?? []) as any[], [customersQuery.data]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setCustomerError(null);
    setModalOpen(true);
  };

  const openEditModal = (customer: any) => {
    setEditingCustomer(customer);
    setCustomerError(null);
    setModalOpen(true);
  };

  const handleSubmit = (payload: any) => {
    setCustomerError(null);
    if (editingCustomer?.id) {
      updateCustomerMutation.mutate({ customerId: editingCustomer.id, ...payload });
      return;
    }
    createCustomerMutation.mutate(payload);
  };

  return (
    <AdminShell title="Customer Management" description="Manage customer profiles, memberships, and visit history">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer name, phone, or email" className="border-slate-700 bg-slate-950" />
          </div>
          <Button className="bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={openCreateModal}>Add Customer</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer) => (
            <Card key={customer.id} className="border-slate-800 bg-slate-900/80 text-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{customer.name ?? `Customer #${customer.id}`}</span>
                  <Badge className="bg-slate-700 text-slate-200">{customer.membershipTier ?? "walk_in"}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <p>Phone: {customer.phoneNumber ?? "—"}</p>
                <p>Email: {customer.email ?? "—"}</p>
                <p>Status: {customer.customerStatus ?? "active"}</p>
                <p>Loyalty Points: {customer.loyaltyPoints ?? 0}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/admin/customers/${customer.id}`)}>Profile</Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/admin/customers/${customer.id}/history`)}>History</Button>
                  <Button size="sm" variant="outline" onClick={() => openEditModal(customer)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => deleteCustomerMutation.mutate({ customerId: customer.id })}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <CustomerModal open={modalOpen} onOpenChange={setModalOpen} errorMessage={customerError} initialValues={editingCustomer} onSubmit={handleSubmit} />
    </AdminShell>
  );
}
