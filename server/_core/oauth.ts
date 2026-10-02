import type { Express } from "express";
import { logger } from "./logger";

/**
 * OAuth routes have been removed in favor of local authentication.
 * All authentication is now handled through local username/password login.
 * See server/routers.ts for the auth.login endpoint.
 */

export function registerOAuthRoutes(app: Express) {
  // OAuth routes are disabled
  logger.info("oauth_routes_disabled", { message: "Using local authentication" });
}

