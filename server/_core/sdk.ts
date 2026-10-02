import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { IncomingMessage } from "http";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { verifyPassword } from "./passwordUtils";
import { logger } from "./logger";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";
// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  userId: number;
  appId: string;
  username: string;
  accountType?: "user" | "staff";
};

const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

class OAuthService {
  constructor(private client: ReturnType<typeof axios.create>) {
    logger.info("oauth_initialized", { baseUrl: ENV.oAuthServerUrl });
    if (!ENV.oAuthServerUrl) {
      logger.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }

  private decodeState(state: string): string {
    const redirectUri = atob(state);
    return redirectUri;
  }

  async getTokenByCode(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    const payload: ExchangeTokenRequest = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state),
    };

    const { data } = await this.client.post<ExchangeTokenResponse>(
      EXCHANGE_TOKEN_PATH,
      payload
    );

    return data;
  }

  async getUserInfoByToken(
    token: ExchangeTokenResponse
  ): Promise<GetUserInfoResponse> {
    const { data } = await this.client.post<GetUserInfoResponse>(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken,
      }
    );

    return data;
  }
}

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({
    baseURL: ENV.oAuthServerUrl,
    timeout: AXIOS_TIMEOUT_MS,
  });

class SDKServer {
  private readonly client: AxiosInstance;
  private readonly oauthService: OAuthService;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }

  private deriveLoginMethod(
    platforms: unknown,
    fallback: string | null | undefined
  ): string | null {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set<string>(
      platforms.filter((p): p is string => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (
      set.has("REGISTERED_PLATFORM_MICROSOFT") ||
      set.has("REGISTERED_PLATFORM_AZURE")
    )
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }

  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    return this.oauthService.getTokenByCode(code, state);
  }

  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken,
    } as ExchangeTokenResponse);
    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoResponse;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getHeaderValue(headers: Record<string, string | string[] | undefined> | undefined, name: string) {
    const value = headers?.[name];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  private extractBearerToken(headerValue: string | undefined) {
    if (!headerValue) return undefined;
    if (headerValue.startsWith("Bearer ")) {
      return headerValue.slice(7).trim();
    }
    return headerValue;
  }

  private extractQueryToken(url: string | undefined) {
    if (!url) return undefined;
    try {
      const parsed = new URL(url, "http://localhost");
      const token = parsed.searchParams.get("token") || parsed.searchParams.get("jwt");
      return token ?? undefined;
    } catch {
      return undefined;
    }
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  /**
   * Create a session token for a local user by user ID
   * @example
   * const sessionToken = await sdk.createLocalSessionToken(user.id, user.username);
   */
  async createLocalSessionToken(
    userId: number,
    username: string,
    options: { expiresInMs?: number; accountType?: "user" | "staff" } = {}
  ): Promise<string> {
    return this.signSession(
      {
        userId,
        appId: ENV.appId,
        username,
        accountType: options.accountType ?? "user",
      },
      options
    );
  }

  /**
   * Create a session token for a Manus user openId (legacy OAuth support)
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    // Convert legacy openId-based token to userId-based token
    // This is only used for OAuth, which we're removing
    return this.signSession(
      {
        userId: 0,
        appId: ENV.appId,
        username: options.name || "",
        accountType: "user",
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      userId: payload.userId,
      appId: payload.appId,
      username: payload.username,
      ...(payload.accountType ? { accountType: payload.accountType } : {}),
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ userId: number; appId: string; username: string; accountType?: "user" | "staff" } | null> {
    if (!cookieValue) {
      logger.warn("auth_missing_session_cookie", {});
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { userId, appId, username, accountType } = payload as Record<string, unknown>;

      if (
        typeof userId !== "number" ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(username) ||
        (accountType !== undefined && accountType !== "user" && accountType !== "staff")
      ) {
        logger.warn("auth_invalid_session_payload", {});
        return null;
      }

      return {
        userId,
        appId,
        username,
        ...(accountType ? { accountType } : {}),
      };
    } catch (error) {
      logger.warn("auth_session_verification_failed", { err: error });
      return null;
    }
  }

  async getUserInfoWithJwt(
    jwtToken: string
  ): Promise<GetUserInfoWithJwtResponse> {
    const payload: GetUserInfoWithJwtRequest = {
      jwtToken,
      projectId: ENV.appId,
    };

    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );

    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoWithJwtResponse;
  }

  private async resolveAuthenticatedUser(session: { userId: number; appId: string; username: string; accountType?: "user" | "staff" }) {
    const signedInAt = new Date();
    const staff = await db.getStaffById(session.userId);
    const isStaffSession = session.accountType === "staff" || (!!staff && session.accountType !== "user");

    if (isStaffSession) {
      if (!staff) {
        throw ForbiddenError("Staff not found");
      }

      const role = await db.getAllStaffRoles().then((roles) => roles.find((item) => item.id === staff.roleId));
      const effectivePermissions = await db.getStaffRoleEffectivePermissions(staff.roleId);

      const staffUser = {
        id: staff.id,
        openId: null,
        username: staff.username,
        passwordHash: staff.passwordHash,
        name: staff.fullName,
        email: staff.email,
        loginMethod: "local",
        role: "staff",
        staffRoleSlug: role?.slug || "staff",
        phoneNumber: staff.phoneNumber,
        membershipTier: "none",
        customerStatus: "active",
        prepaidBalance: "0",
        loyaltyPoints: 0,
        customerNotes: null,
        registeredAt: staff.createdAt,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
        lastSignedIn: staff.lastLogin ?? staff.createdAt,
        accountType: "staff" as const,
      } as unknown as User & { permissions?: string[]; accountType: "staff" };

      (staffUser as any).permissions = effectivePermissions;
      return staffUser;
    }

    const user = await db.getUserById(session.userId);
    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return {
      ...user,
      accountType: "user" as const,
      permissions: [],
    } as User & { permissions?: string[]; accountType: "user" };
  }

  async authenticateSocketRequest(
    req: { headers?: Record<string, string | string[] | undefined>; url?: string } | Request | IncomingMessage,
    providedToken?: string | null
  ): Promise<User | null> {
    const headers = "headers" in req ? req.headers : undefined;
    const cookies = this.parseCookies(this.getHeaderValue(headers, "cookie"));
    const authorization = this.getHeaderValue(headers, "authorization");
    const sessionCookie = providedToken
      ?? this.extractBearerToken(authorization)
      ?? cookies.get(COOKIE_NAME)
      ?? this.extractQueryToken((req as { url?: string }).url);

    if (!sessionCookie) {
      return null;
    }

    const session = await this.verifySession(sessionCookie);
    if (!session) {
      return null;
    }

    return this.resolveAuthenticatedUser(session);
  }

  async authenticateRequest(req: Request): Promise<User> {
    const user = await this.authenticateSocketRequest(req);
    if (!user) {
      throw ForbiddenError("Invalid session cookie");
    }

    return user;
  }

  /**
   * Login with username and password (local authentication)
   */
  async loginWithPassword(
    usernameOrEmail: string,
    password: string
  ): Promise<{ user: User; sessionToken: string }> {
    // Find user by username or email
    const user = await db.getUserByUsername(usernameOrEmail);
    
    if (!user || !user.passwordHash) {
      throw ForbiddenError("Invalid username or password");
    }

    // Verify password
    if (!verifyPassword(password, user.passwordHash)) {
      throw ForbiddenError("Invalid username or password");
    }

    // Create session token
    const sessionToken = await this.createLocalSessionToken(
      user.id,
      user.username!,
      { expiresInMs: ONE_YEAR_MS }
    );

    // Update last signed in
    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: new Date(),
    });

    return { user, sessionToken };
  }
}

export const sdk = new SDKServer();

export async function authenticateSocketRequest(
  req: { headers?: Record<string, string | string[] | undefined>; url?: string } | Request | IncomingMessage,
  providedToken?: string | null
) {
  return sdk.authenticateSocketRequest(req, providedToken);
}
