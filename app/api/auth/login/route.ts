import { NextResponse } from "next/server";
import { verifyCoachCredentials, coachExists } from "@/lib/auth/credentials";
import {
  signSession,
  createSessionPayload,
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { slug?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slug = body.slug?.trim();
  const password = body.password ?? "";

  if (!slug || !password) {
    return NextResponse.json(
      { error: "Slug and password are required" },
      { status: 400 }
    );
  }

  if (!coachExists(slug)) {
    // Don't leak which slugs exist; same shape as bad password.
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!verifyCoachCredentials(slug, password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signSession(createSessionPayload(slug));
  const response = NextResponse.json({ ok: true, slug });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
  });
  return response;
}
