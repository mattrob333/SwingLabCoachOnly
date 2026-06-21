import { NextRequest, NextResponse } from "next/server";
import {
  getSubmissionById,
  markSubmissionRendering,
  markSubmissionCompleted,
} from "@/lib/submissions";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import {
  buildRenderManifest,
  type RenderInput,
} from "@/lib/render/pipeline";
import { RENDER_MANIFESTS } from "@/lib/render/store";

/**
 * Phase 6 — Render endpoint.
 *
 * POST /api/submissions/[id]/render
 * Accepts the coach's complete review session (video URL, voiceover segments,
 * annotation strokes, event log), composes a render manifest, stores it, and
 * transitions the submission through rendering → completed.
 *
 * Coach-only: requires a valid session cookie, and the submission must belong
 * to the signed-in coach. The submission must be `in_review`.
 *
 * MVP: the manifest is the deliverable. Actual server-side video compositing
 * is out of scope; a future render worker consumes the stored manifest.
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (submission.status !== "in_review") {
    return NextResponse.json(
      { error: `Submission is ${submission.status}, not in_review` },
      { status: 409 },
    );
  }

  let input: RenderInput;
  try {
    input = (await request.json()) as RenderInput;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!input.videoUrl || input.videoUrl.trim().length === 0) {
    return NextResponse.json(
      { error: "videoUrl is required" },
      { status: 400 },
    );
  }

  // Transition to rendering
  markSubmissionRendering(id);

  try {
    const manifest = buildRenderManifest(input);
    RENDER_MANIFESTS.push({ ...manifest, submissionId: id });

    // Transition to completed (MVP: immediate)
    markSubmissionCompleted(id);

    return NextResponse.json(manifest);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to build render manifest",
      },
      { status: 500 },
    );
  }
}
