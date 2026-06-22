import { NextRequest, NextResponse } from "next/server";
import { getCoachBySlug } from "@/lib/coaches";
import { recordEarning } from "@/lib/earnings";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import {
  buildLessonPlaybackManifest,
  type LessonPlaybackInput,
} from "@/lib/lesson/playback";
import {
  getPlaybackManifestForSubmission,
  savePlaybackManifest,
} from "@/lib/lesson/playback-store";
import {
  getSubmissionById,
  markSubmissionCompleted,
  markSubmissionRendering,
} from "@/lib/submissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const manifest = await getPlaybackManifestForSubmission(id);
  if (!manifest) {
    return NextResponse.json(
      { error: "No playback lesson found for this submission" },
      { status: 404 },
    );
  }
  return NextResponse.json(manifest);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
  if (submission.status !== "in_review" && submission.status !== "completed") {
    return NextResponse.json(
      { error: `Submission is ${submission.status}, not in_review` },
      { status: 409 },
    );
  }

  let input: LessonPlaybackInput;
  try {
    input = (await request.json()) as LessonPlaybackInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const manifest = buildLessonPlaybackManifest({
      ...input,
      submissionId: id,
      coachSlug: submission.coachSlug,
      parentEmail: submission.parentEmail,
    });
    const stored = await savePlaybackManifest(id, manifest);

    if (submission.status === "in_review") {
      await markSubmissionRendering(id);
      await markSubmissionCompleted(id);
    }

    const coach = await getCoachBySlug(submission.coachSlug);
    if (coach) {
      await recordEarning({
        submissionId: id,
        coachSlug: coach.slug,
        amountUsd: coach.priceUsd,
        parentEmail: submission.parentEmail,
      });
    }

    return NextResponse.json(stored);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to process playback lesson",
      },
      { status: 400 },
    );
  }
}
