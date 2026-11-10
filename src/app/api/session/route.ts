import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, readJson, validationError } from "@/lib/errors";
import { SESSION_COOKIE, signSession } from "@/lib/session";
import { parseOrThrow, sessionSchema } from "@/lib/validation";

export const POST = handle(async (request: Request) => {
  const { userId } = parseOrThrow(sessionSchema, await readJson(request), validationError);
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw validationError("Unknown user.");

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, signSession(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
});

export const DELETE = handle(async () => {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
});
