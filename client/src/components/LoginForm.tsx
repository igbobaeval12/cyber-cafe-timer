import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { Lock, AlertCircle } from 'lucide-react';

export function LoginForm() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [workstationId, setWorkstationId] = useState(() => localStorage.getItem('pcName') || 'PC-01');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'admin' | 'customer' | 'staff'>('admin');

  const adminLoginMutation = trpc.auth.login.useMutation();
  const customerLoginMutation = trpc.auth.customerLogin.useMutation();
  const staffLoginMutation = trpc.staffs.login.useMutation();
  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = mode === 'admin'
        ? await adminLoginMutation.mutateAsync({ username, password })
        : mode === 'customer'
          ? await customerLoginMutation.mutateAsync({ username, password, workstationId })
          : await staffLoginMutation.mutateAsync({ username, password });

      if (result.success && ('user' in result || 'staff' in result)) {
        await utils.auth.me.invalidate();
        if ('staff' in result) {
          navigate('/admin');
        } else if (result.user.role === 'admin' || result.user.role === 'super_admin') {
          navigate('/admin');
        } else {
          navigate('/client');
        }
        return;
      }

      setError('Login failed. Please try again.');
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-slate-800 border-slate-700">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-cyan-500/20 mx-auto">
          <Lock className="w-6 h-6 text-cyan-400" />
        </div>
        <CardTitle className="text-center text-white text-2xl">{mode === 'admin' ? 'Admin Login' : mode === 'staff' ? 'Staff Login' : 'Customer Login'}</CardTitle>
        <CardDescription className="text-center text-slate-400">
          Enter your credentials to access the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="bg-red-500/10 border-red-500/50">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-500 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex rounded-md border border-slate-700 bg-slate-700 p-1 mb-4">
          <button type="button" onClick={() => setMode('admin')} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${mode === 'admin' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300'}`}>
            Admin
          </button>
          <button type="button" onClick={() => setMode('customer')} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${mode === 'customer' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300'}`}>
            Customer
          </button>
          <button type="button" onClick={() => setMode('staff')} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${mode === 'staff' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300'}`}>
            Staff
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'customer' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Workstation</label>
              <Input
                type="text"
                placeholder="PC-01"
                value={workstationId}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setWorkstationId(nextValue);
                  localStorage.setItem('pcName', nextValue);
                }}
                disabled={isLoading}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Username</label>
            <Input
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
