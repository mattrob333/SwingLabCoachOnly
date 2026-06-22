import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import {
  getEarningsForCoach,
  getTotalEarningsForCoach,
} from "@/lib/earnings";

/**
 * Phase 8 — Coach earnings endpoint.
 *
 * GET /api/coach/earnings
 *   Returns the signed-in coach's earnings: total USD + per-submission
 *   breakdown (newest-first). Coach-only: requires a valid session.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const earnings = await getEarningsForCoach(session.coachSlug);
  const total = await getTotalEarningsForCoach(session.coachSlug);

  return NextResponse.json({
    totalUsd: total,
    count: earnings.length,
    earnings: earnings.map((e) => ({
      id: e.id,
      submissionId: e.submissionId,
      amountUsd: e.amountUsd,
      parentEmail: e.parentEmail,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
