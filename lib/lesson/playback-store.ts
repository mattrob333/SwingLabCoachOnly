/**
 * Playback manifest store facade (Wave 1 Task 5 — async since Task 7).
 *
 * Re-exports the in-memory manifest array (for test reset) and delegates
 * data-access free functions through the env-gated repository factory.
 * All functions are async to match the repository interface.
 */

import { getPlaybackManifestRepository } from "@/lib/repositories";
import type { LessonPlaybackManifest } from "@/lib/lesson/playback";
import type { StoredPlaybackManifest } from "@/lib/repositories/types";

/** In-memory store. Exported for test reset. */
export { PLAYBACK_MANIFESTS } from "@/lib/repositories/in-memory-playback";

export async function getPlaybackManifestForSubmission(
  submissionId: string,
): Promise<StoredPlaybackManifest | undefined> {
  return getPlaybackManifestRepository().getForSubmission(submissionId);
}

export async function savePlaybackManifest(
  submissionId: string,
  manifest: LessonPlaybackManifest,
): Promise<StoredPlaybackManifest> {
  return getPlaybackManifestRepository().save(submissionId, manifest);
}
