import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import * as db from "../db";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  workstationState: publicProcedure
    .input(
      z.object({
        workstationId: z.string().trim().min(1),
      })
    )
    .query(async ({ input }) => {
      const computer = await db.getComputerByName(input.workstationId);
      if (!computer) {
        return {
          authorized: false,
          workstationId: input.workstationId,
          reason: "unregistered_workstation",
          session: null,
        };
      }

      const session = await db.getActiveSessionByComputerId(computer.id);
      const authorized = Boolean(session && session.sessionStatus === "active" && (!session.endTime || new Date(session.endTime).getTime() > Date.now()));

      return {
        authorized,
        workstationId: input.workstationId,
        reason: authorized ? "active_session" : "no_active_session",
        session: authorized
          ? {
              id: session.id,
              userId: session.userId,
              computerId: session.computerId,
              startTime: session.startTime,
              endTime: session.endTime,
              totalDurationMinutes: session.totalDurationMinutes,
              sessionStatus: session.sessionStatus,
            }
          : null,
      };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
