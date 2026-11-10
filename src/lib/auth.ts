import { cookies } from "next/headers";
import { db } from "./db";
import { unauthenticated } from "./errors";
import { SESSION_COOKIE, verifySession } from "./session";

export type CurrentUser = { id: string; email: string; name: string };

/** Resolves the signed-in user from the cookie, or null if missing, tampered, or stale. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const userId = verifySession(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  return user;
}
