import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "ajaia_session";

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return value;
}

function hmac(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** Cookie value is `userId.signature` so the id cannot be swapped without the secret. */
export function signSession(userId: string, key: string = secret()): string {
  return `${userId}.${hmac(userId, key)}`;
}

/** Returns the user id if the signature is valid, otherwise null. */
export function verifySession(token: string | undefined, key: string = secret()): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(hmac(userId, key));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return userId;
}
