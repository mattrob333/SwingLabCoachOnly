import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "swinglab_session";
const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "swinglab-dev-secret-change-me";

type SessionPayload = {
  coachSlug: string;
  expiresAt: number;
};

function base64UrlToText(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return atob(padded);
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifySessionForEdge(token: string): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, sig] = parts;
  if (!body || !sig) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedSig = bytesToBase64Url(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
  );
  if (!safeEqual(sig, expectedSig)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(base64UrlToText(body)) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof payload.coachSlug !== "string") return null;
  if (typeof payload.expiresAt !== "number") return null;
  if (Date.now() > payload.expiresAt) return null;
  return payload;
}

/**
 * Phase 2 — protect coach-only routes.
 * Anything under /coach/dashboard (and future /coach/studio) requires a valid
 * signed session cookie. Unauthenticated requests redirect to /coach/login.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionForEdge(token) : null;

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
