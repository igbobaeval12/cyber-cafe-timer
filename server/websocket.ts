import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import * as db from './db';
import { sdk } from './_core/sdk';
import { logSecurityEvent } from './_core/security';
import { logger } from './_core/logger';
import { hasAdminAccess } from './_core/authorization';

interface PCClient {
  id: string;
  pcName: string;
  ipAddress: string;
  sessionId?: number;
  connectedAt: Date;
}

interface AdminClient {
  id: string;
  userId: number;
  connectedAt: Date;
}

let io: SocketIOServer | null = null;
const pcClients = new Map<string, PCClient>();
const adminClients = new Map<string, AdminClient>();
type SocketListenerHandler = (...args: any[]) => void;
const socketListenerRegistry = new WeakMap<Socket, Map<string, Set<SocketListenerHandler>>>();

export function hasAdminRole(socket: Socket) {
  return hasAdminAccess(socket.data?.user?.role);
}

export function sendNotificationToUser(userId: number, event: unknown) {
  io?.to(`user:${userId}`).emit('notification', event);
}

export async function authenticateSocketConnection(socket: Socket) {
  const token = socket.handshake.auth?.token ?? socket.handshake.auth?.jwt ?? undefined;
  const requestId = socket.handshake?.headers?.['x-request-id']?.toString();
  try {
    const user = await sdk.authenticateSocketRequest(socket.request as any, token);

    if (!user) {
      await logSecurityEvent(undefined, 'invalid_token', 'Socket authentication failed', socket.handshake.address);
      logger.warn('websocket_auth_failed', { requestId, socketId: socket.id, reason: 'invalid_token' });
      socket.emit('auth:error', { success: false, error: 'Authentication failed' });
      socket.disconnect(true);
      return { allowed: false, error: 'Authentication failed' };
    }

    socket.data.user = user;
    socket.join(`user:${user.id}`);
    logger.info('websocket_client_authenticated', { requestId, socketId: socket.id, role: user?.role ?? 'unknown' });
    return { allowed: true, user };
  } catch (error) {
    logger.error('websocket_auth_failed', { requestId, socketId: socket.id, err: error });
    socket.emit('auth:error', { success: false, error: 'Authentication failed' });
    socket.disconnect(true);
    return { allowed: false, error: 'Authentication failed' };
  }
}

export async function handleUnauthorized(socket: Socket, eventName: string) {
  const userId = socket.data?.user?.id as number | undefined;
  const requestId = socket.handshake?.headers?.['x-request-id']?.toString();
  await logSecurityEvent(userId, 'unauthorized_admin_access', `Unauthorized WebSocket event: ${eventName}`, socket.handshake.address);
  logger.warn('websocket_unauthorized_event', { requestId, socketId: socket.id, eventName, userId });
  socket.emit('auth:error', { success: false, error: 'Unauthorized' });
}

export function authorizeSocketEvent(socket: Socket, eventName: string) {
  if (eventName === 'pc:register' || eventName === 'pc:heartbeat') {
    return Boolean(socket.data?.user);
  }

  if (eventName === 'admin:connect' || eventName === 'admin:timer-control' || eventName === 'admin:pc-control' || eventName === 'admin:force-logout' || eventName === 'admin:notify-client' || eventName === 'session:start' || eventName === 'session:update' || eventName === 'session:pause' || eventName === 'session:resume' || eventName === 'session:stop') {
    return hasAdminRole(socket);
  }

  return Boolean(socket.data?.user);
}

export function registerSocketListener(socket: Socket, eventName: string, handler: SocketListenerHandler) {
  const registry = socketListenerRegistry.get(socket) ?? new Map<string, Set<SocketListenerHandler>>();
  const handlers = registry.get(eventName) ?? new Set<SocketListenerHandler>();

  if (handlers.has(handler)) {
    return;
  }

  socket.off(eventName, handler);
  socket.on(eventName, handler);
  handlers.add(handler);
  registry.set(eventName, handlers);
  socketListenerRegistry.set(socket, registry);
}

export function cleanupSocketListeners(socket: Socket) {
  const registry = socketListenerRegistry.get(socket);
  if (!registry) {
    return;
  }

  for (const [eventName, handlers] of Array.from(registry.entries())) {
    for (const handler of handlers) {
      socket.off(eventName, handler);
    }
  }

  socketListenerRegistry.delete(socket);
}

export function cleanupSocketRoomSubscriptions(socket: Socket) {
  for (const room of Array.from(socket.rooms)) {
    if (room !== socket.id) {
      void socket.leave(room);
    }
  }
}

