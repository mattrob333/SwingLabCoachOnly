import { NextRequest, NextResponse } from "next/server";
import { getSubmissionById } from "@/lib/submissions";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import {
  generateLessonDraft,
  type LessonDraftStatus,
} from "@/lib/ai/lesson-draft";
import {
  getDraftForSubmission,
  saveDraft,
} from "@/lib/ai/lesson-draft-store";
import type { RenderManifest } from "@/lib/render/pipeline";

/**
 * Phase 6 (build order #13) — AI lesson draft endpoints.
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

  const submission = getSubmissionById(id);
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

  const submission = getSubmissionById(id);
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
    existing.status = body.status;
  }

  saveDraft(existing);
  return NextResponse.json(existing);
}
