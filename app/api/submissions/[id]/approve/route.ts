import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { rateLimitOr429 } from "@/lib/auth/rate-limit";
import { getSubmissionById } from "@/lib/submissions";
import { getCoachBySlug } from "@/lib/coaches";
import {
  getPlaybackManifestForSubmission,
  savePlaybackManifest,
} from "@/lib/lesson/playback-store";
import { getDeliveryTokenRepository } from "@/lib/repositories";
import { getEmailAdapter } from "@/lib/email";

/**
 * POST /api/submissions/[id]/approve
 *   Coach approves the AI-packaged lesson. Transitions the playback manifest
 *   status to "approved" and triggers delivery (delivery token + email) on the
 *   first approval — subsequent calls are idempotent (no duplicate tokens/emails).
 *
 *   Pre-conditions:
 *   - Valid coach session (401 if not authenticated).
 *   - Submission must belong to the signed-in coach (403 otherwise).
 *   - A playback manifest must exist for the submission (404 if missing).
 *   - The manifest must have been packaged (aiSummary must exist) — 409 otherwise.
 *
 *   Delivery side effects (token creation + email send) are non-fatal: if they
 *   fail, the approval still succeeds. The coach can re-trigger delivery later.
 *   This mirrors the Wave 2 approve→deliver wiring pattern from the lesson-draft
 *   PATCH route.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Rate limit: 20 approve calls per 10 minutes per IP.
  const blocked = rateLimitOr429(request, {
    limit: 20,
    windowMs: 600_000,
    keyPrefix: "approve",
  });
  if (blocked) return blocked;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
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

  const manifest = await getPlaybackManifestForSubmission(id);
  if (!manifest) {
    return NextResponse.json(
      { error: "No lesson manifest found for this submission" },
      { status: 404 },
    );
  }

  // Require packaging before approval — the coach should review AI output first.
  if (!manifest.aiSummary) {
    return NextResponse.json(
      { error: "Manifest has not been packaged yet. Run packaging before approving." },
      { status: 409 },
    );
  }

  // Transition detection — only fire delivery side effects on the FIRST approval.
  const transitioningToApproved = manifest.status !== "approved";

  manifest.status = "approved";

  if (transitioningToApproved) {
    try {
      const coach = await getCoachBySlug(session.coachSlug);
      const coachName = coach?.name ?? session.coachSlug;

      const deliveryToken = await getDeliveryTokenRepository().create({
        submissionId: id,
        parentEmail: submission.parentEmail,
      });

      const lessonUrl = `/lesson/${id}?token=${deliveryToken.token}`;

      const emailResult = await getEmailAdapter().sendLessonDeliveryEmail({
        to: submission.parentEmail,
        coachName,
        lessonUrl,
        submissionId: id,
      });

      if (!emailResult.success) {
        console.error(
          `[approve] delivery email failed for submission ${id}:`,
          emailResult.error,
        );
        // Non-fatal — the token is created and the coach can re-send later.
      }
    } catch (err) {
      console.error(
        `[approve] delivery token/email error for submission ${id}:`,
        err,
      );
      // Non-fatal: the approval status is still saved.
    }
  }

  const { ...manifestData } = manifest;
  await savePlaybackManifest(id, manifestData);

  return NextResponse.json(manifest);
}
