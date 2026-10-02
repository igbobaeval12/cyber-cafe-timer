import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateSocketConnection, authorizeSocketEvent, cleanupSocketListeners, cleanupSocketRoomSubscriptions, registerSocketListener } from "./websocket";
import * as security from "./_core/security";
import * as sdk from "./_core/sdk";

describe("websocket auth guards", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("allows admin events for admin users and blocks them for regular users", () => {
    const adminSocket = { data: { user: { role: "admin" } } } as any;
    const regularSocket = { data: { user: { role: "user" } } } as any;

    expect(authorizeSocketEvent(adminSocket, "admin:pc-control")).toBe(true);
    expect(authorizeSocketEvent(regularSocket, "admin:pc-control")).toBe(false);
  });

  it("rejects invalid or expired tokens during handshake", async () => {
    const logSpy = vi.spyOn(security, "logSecurityEvent").mockResolvedValue();
    vi.spyOn(sdk, "authenticateSocketRequest").mockResolvedValue(null);

    const socket = {
      handshake: { auth: { token: "bad-token" } },
      request: {},
      emit: vi.fn(),
      disconnect: vi.fn(),
    } as any;

    const result = await authenticateSocketConnection(socket);

    expect(result.allowed).toBe(false);
    expect(result.error).toBe("Authentication failed");
    expect(logSpy).toHaveBeenCalled();
  });

  it("registers and cleans up event listeners without duplicates", () => {
    const socket = {
      on: vi.fn(),
      off: vi.fn(),
    } as any;
    const handler = vi.fn();

    registerSocketListener(socket, "pc:register", handler);
    registerSocketListener(socket, "pc:register", handler);
    cleanupSocketListeners(socket);

    expect(socket.off).toHaveBeenCalledWith("pc:register", handler);
    expect(socket.on).toHaveBeenCalledWith("pc:register", handler);
  });

  it("cleans up stale room subscriptions during disconnect handling", () => {
    const socket = {
      id: "socket-1",
      rooms: new Set(["socket-1", "room-a", "room-b"]),
      leave: vi.fn().mockResolvedValue(undefined),
    } as any;

    cleanupSocketRoomSubscriptions(socket);

    expect(socket.leave).toHaveBeenCalledWith("room-a");
    expect(socket.leave).toHaveBeenCalledWith("room-b");
  });
});
