import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getSubmissionById } from "@/lib/submissions";
import { getCoachBySlug } from "@/lib/coaches";
import {
  getPlaybackManifestForSubmission,
  savePlaybackManifest,
} from "@/lib/lesson/playback-store";
import { getPackagingAdapter } from "@/lib/packaging";
import type { PackageInput } from "@/lib/packaging";

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

  // Load the stored manifest — packaging requires transcribed notes.
  const manifest = await getPlaybackManifestForSubmission(id);
  if (!manifest) {
    return NextResponse.json(
      { error: "No lesson manifest found for this submission" },
      { status: 404 },
    );
  }

  // Look up coach display name for the summary context.
  const coach = await getCoachBySlug(session.coachSlug);

  const packageInput: PackageInput = {
    submissionId: id,
    manifest,
    coachName: coach?.name,
  };

  const adapter = getPackagingAdapter();
  const result = await adapter.package(packageInput);

  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  // Persist the AI-generated titles + summary onto the manifest.
  manifest.aiSummary = result.summary ?? undefined;
  manifest.aiNoteTitles = result.noteTitles ?? undefined;

  const { ...manifestData } = manifest;
  await savePlaybackManifest(id, manifestData);

  return NextResponse.json(result);
}
