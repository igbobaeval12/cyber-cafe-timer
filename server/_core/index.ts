import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeWebSocket } from "../websocket";
import { ensureDefaultAdminUser } from "./authBootstrap";
import { ensureDefaultStaffSetup } from "../db";
import { logger } from "./logger";
import { startSessionExpiryMonitor } from "./sessionEngine";

import { createApiErrorPayload, getRequestId } from "./validation";

function createRateLimiter(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>();

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const window = requests.get(key) ?? [];
    const recent = window.filter((timestamp) => now - timestamp < windowMs);

    if (recent.length >= maxRequests) {
      const requestId = getRequestId(req, res);
      logger.warn("rate_limit_hit", { requestId, ip: req.ip, path: req.path });
      res.status(429).json(createApiErrorPayload("Too many requests. Please try again shortly.", "RATE_LIMITED", requestId));
      return;
    }

    recent.push(now);
    requests.set(key, recent);
    next();
  };
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  await ensureDefaultAdminUser();
  await ensureDefaultStaffSetup();

  const app = express();
  const server = createServer(app);
  const trpcRateLimiter = createRateLimiter(120, 60_000);

  // Initialize WebSocket
  initializeWebSocket(server);

  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const requestId = req.headers["x-request-id"]?.toString() ?? crypto.randomUUID();
    res.setHeader("x-request-id", requestId);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    (req as express.Request & { requestId?: string }).requestId = requestId;
    next();
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/workstation-state", async (req, res) => {
    const workstationId = String(req.query.workstationId || "").trim();
    if (!workstationId) {
      res.status(400).json({ error: "workstationId is required" });
      return;
    }

    try {
      const computer = await (await import("../db")).getComputerByName(workstationId);
      if (!computer) {
        res.status(404).json({ authorized: false, workstationId, reason: "unregistered_workstation", session: null });
        return;
      }

      const session = await (await import("../db")).getActiveSessionByComputerId(computer.id);
      const authorized = Boolean(session && session.sessionStatus === "active" && (!session.endTime || new Date(session.endTime).getTime() > Date.now()));
      res.json({
        authorized,
        workstationId,
        reason: authorized ? "active_session" : "no_active_session",
        session: authorized ? {
          id: session.id,
          userId: session.userId,
          computerId: session.computerId,
          startTime: session.startTime,
          endTime: session.endTime,
          totalDurationMinutes: session.totalDurationMinutes,
          sessionStatus: session.sessionStatus,
        } : null,
      });
    } catch (error) {
      logger.error("workstation_state_query_failed", { err: error, workstationId });
      res.status(500).json({ authorized: false, workstationId, reason: "server_error", session: null });
    }
  });

  app.use((req, res, next) => {
    const requestId = getRequestId(req, res);
    logger.info("request_received", { requestId, method: req.method, path: req.path, ip: req.ip });
    next();
  });
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use("/api/trpc", trpcRateLimiter, createExpressMiddleware({
    router: appRouter,
    createContext,
  }));
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.warn("port_reassigned", { preferredPort, port });
  }

  server.listen(port, () => {
    logger.info("server_started", { port, host: "localhost" });
    startSessionExpiryMonitor();
  });

  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const requestId = getRequestId(req, res);
    logger.error("unhandled_server_error", { requestId, err });
    res.status(500).json(createApiErrorPayload("Internal server error", "INTERNAL_SERVER_ERROR", requestId));
  });
}

startServer().catch((error) => {
  logger.error("server_start_failed", { err: error });
  process.exit(1);
});
