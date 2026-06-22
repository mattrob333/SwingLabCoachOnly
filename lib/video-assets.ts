/**
 * VideoAsset domain facade (Wave 2 Task 1).
 *
 * Re-exports the public types and the in-memory store (for test reset), and
 * delegates the data-access free functions through the env-gated repository
 * factory. In mock mode (default) the in-memory implementation is used —
 * identical to the pre-Wave-2 behavior. When Supabase keys are added to
 * `.env`, all calls transparently route to the Supabase repository.
 *
 * All functions are async to match the repository interface (which must be
 * async to support Supabase fetch queries).
 */

export type {
  VideoAsset,
  StorageProvider,
} from "@/lib/records";
export type {
  VideoAssetRecordInput,
  VideoAssetRepository,
} from "@/lib/repositories/types";

import type { VideoAsset } from "@/lib/records";
import type { VideoAssetRecordInput } from "@/lib/repositories/types";

/** In-memory store. Exported for test reset (VIDEO_ASSETS.length = 0). */
export { VIDEO_ASSETS } from "@/lib/repositories/in-memory-video-assets";

import { getVideoAssetRepository } from "@/lib/repositories";

/** Persist a new VideoAsset record linked to a submission. */
export async function createVideoAssetRecord(
  input: VideoAssetRecordInput,
): Promise<VideoAsset> {
  return getVideoAssetRepository().create(input);
}

/** Find the (first) video asset linked to a submission. */
export async function getVideoAssetForSubmission(
  submissionId: string,
): Promise<VideoAsset | undefined> {
  return getVideoAssetRepository().getForSubmission(submissionId);
}

/** Fetch a VideoAsset by its record id. */
export async function getVideoAssetById(
  id: string,
): Promise<VideoAsset | undefined> {
  return getVideoAssetRepository().getById(id);
}

/** All video assets for a coach, newest-first. */
export async function listVideoAssetsForCoach(
  coachSlug: string,
): Promise<VideoAsset[]> {
  return getVideoAssetRepository().listForCoach(coachSlug);
}

/**
 * Hard-delete all VideoAsset records for a submission. Idempotent — no error
 * if none exist. Does NOT delete the underlying storage object — callers
 * must call the storage adapter's `delete()` first.
 */
export async function deleteVideoAssetsForSubmission(
  submissionId: string,
): Promise<void> {
  return getVideoAssetRepository().deleteForSubmission(submissionId);
}
