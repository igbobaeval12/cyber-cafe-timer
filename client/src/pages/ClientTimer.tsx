import { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/_core/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, DollarSign, Zap } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

interface TimerState {
  sessionId?: number;
  remainingTime: number;
  totalDurationMinutes: number;
  totalCost: number;
  isActive: boolean;
  isPaused: boolean;
}

export default function ClientTimer() {
  const { logout, loading } = useAuth();
  const [, navigate] = useLocation();
  const { emit, on, isConnected } = useWebSocket();
  const activeSessionQuery = trpc.sessions.getActiveForUser.useQuery(undefined, {
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
  });
  const [timerState, setTimerState] = useState<TimerState>({
    remainingTime: 0,
    totalDurationMinutes: 0,
    totalCost: 0,
    isActive: false,
    isPaused: false,
  });
  const [showWarning, setShowWarning] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [pcName, setPCName] = useState('');
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const session = activeSessionQuery.data;
    if (!session || !session.endTime) {
      setTimerState({ remainingTime: 0, totalDurationMinutes: 0, totalCost: 0, isActive: false, isPaused: false });
      setShowWarning(false);
      return;
    }

    const remainingTime = Math.max(0, Math.ceil((new Date(session.endTime).getTime() - Date.now()) / 1000));
    setTimerState((previous) => ({
      ...previous,
      sessionId: session.id,
      remainingTime,
      totalDurationMinutes: session.totalDurationMinutes,
      totalCost: Number(session.totalCost ?? 0),
      isActive: remainingTime > 0,
      isPaused: session.sessionStatus === 'paused',
    }));
  }, [activeSessionQuery.data]);

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await logout();
      navigate('/');
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Logout failed');
    }
  };

  // Get PC name from environment or local storage
  useEffect(() => {
    const storedPCName = localStorage.getItem('pcName') || 'PC-' + Math.random().toString(36).substr(2, 9);
    setPCName(storedPCName);
    localStorage.setItem('pcName', storedPCName);
  }, []);

  // Register PC with server
  useEffect(() => {
    if (!isConnected || !pcName) return;

    emit('pc:register', {
      pcName,
      ipAddress: window.location.hostname,
      macAddress: 'unknown', // Would be retrieved from system in real implementation
    });
  }, [isConnected, pcName, emit]);

  // Listen for timer control events
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeTimerControl = on('timer:control', (data: any) => {
      switch (data.action) {
        case 'start':
          setTimerState(prev => ({
            ...prev,
            sessionId: data.sessionId,
            totalDurationMinutes: data.remainingMinutes ?? 0,
            remainingTime: (data.remainingMinutes ?? 0) * 60,
            isActive: true,
            isPaused: false,
          }));
          break;
        case 'pause':
          setTimerState(prev => ({ ...prev, isPaused: true }));
          break;
        case 'resume':
          setTimerState(prev => ({ ...prev, isPaused: false }));
          break;
        case 'stop':
          setTimerState({
            remainingTime: 0,
            totalDurationMinutes: 0,
            totalCost: 0,
            isActive: false,
            isPaused: false,
          });
          setShowWarning(false);
          break;
      }
    });

    const unsubscribeForceLogout = on('session:force-logout', () => {
      setTimerState({
        remainingTime: 0,
        totalDurationMinutes: 0,
        totalCost: 0,
        isActive: false,
        isPaused: false,
      });
      setShowWarning(false);
      void logout();
      navigate('/');
    });

    const unsubscribePcControl = on('pc:control', (data: any) => {
      if (data?.action === 'lock') {
        window.location.reload();
      }
    });

    return () => {
      unsubscribeTimerControl?.();
      unsubscribeForceLogout?.();
      unsubscribePcControl?.();
    };
  }, [isConnected, on, logout, navigate]);

  // Timer countdown logic
  useEffect(() => {
    if (!timerState.isActive || timerState.isPaused) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimerState(prev => {
        const newRemaining = Math.max(0, prev.remainingTime - 1);

        // Check for 5-minute warning
        if (newRemaining === 300 && !showWarning) {
          setShowWarning(true);
        }

        // Session expired
        if (newRemaining === 0) {
          void activeSessionQuery.refetch();
        }

        return {
          ...prev,
          remainingTime: newRemaining,
        };
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerState.isActive, timerState.isPaused, timerState.sessionId, showWarning, emit]);

  useEffect(() => () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!timerState.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardContent className="pt-12 pb-12 text-center">
            <Clock className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Waiting for Session</h2>
            <p className="text-slate-400">No active session. Please contact the administrator.</p>
            {activeSessionQuery.isError && <p className="mt-3 text-sm text-red-400">{activeSessionQuery.error.message}</p>}
            {logoutError && <p className="mt-3 text-sm text-red-400" role="alert">{logoutError}</p>}
            <p className="text-xs text-slate-500 mt-4">PC: {pcName}</p>
            <Button onClick={handleLogout} variant="outline" className="mt-6">Logout</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-end">
          <Button onClick={handleLogout} variant="outline" disabled={loading}>
            Logout
          </Button>
        </div>

        {logoutError && <p className="text-center text-sm text-red-400" role="alert">{logoutError}</p>}

        {/* Main Timer Display */}
        <Card className="bg-slate-800 border-slate-700 shadow-2xl">
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-8">
              {/* Remaining Time */}
              <div>
                <p className="text-slate-400 text-sm mb-2">REMAINING TIME</p>
                <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-mono">
                  {formatTime(timerState.remainingTime)}
                </div>
              </div>

              {/* Cost Display */}
              <div className="flex items-center justify-center gap-3 bg-slate-700 rounded-lg p-4">
                <DollarSign className="w-5 h-5 text-amber-400" />
                <div className="text-left">
                  <p className="text-slate-400 text-xs">TOTAL COST</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(timerState.totalCost)}</p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-center gap-2">
                <div className={`w-3 h-3 rounded-full ${timerState.isPaused ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></div>
                <span className="text-slate-300 font-medium">
                  {timerState.isPaused ? 'PAUSED' : 'ACTIVE'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning Alert */}
        {showWarning && timerState.remainingTime <= 300 && (
          <Card className="bg-amber-900 border-amber-700 shadow-lg">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-300 flex-shrink-0" />
              <div>
                <p className="text-amber-100 font-semibold text-sm">Time Running Out!</p>
                <p className="text-amber-200 text-xs">Less than 5 minutes remaining</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session Expired */}
        {timerState.remainingTime === 0 && timerState.isActive && (
          <Card className="bg-red-900 border-red-700 shadow-lg">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Zap className="w-5 h-5 text-red-300 flex-shrink-0" />
              <div>
                <p className="text-red-100 font-semibold text-sm">Session Expired</p>
                <p className="text-red-200 text-xs">Your session time has ended</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PC Info */}
        <div className="text-center text-slate-400 text-xs">
          <p>PC: {pcName}</p>
          <p>Session ID: {timerState.sessionId || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}
