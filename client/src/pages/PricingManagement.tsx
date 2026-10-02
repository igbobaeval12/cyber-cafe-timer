import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Plus, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface PricingForm {
  name: string;
  hourlyRate: string;
  minimumCharge: string;
  discountPercentage: string;
}

export default function PricingManagement() {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<PricingForm>({
    name: '',
    hourlyRate: '',
    minimumCharge: '',
    discountPercentage: '',
  });

  const pricingQuery = trpc.pricing.getAll.useQuery();
  const createPricingMutation = trpc.pricing.create.useMutation({
    onSuccess: async () => {
      await utils.pricing.getAll.invalidate();
      resetForm();
    },
  });
  const updatePricingMutation = trpc.pricing.update.useMutation({
    onSuccess: async () => {
      await utils.pricing.getAll.invalidate();
      resetForm();
    },
  });
  const deletePricingMutation = trpc.pricing.delete.useMutation({
    onSuccess: async () => {
      await utils.pricing.getAll.invalidate();
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      hourlyRate: '',
      minimumCharge: '',
      discountPercentage: '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name.trim(),
      hourlyRate: formData.hourlyRate,
      minimumCharge: formData.minimumCharge || '0',
      discountPercentage: formData.discountPercentage || '0',
    };

    if (!payload.name || !payload.hourlyRate) return;

    if (editingId) {
      updatePricingMutation.mutate({ id: editingId, ...payload });
      return;
    }

    createPricingMutation.mutate(payload);
  };

  const startEdit = (plan: { id: number; name: string; hourlyRate: string | number; minimumCharge: string | number; discountPercentage: string | number }) => {
    setEditingId(plan.id);
    setFormData({
      name: plan.name,
      hourlyRate: plan.hourlyRate.toString(),
      minimumCharge: plan.minimumCharge.toString(),
      discountPercentage: plan.discountPercentage.toString(),
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pricing Configuration</h2>
          <p className="text-slate-600 mt-1">Manage hourly rates and pricing tiers</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Pricing Plan
        </Button>
      </div>

      {showForm && (
        <Card className="border-0 shadow-lg bg-slate-50">
          <CardHeader>
            <CardTitle>{editingId ? 'Update Pricing Plan' : 'Create New Pricing Plan'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Standard, Premium"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate (₦)</Label>
                  <Input
                    id="hourlyRate"
                    name="hourlyRate"
                    type="number"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="minimumCharge">Minimum Charge (₦)</Label>
                  <Input
                    id="minimumCharge"
                    name="minimumCharge"
                    type="number"
                    step="0.01"
                    value={formData.minimumCharge}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="discountPercentage">Discount (%)</Label>
                <Input
                  id="discountPercentage"
                  name="discountPercentage"
                  type="number"
                  step="0.01"
                  value={formData.discountPercentage}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">{editingId ? 'Save Changes' : 'Save Plan'}</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {pricingQuery.isLoading ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-8 pb-8">
              <div className="text-center text-slate-600">Loading pricing plans...</div>
            </CardContent>
          </Card>
        ) : pricingQuery.data && pricingQuery.data.length > 0 ? (
          pricingQuery.data.map(plan => (
            <Card key={plan.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-5 h-5 text-amber-600" />
                      <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                      {plan.isActive && (
                        <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="bg-slate-50 rounded p-3">
                        <p className="text-xs text-slate-600">Hourly Rate</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">
                          {formatCurrency(plan.hourlyRate)}
                        </p>
                      </div>

                      <div className="bg-slate-50 rounded p-3">
                        <p className="text-xs text-slate-600">Minimum Charge</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">
                          {formatCurrency(plan.minimumCharge)}
                        </p>
                      </div>

                      <div className="bg-slate-50 rounded p-3">
                        <p className="text-xs text-slate-600">Discount</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">
                          {parseFloat(plan.discountPercentage.toString()).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(plan)}
                      className="gap-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 gap-1"
                      onClick={() => deletePricingMutation.mutate({ id: plan.id })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-8 pb-8">
              <div className="text-center text-slate-600">No pricing plans configured yet.</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
