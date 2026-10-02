/**
 * Seed script to create or reconcile the primary admin user.
 * Run with: npm run seed or pnpm seed
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { users } from "./drizzle/schema";
import { hashPassword } from "./server/_core/passwordUtils";
import { ensureDefaultStaffSetup, updateNotificationPreferences, updateSystemSettings } from "./server/db";
import { eq, or } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

async function seed() {
  const db = drizzle(DATABASE_URL);

  console.log("[Seed] Reconciling the primary admin user...");

  try {
    let adminUserId: number | undefined;

    const existingAdmin = await db
      .select({ id: users.id, username: users.username, openId: users.openId, role: users.role })
      .from(users)
      .where(or(eq(users.username, "admin"), eq(users.username, "Baeval")))
      .limit(2);

    const legacyAdmin = existingAdmin.find((row) => row.username === "admin");
    const baevalAdmin = existingAdmin.find((row) => row.username === "Baeval");

    if (legacyAdmin) {
      adminUserId = legacyAdmin.id;
      await db
        .update(users)
        .set({
          username: "Baeval",
          passwordHash: hashPassword("252569"),
          loginMethod: "local",
          role: "admin",
          name: "Administrator",
          email: "admin@localhost",
          updatedAt: new Date(),
        })
        .where(eq(users.id, legacyAdmin.id));

      console.log("[Seed] Primary admin account migrated from admin to Baeval and hashed password updated.");
    } else if (baevalAdmin) {
      adminUserId = baevalAdmin.id;
      await db
        .update(users)
        .set({
          passwordHash: hashPassword("252569"),
          loginMethod: "local",
          role: "admin",
          name: "Administrator",
          email: "admin@localhost",
          updatedAt: new Date(),
        })
        .where(eq(users.id, baevalAdmin.id));

      console.log("[Seed] Existing Baeval admin account password updated using the secure app hash mechanism.");
    } else {
      console.log("[Seed] Creating new primary admin user...");

      const passwordHash = hashPassword("252569");
      const adminOpenId = `local_admin_${Date.now()}`;

      await db.insert(users).values({
        username: "Baeval",
        email: "admin@localhost",
        name: "Administrator",
        passwordHash,
        loginMethod: "local",
        role: "admin",
        openId: adminOpenId,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      });

      const createdAdmin = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, "Baeval"))
        .limit(1);
      adminUserId = createdAdmin[0]?.id;

      console.log("[Seed] Admin user created successfully");
    }

    await ensureDefaultStaffSetup();

    if (adminUserId) {
      await updateNotificationPreferences(adminUserId, {});
      await updateSystemSettings({});
    }

    console.log("[Seed] Seeding completed!");
    console.log("[Seed] Primary admin login is now configured for Baeval.");
  } catch (error) {
    console.error("[Seed] Failed to seed database:", error);
    process.exit(1);
  }
}

seed().then(() => process.exit(0));