export function initializeWebSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info('websocket_client_connected', { socketId: socket.id, remoteAddress: socket.handshake.address });

    void authenticateSocketConnection(socket).then((result) => {
      if (!result.allowed) {
        return;
      }
    });

    // PC Client registration
    registerSocketListener(socket, 'pc:register', async (data: { pcName: string; ipAddress: string; macAddress: string }) => {
      if (!authorizeSocketEvent(socket, 'pc:register')) {
        await handleUnauthorized(socket, 'pc:register');
        return;
      }
      try {
        const existingComputer = await db.getComputerByName(data.pcName);
        
        if (!existingComputer) {
          logger.info('websocket_pc_registering', { pcName: data.pcName, socketId: socket.id });
        }

        pcClients.set(socket.id, {
          id: socket.id,
          pcName: data.pcName,
          ipAddress: data.ipAddress,
          connectedAt: new Date(),
        });

        socket.join(`pc:${data.pcName}`);
        socket.emit('pc:registered', { success: true, pcName: data.pcName });

        // Notify all admins of PC status change
        broadcastToAdmins('pc:status-updated', {
          pcName: data.pcName,
          status: 'online',
          timestamp: new Date(),
        });

        logger.info('websocket_pc_registered', { pcName: data.pcName, socketId: socket.id });
      } catch (error) {
        logger.error('websocket_pc_registration_failed', { pcName: data.pcName, socketId: socket.id, err: error });
        socket.emit('pc:registered', { success: false, error: 'Registration failed' });
      }
    });

    // Admin connection
    registerSocketListener(socket, 'admin:connect', (data: { userId: number }) => {
      if (!authorizeSocketEvent(socket, 'admin:connect')) {
        void handleUnauthorized(socket, 'admin:connect');
        return;
      }
      adminClients.set(socket.id, {
        id: socket.id,
        userId: data.userId,
        connectedAt: new Date(),
      });

      socket.join('admins');
      socket.emit('admin:connected', { success: true });

      // Send current PC status to admin
      const pcStatus = Array.from(pcClients.values()).map(pc => ({
        pcName: pc.pcName,
        ipAddress: pc.ipAddress,
        status: 'online',
        sessionId: pc.sessionId,
      }));

      socket.emit('pc:list-update', pcStatus);
      logger.info('websocket_admin_connected', { userId: data.userId, socketId: socket.id });
    });

    // Session timer events
    registerSocketListener(socket, 'session:start', async (data: { computerId: number; sessionId: number }) => {
      if (!authorizeSocketEvent(socket, 'session:start')) {
        await handleUnauthorized(socket, 'session:start');
        return;
      }
      try {
        const session = await db.getSessionById(data.sessionId);
        if (session) {
          broadcastToAdmins('session:started', {
            computerId: data.computerId,
            sessionId: data.sessionId,
            startTime: session.startTime,
          });
        }
      } catch (error) {
        logger.error('websocket_session_start_failed', { sessionId: data.sessionId, err: error });
      }
    });

    registerSocketListener(socket, 'session:update', async (data: { sessionId: number; remainingTime: number; cost: number }) => {
      if (!authorizeSocketEvent(socket, 'session:update')) {
        await handleUnauthorized(socket, 'session:update');
        return;
      }
      try {
        broadcastToAdmins('session:updated', {
          sessionId: data.sessionId,
          remainingTime: data.remainingTime,
          cost: data.cost,
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error('websocket_session_update_failed', { sessionId: data.sessionId, err: error });
      }
    });

    registerSocketListener(socket, 'session:pause', async (data: { sessionId: number }) => {
      if (!authorizeSocketEvent(socket, 'session:pause')) {
        await handleUnauthorized(socket, 'session:pause');
        return;
      }
      try {
        await db.updateSession(data.sessionId, { sessionStatus: 'paused' });
        broadcastToAdmins('session:paused', { sessionId: data.sessionId });
      } catch (error) {
        logger.error('websocket_session_pause_failed', { sessionId: data.sessionId, err: error });
      }
    });

    registerSocketListener(socket, 'session:resume', async (data: { sessionId: number }) => {
      if (!authorizeSocketEvent(socket, 'session:resume')) {
        await handleUnauthorized(socket, 'session:resume');
        return;
      }
      try {
        await db.updateSession(data.sessionId, { sessionStatus: 'active' });
        broadcastToAdmins('session:resumed', { sessionId: data.sessionId });
      } catch (error) {
        logger.error('websocket_session_resume_failed', { sessionId: data.sessionId, err: error });
      }
    });

    registerSocketListener(socket, 'session:stop', async (data: { sessionId: number; totalCost: number; totalMinutes: number }) => {
      if (!authorizeSocketEvent(socket, 'session:stop')) {
        await handleUnauthorized(socket, 'session:stop');
        return;
      }
      try {
        const existingSession = await db.getSessionById(data.sessionId);
        const originalDurationMinutes = Number(existingSession?.totalDurationMinutes ?? 0);
        const persistedMinutes = Number.isFinite(data.totalMinutes) && Number(data.totalMinutes) > 0
          ? Number(data.totalMinutes)
          : originalDurationMinutes;

        await db.updateSession(data.sessionId, {
          sessionStatus: 'completed',
          totalCost: data.totalCost.toString(),
          totalDurationMinutes: persistedMinutes,
          endTime: new Date(),
        });

        broadcastToAdmins('session:stopped', {
          sessionId: data.sessionId,
          totalCost: data.totalCost,
          totalMinutes: persistedMinutes,
        });
      } catch (error) {
        logger.error('websocket_session_stop_failed', { sessionId: data.sessionId, err: error });
      }
    });

    // PC timer control from admin
    registerSocketListener(socket, 'admin:timer-control', async (data: { pcName: string; action: string; sessionId?: number }) => {
      if (!authorizeSocketEvent(socket, 'admin:timer-control')) {
        void handleUnauthorized(socket, 'admin:timer-control');
        return;
      }
      try {
        let remainingMinutes: number | undefined;
        if (data.action === 'start' && data.sessionId) {
          const session = await db.getSessionById(data.sessionId);
          if (session) {
            const { getSessionTimerState } = await import('./_core/sessionEngine');
            const timerState = getSessionTimerState(session, new Date());
            remainingMinutes = timerState.remainingMinutes;
          }
        }
        io?.to(`pc:${data.pcName}`).emit('timer:control', {
          action: data.action,
          sessionId: data.sessionId,
          remainingMinutes,
        });
      } catch (error) {
        logger.error('websocket_timer_control_failed', { pcName: data.pcName, action: data.action, err: error });
      }
    });

    // Remote PC control commands (shutdown, restart, lock, etc.)
    registerSocketListener(socket, 'admin:pc-control', (data: { pcName: string; action: string; computerId?: number }) => {
      if (!authorizeSocketEvent(socket, 'admin:pc-control')) {
        void handleUnauthorized(socket, 'admin:pc-control');
        return;
      }
      try {
        const action = data.action; // 'shutdown', 'restart', 'lock', 'unlock'
        io?.to(`pc:${data.pcName}`).emit('pc:control', {
          action,
          computerId: data.computerId,
          timestamp: new Date(),
        });
        
        logger.info('websocket_pc_control_sent', { pcName: data.pcName, action, socketId: socket.id });
      } catch (error) {
        logger.error('websocket_pc_control_failed', { pcName: data.pcName, action: data.action, err: error });
      }
    });

    // Force logout/lock screen command
    registerSocketListener(socket, 'admin:force-logout', (data: { pcName: string; sessionId: number }) => {
      if (!authorizeSocketEvent(socket, 'admin:force-logout')) {
        void handleUnauthorized(socket, 'admin:force-logout');
        return;
      }
      try {
        io?.to(`pc:${data.pcName}`).emit('session:force-logout', {
          sessionId: data.sessionId,
          message: 'Your session has been terminated by admin',
          timestamp: new Date(),
        });
        
        logger.info('websocket_force_logout_sent', { pcName: data.pcName, sessionId: data.sessionId, socketId: socket.id });
      } catch (error) {
        logger.error('websocket_force_logout_failed', { pcName: data.pcName, sessionId: data.sessionId, err: error });
      }
    });

    // Send notification to PC client
    registerSocketListener(socket, 'admin:notify-client', (data: { pcName: string; title: string; message: string; type?: string }) => {
      if (!authorizeSocketEvent(socket, 'admin:notify-client')) {
        void handleUnauthorized(socket, 'admin:notify-client');
        return;
      }
      try {
        io?.to(`pc:${data.pcName}`).emit('notification:alert', {
          title: data.title,
          message: data.message,
          type: data.type || 'info',
          timestamp: new Date(),
        });
        
        logger.info('websocket_notification_sent', { pcName: data.pcName, type: data.type || 'info', socketId: socket.id });
      } catch (error) {
        logger.error('websocket_notification_failed', { pcName: data.pcName, err: error });
      }
    });

    // PC heartbeat
    registerSocketListener(socket, 'pc:heartbeat', (data: { pcName: string }) => {
      if (!authorizeSocketEvent(socket, 'pc:heartbeat')) {
        void handleUnauthorized(socket, 'pc:heartbeat');
        return;
      }
      const client = pcClients.get(socket.id);
      if (client) {
        client.pcName = data.pcName;
        pcClients.set(socket.id, client);
      }
    });

    // Disconnect handling
    registerSocketListener(socket, 'disconnect', () => {
      cleanupSocketRoomSubscriptions(socket);
      cleanupSocketListeners(socket);

      const pcClient = pcClients.get(socket.id);
      if (pcClient) {
        pcClients.delete(socket.id);
        broadcastToAdmins('pc:status-updated', {
          pcName: pcClient.pcName,
          status: 'offline',
          timestamp: new Date(),
        });
        logger.info('websocket_pc_disconnected', { pcName: pcClient.pcName, socketId: socket.id });
      }

      const adminClient = adminClients.get(socket.id);
      if (adminClient) {
        adminClients.delete(socket.id);
        logger.info('websocket_admin_disconnected', { userId: adminClient.userId, socketId: socket.id });
      }

      logger.info('websocket_client_disconnected', { socketId: socket.id });
    });
  });

  return io;
}

export function getIO() {
  return io;
}

export function broadcastToAdmins(event: string, data: any) {
  if (io) {
    io.to('admins').emit(event, data);
  }
}

export function broadcastToPC(pcName: string, event: string, data: any) {
  if (io) {
    io.to(`pc:${pcName}`).emit(event, data);
  }
}

export function getPCClients() {
  return Array.from(pcClients.values());
}

export function getAdminClients() {
  return Array.from(adminClients.values());
}
