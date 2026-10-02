export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * OAuth login has been replaced with local authentication.
 * Use the LoginForm component for local login instead.
 */
export const getLoginUrl = () => {
  // Local auth only - no OAuth needed
  return "/";
};

