import { eq } from "drizzle-orm";
import { ENV } from "./env";
import { hashPassword } from "./passwordUtils";
import * as db from "../db";
import { logger } from "./logger";
import { users } from "../../drizzle/schema";

export async function ensureDefaultAdminUser() {
  try {
    const username = ENV.adminUsername;
    const requestedHash = hashPassword(ENV.adminPassword);
    const configuredDb = await db.getDb();

    const configured = await db.getUserByUsername(username);
    const legacy = await db.getUserByUsername("admin");

    if (configured?.passwordHash) {
      if (!configured.role || configured.role !== "admin") {
        await configuredDb!.update(users).set({ role: "admin", passwordHash: requestedHash, loginMethod: "local", name: configured.name ?? "Administrator", updatedAt: new Date() }).where(eq(users.id, configured.id));
      }
      await configuredDb!.update(users).set({ passwordHash: requestedHash, loginMethod: "local", role: "admin", name: configured.name ?? "Administrator", updatedAt: new Date() }).where(eq(users.id, configured.id));
      return;
    }

    if (legacy && !configured) {
      await configuredDb!.update(users).set({
        username,
        passwordHash: requestedHash,
        loginMethod: "local",
        role: "admin",
        name: legacy.name ?? "Administrator",
        email: legacy.email ?? "admin@localhost",
        openId: legacy.openId ?? null,
        updatedAt: new Date(),
      }).where(eq(users.id, legacy.id));
      return;
    }

    await db.upsertLocalUser({
      username,
      passwordHash: requestedHash,
      role: "admin",
      loginMethod: "local",
      name: "Administrator",
      openId: null,
    });
  } catch (error) {
    logger.error("auth_bootstrap_failed", { err: error });
  }
}
