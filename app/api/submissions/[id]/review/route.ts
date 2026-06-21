import { NextRequest, NextResponse } from "next/server";
import {
  markSubmissionInReview,
  getSubmissionById,
} from "@/lib/submissions";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Phase 4 — Start review endpoint.
 *
 * POST /api/submissions/[id]/review
 * Transitions a paid submission to in_review. Coach-only: requires a valid
 * session cookie, and the submission must belong to the signed-in coach.
 *
 * Guardrail: payment before review. Only `paid` → `in_review`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth gate
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const submission = getSubmissionById(id);
  if (!submission) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 },
    );
  }

  // Ownership guard
  if (submission.coachSlug !== session.coachSlug) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  if (submission.status !== "paid") {
    return NextResponse.json(
      { error: `Submission is ${submission.status}, not paid` },
      { status: 409 },
    );
  }

  try {
    const updated = markSubmissionInReview(id);
    return NextResponse.json({
      id: updated.id,
      status: updated.status,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start review" },
      { status: 500 },
    );
  }
}
