import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from '@/lib/currency';
import { useSettings } from '@/hooks/useSettings';
import { Clock3, Pause, Play, Plus, Receipt, RotateCcw, TimerReset } from "lucide-react";

interface SessionRow {
  id: number;
  computerId: number;
  userId?: number | null;
  sessionStatus: string;
  startTime: string | Date;
  totalDurationMinutes: number;
  totalCost: string | number;
  computerName?: string | null;
}

export default function SessionsPage() {
  const settingsQuery = useSettings();
  const utils = trpc.useUtils();
  const [selectedComputer, setSelectedComputer] = useState<number | "">("");
  const [selectedCustomer, setSelectedCustomer] = useState<number | "">("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [message, setMessage] = useState<string | null>(null);

  const computersQuery = trpc.computers.getAll.useQuery();
  const customersQuery = trpc.customers.search.useQuery({ query: "", limit: 50 });
  const activeSessionsQuery = trpc.sessions.getActive.useQuery();
  const historyQuery = trpc.sessions.getHistory.useQuery({ limit: 20 });
  const startSessionMutation = trpc.sessions.start.useMutation({
    onSuccess: async () => {
      setMessage("Session started successfully");
      await utils.sessions.getActive.invalidate();
      await utils.sessions.getHistory.invalidate();
    },
    onError: (error) => setMessage(error.message),
  });
  const pauseSessionMutation = trpc.sessions.pause.useMutation({
    onSuccess: async () => {
      setMessage("Session paused");
      await utils.sessions.getActive.invalidate();
    },
    onError: (error) => setMessage(error.message),
  });
  const resumeSessionMutation = trpc.sessions.resume.useMutation({
    onSuccess: async () => {
      setMessage("Session resumed");
      await utils.sessions.getActive.invalidate();
    },
    onError: (error) => setMessage(error.message),
  });
  const endSessionMutation = trpc.sessions.end.useMutation({
    onSuccess: async () => {
      setMessage("Session ended");
      await utils.sessions.getActive.invalidate();
      await utils.sessions.getHistory.invalidate();
    },
    onError: (error) => setMessage(error.message),
  });
  const extendSessionMutation = trpc.sessions.extend.useMutation({
    onSuccess: async () => {
      setMessage("Session extended");
      await utils.sessions.getActive.invalidate();
    },
    onError: (error) => setMessage(error.message),
  });

  const activeSessions = useMemo<SessionRow[]>(() => (activeSessionsQuery.data ?? []) as SessionRow[], [activeSessionsQuery.data]);
  const history = useMemo<SessionRow[]>(() => (historyQuery.data ?? []) as SessionRow[], [historyQuery.data]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const handleStart = () => {
    if (!selectedComputer) {
      setMessage("Choose a PC first");
      return;
    }

    startSessionMutation.mutate({
      computerId: Number(selectedComputer),
      customerId: selectedCustomer ? Number(selectedCustomer) : undefined,
      durationMinutes,
      paymentMode: "postpaid",
    });
  };

  return (
    <AdminShell title="Session Engine" description="Run, pause, resume, and review live sessions">
      <div className="space-y-6">
        <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-cyan-400" /> Start a new session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <label className="space-y-2 text-sm">
                <span className="text-slate-400">PC</span>
                <select
                  value={selectedComputer}
                  onChange={(event) => setSelectedComputer(event.target.value === "" ? "" : Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">Select a PC</option>
                  {(computersQuery.data ?? []).map((computer: any) => (
                    <option key={computer.id} value={computer.id}>{computer.pcName}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-400">Customer</span>
                <select
                  value={selectedCustomer}
                  onChange={(event) => setSelectedCustomer(event.target.value === "" ? "" : Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">Walk-in / Guest</option>
                  {(customersQuery.data ?? []).map((customer: any) => (
                    <option key={customer.id} value={customer.id}>{customer.name ?? `Customer #${customer.id}`}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-400">Duration (minutes)</span>
                <input
                  type="number"
                  min="15"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </label>
              <div className="flex items-end">
                <Button onClick={handleStart} className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                  Start Session
                </Button>
              </div>
            </div>
            {message ? <p className="text-sm text-cyan-300">{message}</p> : null}
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-cyan-400" /> Active sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeSessions.length === 0 ? (
                <p className="text-sm text-slate-400">No active sessions right now.</p>
              ) : (
                activeSessions.map((session) => (
                  <div key={session.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{session.computerName ?? `PC #${session.computerId}`}</p>
                        <p className="text-sm text-slate-400">Started {new Date(session.startTime).toLocaleString()}</p>
                      </div>
                      <Badge className="bg-emerald-500/15 text-emerald-300">{session.sessionStatus}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                      <span className="rounded-full bg-slate-800 px-2.5 py-1">{session.totalDurationMinutes} min</span>
                      <span className="rounded-full bg-slate-800 px-2.5 py-1">{formatCurrency(Number(session.totalCost || 0), settingsQuery.data?.general?.currency)}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => pauseSessionMutation.mutate({ sessionId: session.id })}>
                        <Pause className="mr-2 h-4 w-4" /> Pause
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resumeSessionMutation.mutate({ sessionId: session.id })}>
                        <Play className="mr-2 h-4 w-4" /> Resume
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => extendSessionMutation.mutate({ sessionId: session.id, additionalMinutes: 30 })}>
                        <TimerReset className="mr-2 h-4 w-4" /> +30m
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => endSessionMutation.mutate({ sessionId: session.id })}>
                        <RotateCcw className="mr-2 h-4 w-4" /> End
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 text-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-cyan-400" /> Recent history
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-slate-400">No session history available yet.</p>
              ) : (
                history.map((session) => (
                  <div key={session.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{session.computerName ?? `PC #${session.computerId}`}</p>
                        <p className="text-sm text-slate-400">{new Date(session.startTime).toLocaleString()}</p>
                      </div>
                      <Badge className="bg-slate-700 text-slate-200">{session.sessionStatus}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">Duration: {session.totalDurationMinutes} min • Total: {formatCurrency(Number(session.totalCost || 0), settingsQuery.data?.general?.currency)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
