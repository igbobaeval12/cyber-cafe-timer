import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = window.location.origin,
    autoConnect = true,
    reconnection = true,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Function[]>>(new Map());

  useEffect(() => {
    if (!autoConnect) return;

    socketRef.current = io(url, {
      reconnection,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('[WebSocket] Connected');
    });

    socketRef.current.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
    });

    socketRef.current.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [url, autoConnect, reconnection]);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`[WebSocket] Cannot emit '${event}': socket not connected`);
    }
  }, []);

  const on = useCallback((event: string, callback: Function) => {
    if (!socketRef.current) return;

    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, []);
    }
    listenersRef.current.get(event)?.push(callback);

    socketRef.current.on(event, callback as any);

    return () => {
      const listeners = listenersRef.current.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
      socketRef.current?.off(event, callback as any);
    };
  }, []);

  const off = useCallback((event: string, callback?: Function) => {
    if (!socketRef.current) return;

    if (callback) {
      socketRef.current.off(event, callback as any);
      const listeners = listenersRef.current.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    } else {
      socketRef.current.off(event);
      listenersRef.current.delete(event);
    }
  }, []);

  const isConnected = socketRef.current?.connected ?? false;

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    isConnected,
  };
}
