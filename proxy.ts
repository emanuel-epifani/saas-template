import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Next.js 16 renamed middleware.ts -> proxy.ts.
// Optimistic check only: the cookie's existence says "probably signed in",
// it does NOT validate the session. Real authorization happens server-side
// in requireUser() (lib/auth/session.ts) and in every Server Action.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/account",
  "/companies",
  "/job-offers",
  "/saved",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  if (
    !sessionCookie &&
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  // NOTE: no "/auth/* -> /dashboard" redirect here. The cookie check is
  // presence-only, so a stale/invalid cookie would ping-pong forever:
  // /auth/sign-in -> /dashboard -> requireUser() -> /auth/sign-in -> ...
  return NextResponse.next();
}

export const config = {
  // DEVE rispecchiare PROTECTED_PREFIXES — Next.js esige stringhe statiche,
  // non si può derivare con .map().
  matcher: [
    "/dashboard/:path*",
    "/account/:path*",
    "/companies/:path*",
    "/job-offers/:path*",
    "/saved/:path*",
  ],
};
