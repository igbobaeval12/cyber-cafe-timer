import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import { Users, Plus, Edit2, Trash2, CreditCard } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string;
  membershipTier: 'none' | 'basic' | 'premium' | 'vip';
  prepaidBalance: number;
  totalSpent: number;
  sessionsCount: number;
  joinDate: Date;
}

export default function UserManagement() {
  const [showForm, setShowForm] = useState(false);
  const [users] = useState<User[]>([
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phoneNumber: '555-0101',
      membershipTier: 'premium',
      prepaidBalance: 25.00,
      totalSpent: 150.00,
      sessionsCount: 45,
      joinDate: new Date('2026-01-15'),
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      phoneNumber: '555-0102',
      membershipTier: 'basic',
      prepaidBalance: 10.00,
      totalSpent: 75.00,
      sessionsCount: 22,
      joinDate: new Date('2026-02-20'),
    },
  ]);

  const membershipColor = (tier: string) => {
    switch (tier) {
      case 'vip':
        return 'bg-purple-100 text-purple-800';
      case 'premium':
        return 'bg-blue-100 text-blue-800';
      case 'basic':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-slate-600 mt-1">Manage customer accounts and membership</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      {showForm && (
        <Card className="border-0 shadow-lg bg-slate-50">
          <CardHeader>
            <CardTitle>Create New User Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" className="mt-1" />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="555-0000" className="mt-1" />
                </div>

                <div>
                  <Label htmlFor="membership">Membership Tier</Label>
                  <select className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md text-sm">
                    <option value="none">None</option>
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="prepaid">Prepaid Balance (₦)</Label>
                <Input id="prepaid" type="number" step="0.01" placeholder="0.00" className="mt-1" />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">Create Account</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users Grid */}
      <div className="grid gap-4">
        {users.map(user => (
          <Card key={user.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{user.name}</h3>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                    <div className="bg-slate-50 rounded p-3">
                      <p className="text-xs text-slate-600">Membership</p>
                      <Badge className={`${membershipColor(user.membershipTier)} mt-1`}>
                        {user.membershipTier}
                      </Badge>
                    </div>

                    <div className="bg-slate-50 rounded p-3">
                      <p className="text-xs text-slate-600">Prepaid Balance</p>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {formatCurrency(user.prepaidBalance)}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded p-3">
                      <p className="text-xs text-slate-600">Total Spent</p>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {formatCurrency(user.totalSpent)}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded p-3">
                      <p className="text-xs text-slate-600">Sessions</p>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {user.sessionsCount}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded p-3">
                      <p className="text-xs text-slate-600">Member Since</p>
                      <p className="text-xs font-semibold text-slate-900 mt-1">
                        {formatDate(user.joinDate)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                  >
                    <CreditCard className="w-4 h-4" />
                    Add Balance
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
