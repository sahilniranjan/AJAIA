import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Redirect signed-out visitors before any page streams. Without this, the dashboard's
// loading.tsx renders first and the redirect arrives inside a 200 response. This is only an
// optimistic check: pages and API routes still verify the session and the user on every request.
export function proxy(request: NextRequest) {
  if (verifySession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/", "/docs/:path*"],
};
