import { useEffect, useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { trpc } from '@/lib/trpc';
import { formatCurrency } from '@/lib/currency';
import { useSettings } from '@/hooks/useSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Clock, DollarSign, Monitor, LogOut } from 'lucide-react';

interface PCStatus {
  pcName: string;
  ipAddress: string;
  status: 'online' | 'offline' | 'maintenance';
  sessionId?: number;
  remainingTime?: number;
  cost?: number;
}

export default function AdminDashboard() {
  const settingsQuery = useSettings();
  const { user, loading } = useAuth();
  const { emit, on, isConnected } = useWebSocket();
  const [pcList, setPCList] = useState<PCStatus[]>([]);
  const [dailyEarnings, setDailyEarnings] = useState(0);
  const [activeSessions, setActiveSessions] = useState(0);

  const computersQuery = trpc.computers.getAll.useQuery();
  const pricingQuery = trpc.pricing.getActive.useQuery();

  useEffect(() => {
    if (!isConnected) return;

    // Register as admin
    emit('admin:connect', { userId: user?.id });

    // Listen for PC status updates
    const unsubscribe = on('pc:status-updated', (data: any) => {
      setPCList(prev => {
        const existing = prev.find(pc => pc.pcName === data.pcName);
        if (existing) {
          return prev.map(pc =>
            pc.pcName === data.pcName ? { ...pc, status: data.status } : pc
          );
        }
        return [...prev, { pcName: data.pcName, status: data.status, ipAddress: '' }];
      });
    });

    // Listen for PC list updates
    const unsubscribePCList = on('pc:list-update', (data: any) => {
      setPCList(data);
    });

    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribePCList) unsubscribePCList();
    };
  }, [isConnected, emit, on, user?.id]);

  useEffect(() => {
    if (computersQuery.data) {
      setPCList(computersQuery.data.map(pc => ({
        pcName: pc.pcName,
        ipAddress: pc.ipAddress ?? "",
        status: pc.status as 'online' | 'offline' | 'maintenance',
      })));
    }
  }, [computersQuery.data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !['admin', 'super_admin', 'manager', 'cashier', 'staff'].includes(user.role ?? '')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">You don't have permission to access the admin dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onlineCount = pcList.filter(pc => pc.status === 'online').length;
  const statusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Cyber Café Management</h1>
          <p className="text-slate-600">Real-time PC monitoring and session management</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Online PCs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{onlineCount}</div>
              <p className="text-xs text-slate-500 mt-1">of {pcList.length} total</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{activeSessions}</div>
              <p className="text-xs text-slate-500 mt-1">Currently running</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Today's Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{formatCurrency(dailyEarnings, settingsQuery.data?.general?.currency)}</div>
              <p className="text-xs text-slate-500 mt-1">Total revenue</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-slate-900">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="pcs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-slate-200 p-1">
            <TabsTrigger value="pcs">PC Monitoring</TabsTrigger>
            <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* PC Monitoring Tab */}
          <TabsContent value="pcs" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Connected Computers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pcList.map(pc => (
                    <Card key={pc.pcName} className="border border-slate-200 hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-slate-900">{pc.pcName}</h3>
                              <p className="text-xs text-slate-500 mt-1">{pc.ipAddress}</p>
                            </div>
                            <Badge className={statusColor(pc.status)}>
                              {pc.status}
                            </Badge>
                          </div>

                          {pc.sessionId && (
                            <div className="bg-slate-50 rounded p-3 space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-600">Session ID:</span>
                                <span className="font-medium text-slate-900">#{pc.sessionId}</span>
                              </div>
                              {pc.remainingTime && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-600">Remaining:</span>
                                  <span className="font-medium text-slate-900">{pc.remainingTime} min</span>
                                </div>
                              )}
                              {pc.cost && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-600">Cost:</span>
                                  <span className="font-medium text-slate-900">{formatCurrency(Number(pc.cost ?? 0), settingsQuery.data?.general?.currency)}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button size="sm" variant="outline" className="flex-1 text-xs">
                              Pause
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 text-xs">
                              Stop
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Sessions Tab */}
          <TabsContent value="sessions">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">No active sessions at the moment.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-900">Hourly Rate</label>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-2xl font-bold text-slate-900">
                        ₦{pricingQuery.data?.hourlyRate || '0.00'}
                      </span>
                      <span className="text-slate-600">/hour</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
