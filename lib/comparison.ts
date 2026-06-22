import { getSubmissionById, getFollowUpsForSubmission } from "@/lib/submissions";
import { getManifestForSubmission } from "@/lib/render/store";
import type { Submission } from "@/lib/submissions";

/**
 * Phase 10 — Comparison mode (PRD §31 build order #20).
 *
 * Lets a coach view an original swing and a follow-up swing side by side to
 * assess a player's progress after a lesson. Both submissions must have a
 * completed render manifest (i.e. the coach has finished the review and the
 * lesson was rendered) — comparison is about comparing finished lessons, not
 * raw uploads.
 *
 * Guardrail: web-first, coach-only. Pure functions, no I/O, fully testable.
 */

/** One side of a comparison — a submission plus its rendered lesson video URL. */
export type ComparisonSide = {
  submission: Submission;
  /** The rendered lesson video URL from the submission's render manifest. */
  videoUrl: string;
};

/** A validated pair of swings ready for side-by-side comparison. */
export type ComparisonPair = {
  original: ComparisonSide;
  followUp: ComparisonSide;
};

/**
 * Resolve and validate a comparison pair.
 *
 * Throws if:
 *   - the original submission doesn't exist
 *   - the follow-up submission doesn't exist
 *   - the follow-up is not linked to the original (followUpFor mismatch)
 *   - either submission has no render manifest (lesson not rendered yet)
 */
export async function getComparisonPair(
  originalId: string,
  followUpId: string,
): Promise<ComparisonPair> {
  const original = await getSubmissionById(originalId);
  if (!original) {
    throw new Error(`Original submission not found: ${originalId}`);
  }

  const followUp = await getSubmissionById(followUpId);
  if (!followUp) {
    throw new Error(`Follow-up submission not found: ${followUpId}`);
  }

  if (followUp.followUpFor !== originalId) {
    throw new Error(
      `Submission ${followUpId} is not a follow-up of ${originalId}`,
    );
  }

  const originalManifest = getManifestForSubmission(originalId);
  if (!originalManifest) {
    throw new Error(
      `Original submission has no rendered lesson: ${originalId}`,
    );
  }

  const followUpManifest = getManifestForSubmission(followUpId);
  if (!followUpManifest) {
    throw new Error(
      `Follow-up submission has no rendered lesson: ${followUpId}`,
    );
  }

  return {
    original: { submission: original, videoUrl: originalManifest.videoUrl },
    followUp: { submission: followUp, videoUrl: followUpManifest.videoUrl },
  };
}

/**
 * List all follow-up submissions of an original that have a completed render
 * manifest, newest-first. These are the swings the coach can compare against
 * the original.
 *
 * Sort is by createdAt descending; ties (same-millisecond creations) are
 * broken by store insertion order (later push = newer) so ordering is
 * deterministic regardless of timestamp resolution.
 */
export async function listComparisonCandidates(
  originalId: string,
): Promise<ComparisonSide[]> {
  // getFollowUpsForSubmission already returns newest-first with an
  // insertion-order tiebreak; filtering preserves that order, so no re-sort.
  return (await getFollowUpsForSubmission(originalId))
    .map((s) => {
      const manifest = getManifestForSubmission(s.id);
      return manifest ? { submission: s, videoUrl: manifest.videoUrl } : null;
    })
    .filter((c): c is ComparisonSide => c !== null);
}
