import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

export default function SessionHistory() {
  const [dateFilter, setDateFilter] = useState('');
  const [pcFilter, setPCFilter] = useState('');
  const sessionsQuery = trpc.sessions.getHistory.useQuery({ limit: 100 });

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);

  const filteredSessions = useMemo(() => sessions.filter(session => {
    if (dateFilter && !new Date(session.startTime).toISOString().includes(dateFilter)) return false;
    if (pcFilter && !String(session.computerId).includes(pcFilter)) return false;
    return true;
  }), [dateFilter, pcFilter, sessions]);

  const totalRevenue = filteredSessions.reduce((sum, s) => sum + Number(s.totalCost || 0), 0);
  const totalSessions = filteredSessions.length;
  const totalMinutes = filteredSessions.reduce((sum, s) => sum + Number(s.totalDurationMinutes || 0), 0);

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const handleExport = () => {
    const rows = filteredSessions.map(session => [
      session.id,
      session.computerId,
      formatDate(session.startTime),
      session.totalDurationMinutes,
      session.totalCost,
      session.sessionStatus,
      session.paymentMode,
    ]);
    const csv = [
      ['id', 'computerId', 'startTime', 'durationMinutes', 'totalCost', 'status', 'paymentMode'],
      ...rows,
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'session-history.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Session History & Reports</h2>
        <p className="text-slate-600 mt-1">View and analyze all rental sessions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalSessions}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalMinutes}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {totalSessions > 0 ? (totalMinutes / totalSessions).toFixed(0) : 0} min
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg bg-slate-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-900">Date</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-900">PC ID</label>
              <Input
                placeholder="e.g., 1"
                value={pcFilter}
                onChange={(e) => setPCFilter(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDateFilter('');
                  setPCFilter('');
                }}
                className="flex-1"
              >
                Clear Filters
              </Button>
              <Button className="flex-1 gap-2" onClick={handleExport}>
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">PC</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">Start Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">Duration</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">Cost</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">Payment</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.length > 0 ? (
                  filteredSessions.map(session => (
                    <tr key={session.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">PC-{session.computerId}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(session.startTime)}</td>
                      <td className="py-3 px-4 text-slate-600">{session.totalDurationMinutes} min</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{formatCurrency(session.totalCost)}</td>
                      <td className="py-3 px-4">
                        <Badge className={statusColor(session.sessionStatus)}>
                          {session.sessionStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600 capitalize">{session.paymentMode}</td>
                      <td className="py-3 px-4">
                        <Button size="sm" variant="ghost" className="gap-1">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-600">
                      No sessions found matching the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
