import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getSubmissionById, deleteSubmission } from "@/lib/submissions";
import { deletePlaybackManifestForSubmission } from "@/lib/lesson/playback-store";
import {
  getVideoAssetForSubmission,
  deleteVideoAssetsForSubmission,
} from "@/lib/video-assets";
import { getDeliveryTokenRepository } from "@/lib/repositories";
import { getStorageAdapter } from "@/lib/storage";

/**
 * DELETE /api/submissions/[id]
 *   Privacy control (Wave 6 Task 4 — PRD §25). Lets a coach permanently
 *   delete a submission AND all of its associated data:
 *     - the submission record itself
 *     - the playback manifest (notes, annotations, AI summary)
 *     - all delivery tokens (magic links) for the submission
 *     - all VideoAsset records for the submission
 *     - the underlying video file in storage (best-effort, non-fatal)
 *
 *   This is distinct from the revoke-link flow (which only invalidates magic
 *   links but preserves the lesson data for re-delivery). Data deletion is
 *   irreversible and removes everything.
 *
 *   Pre-conditions:
 *   - Valid coach session (401 if not authenticated).
 *   - Submission must belong to the signed-in coach (403 otherwise).
 *   - Submission must exist (404 otherwise).
 *
 *   Cascade strategy: each associated-data deletion is wrapped in its own
 *   try/catch so a failure in one cleanup step (e.g. storage adapter down)
 *   does not block the others. The submission record is deleted LAST — if
 *   any earlier step throws, the submission is preserved so the coach can
 *   retry. Storage-file deletion is non-fatal by design (the record deletion
 *   is the authoritative "forgotten" signal; orphaned storage objects can be
 *   GC'd later).
 */
export async function DELETE(
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

  // 1. Video asset + underlying storage file (best-effort).
  try {
    const videoAsset = await getVideoAssetForSubmission(id);
    if (videoAsset) {
      try {
        await getStorageAdapter().delete("videos", videoAsset.storageKey);
      } catch (err) {
        // Non-fatal: the record deletion below is the authoritative signal.
        // Orphaned storage objects can be GC'd later.
        console.error(
          `[delete] storage delete failed for submission ${id}:`,
          err,
        );
      }
      await deleteVideoAssetsForSubmission(id);
    }
  } catch (err) {
    console.error(
      `[delete] video asset cleanup failed for submission ${id}:`,
      err,
    );
  }

  // 2. Delivery tokens (magic links) — hard delete.
  try {
    await getDeliveryTokenRepository().deleteForSubmission(id);
  } catch (err) {
    console.error(
      `[delete] delivery token cleanup failed for submission ${id}:`,
      err,
    );
  }

  // 3. Playback manifest (notes, annotations, AI summary).
  try {
    await deletePlaybackManifestForSubmission(id);
  } catch (err) {
    console.error(
      `[delete] playback manifest cleanup failed for submission ${id}:`,
      err,
    );
  }

  // 4. Submission record itself (deleted LAST — if any earlier step threw
  //    uncaught, the submission is preserved for retry).
  await deleteSubmission(id);

  return NextResponse.json({ ok: true, submissionId: id });
}
