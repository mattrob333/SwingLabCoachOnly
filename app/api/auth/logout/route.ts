import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

/** Clears the session cookie and redirects to /coach/login. */
export async function POST() {
  const response = NextResponse.redirect(new URL("/coach/login", process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"));
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
