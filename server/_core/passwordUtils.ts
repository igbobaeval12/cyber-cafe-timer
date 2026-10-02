import { scryptSync } from "crypto";
import bcrypt from "bcryptjs";

/**
 * Hash a password using bcrypt.
 * Returns a bcrypt hash string that can be verified safely.
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

/**
 * Verify a password against a stored hash.
 * Supports both bcrypt hashes and the legacy scrypt format for compatibility.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;

  if (storedHash.startsWith("$2") || storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
    return bcrypt.compareSync(password, storedHash);
  }

  if (storedHash.startsWith("$scrypt$")) {
    try {
      const parts = storedHash.split("$");
      if (parts.length !== 4 || parts[1] !== "scrypt") {
        return false;
      }

      const salt = parts[2];
      const storedHashValue = parts[3];
      const computedHash = scryptSync(password, salt, 64).toString("hex");

      return constantTimeCompare(computedHash, storedHashValue);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Constant-time string comparison.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
