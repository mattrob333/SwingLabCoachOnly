import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getSubmissionById } from "@/lib/submissions";
import { getComparisonPair, listComparisonCandidates } from "@/lib/comparison";

/**
 * Phase 10 — Comparison mode API (PRD §31 build order #20).
 *
 * GET /api/comparison?original=X
 *   Returns the list of follow-up submissions that can be compared against the
 *   original (those with a completed render manifest). Coach-only.
 *
 * GET /api/comparison?original=X&followUp=Y
 *   Returns the validated comparison pair (original + follow-up video URLs).
 *   Coach-only.
 *
 * Guardrail: the original submission must belong to the signed-in coach.
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

  const originalId = request.nextUrl.searchParams.get("original");
  if (!originalId) {
    return NextResponse.json(
      { error: "Missing 'original' query parameter" },
      { status: 400 },
    );
  }

  // Ownership: the original must exist and belong to this coach.
  const original = getSubmissionById(originalId);
  if (!original || original.coachSlug !== session.coachSlug) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 },
    );
  }

  const followUpId = request.nextUrl.searchParams.get("followUp");

  // Pair mode
  if (followUpId) {
    try {
      const pair = getComparisonPair(originalId, followUpId);
      return NextResponse.json({
        original: {
          submissionId: pair.original.submission.id,
          videoUrl: pair.original.videoUrl,
          createdAt: pair.original.submission.createdAt.toISOString(),
        },
        followUp: {
          submissionId: pair.followUp.submission.id,
          videoUrl: pair.followUp.videoUrl,
          createdAt: pair.followUp.submission.createdAt.toISOString(),
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Comparison pair not available" },
        { status: 404 },
      );
    }
  }

  // Candidate-list mode
  const candidates = listComparisonCandidates(originalId);
  return NextResponse.json({
    originalSubmissionId: originalId,
    candidates: candidates.map((c) => ({
      submissionId: c.submission.id,
      videoUrl: c.videoUrl,
      createdAt: c.submission.createdAt.toISOString(),
    })),
  });
}
