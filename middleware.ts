import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Phase 2 — protect coach-only routes.
 * Anything under /coach/dashboard (and future /coach/studio) requires a valid
 * signed session cookie. Unauthenticated requests redirect to /coach/login.
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    const loginUrl = new URL("/coach/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/coach/dashboard/:path*", "/coach/onboarding/:path*"],
};
