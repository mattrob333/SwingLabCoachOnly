import { NextRequest, NextResponse } from "next/server";
import { getSubmissionById } from "@/lib/submissions";
import { getCoachBySlug } from "@/lib/coaches";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import {
  generateLessonDraft,
  type LessonDraftStatus,
} from "@/lib/ai/lesson-draft";
import {
  getDraftForSubmission,
  saveDraft,
} from "@/lib/ai/lesson-draft-store";
import { getDeliveryTokenRepository } from "@/lib/repositories";
import { getEmailAdapter } from "@/lib/email";
import type { RenderManifest } from "@/lib/render/pipeline";

/**
 * GET /api/submissions/[id]/lesson-draft
 *   Fetches the lesson draft for a submission. No auth required — parents
 *   access the lesson via a link containing the submission id.
 *
 * POST /api/submissions/[id]/lesson-draft
 *   Generates a lesson draft from the coach's review session (render manifest).
 *   The submission must be `completed` (review + render done).
 *   Guardrail: AI assists coach only — the draft is always "draft" status until
 *   the coach explicitly approves via PATCH.
 *
 * PATCH /api/submissions/[id]/lesson-draft
 *   Updates the lesson draft (coach notes, status: approve/reject).
 *   Coach-only: requires a valid session, and the submission must belong to the
 *   signed-in coach.
 */

type GenerateBody = {
  swingType: string;
  manifest: RenderManifest;
};

type UpdateBody = {
  coachNotes?: string;
  status?: LessonDraftStatus;
};

function authGate(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  return session;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const submission = await getSubmissionById(id);
  if (!submission) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 },
    );
  }

  const draft = getDraftForSubmission(id);
  if (!draft) {
    return NextResponse.json(
      { error: "No lesson draft found for this submission" },
      { status: 404 },
    );
  }

  return NextResponse.json(draft);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = authGate(request);
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const submission = await getSubmissionById(id);
  if (!submission) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 },
    );
  }

  if (submission.coachSlug !== session.coachSlug) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (submission.status !== "completed") {
    return NextResponse.json(
      { error: `Submission is ${submission.status}, not completed` },
      { status: 409 },
    );
  }

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.manifest || !body.manifest.videoUrl) {
    return NextResponse.json(
      { error: "manifest with videoUrl is required" },
      { status: 400 },
    );
  }

  const draft = generateLessonDraft({
    submissionId: id,
    swingType: body.swingType ?? submission.swingType,
    manifest: body.manifest,
  });

  saveDraft(draft);
  return NextResponse.json(draft);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = authGate(request);
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const submission = await getSubmissionById(id);
  if (!submission) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 },
    );
  }

  if (submission.coachSlug !== session.coachSlug) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = getDraftForSubmission(id);
  if (!existing) {
    return NextResponse.json(
      { error: "No lesson draft found for this submission" },
      { status: 404 },
    );
  }

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (body.coachNotes !== undefined) {
    existing.coachNotes = body.coachNotes;
  }

  if (body.status !== undefined) {
    const validStatuses: LessonDraftStatus[] = [
      "draft",
      "approved",
      "rejected",
    ];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status: ${body.status}` },
        { status: 400 },
      );
    }

    // ── Delivery token + email on transition to "approved" ──
    // Only fire when transitioning TO approved (not if already approved —
    // avoids duplicate tokens/emails on repeated PATCH calls). This is the
    // core of the approve→deliver flow (Wave 2 Task 4 Sub-slice C).
    const transitioningToApproved =
      body.status === "approved" && existing.status !== "approved";

    existing.status = body.status;

    if (transitioningToApproved) {
      try {
        const coach = await getCoachBySlug(session.coachSlug);
        const coachName = coach?.name ?? session.coachSlug;

        const deliveryToken =
          await getDeliveryTokenRepository().create({
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
            `[lesson-draft] delivery email failed for submission ${id}:`,
            emailResult.error,
          );
          // Don't fail the approval — the token is created and the coach
          // can re-send later. Log the error and continue.
        }
      } catch (err) {
        console.error(
          `[lesson-draft] delivery token/email error for submission ${id}:`,
          err,
        );
        // Non-fatal: the approval status is still saved. The delivery
        // can be retried. We don't want a failed email to block the
        // coach's approval workflow.
      }
    }
  }

  saveDraft(existing);
  return NextResponse.json(existing);
}
