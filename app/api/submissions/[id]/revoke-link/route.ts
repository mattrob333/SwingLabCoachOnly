import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getSubmissionById } from "@/lib/submissions";
import { getDeliveryTokenRepository } from "@/lib/repositories";

/**
 * POST /api/submissions/[id]/revoke-link
 *   Privacy control (Wave 6 Task 4 — PRD §25). Lets a coach revoke all active
 *   delivery tokens for a submission, immediately invalidating the magic link
 *   sent to the parent. The parent can no longer access the lesson via any
 *   previously-issued link. The coach can re-approve later to issue a new token.
 *
 *   Pre-conditions:
 *   - Valid coach session (401 if not authenticated).
 *   - Submission must belong to the signed-in coach (403 otherwise).
 *
 *   Returns `{ revokedCount: N }` where N is the number of tokens that were
 *   active (not already revoked) and are now revoked. Idempotent: calling again
 *   returns 0 if all tokens were already revoked.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const token = _request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const submission = await getSubmissionById(id);
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (submission.coachSlug !== session.coachSlug) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const repo = getDeliveryTokenRepository();
  const tokens = await repo.getBySubmissionId(id);

  let revokedCount = 0;
  for (const t of tokens) {
    if (t.revokedAt === undefined) {
      await repo.revoke(t.id);
      revokedCount++;
    }
  }

  return NextResponse.json({ revokedCount });
}
