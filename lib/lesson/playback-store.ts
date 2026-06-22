/**
 * Playback manifest store facade (Wave 1 Task 5).
 *
 * Re-exports the in-memory manifest array (for test reset) and delegates
 * data-access free functions through the env-gated repository factory.
 */

import { getPlaybackManifestRepository } from "@/lib/repositories";
import type { LessonPlaybackManifest } from "@/lib/lesson/playback";
import type { StoredPlaybackManifest } from "@/lib/repositories/types";

/** In-memory store. Exported for test reset. */
export { PLAYBACK_MANIFESTS } from "@/lib/repositories/in-memory-playback";

export function getPlaybackManifestForSubmission(
  submissionId: string,
): StoredPlaybackManifest | undefined {
  return getPlaybackManifestRepository().getForSubmission(submissionId);
}

export function savePlaybackManifest(
  submissionId: string,
  manifest: LessonPlaybackManifest,
): StoredPlaybackManifest {
  return getPlaybackManifestRepository().save(submissionId, manifest);
}
