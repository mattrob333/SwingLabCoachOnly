/**
 * In-memory video asset repository (Wave 2 Task 1).
 *
 * Stores VideoAsset records in a module-level array. The array is exported
 * (VIDEO_ASSETS) so tests can reset it, and so the facade in
 * `lib/video-assets.ts` can re-export the same reference — keeping test
 * resets visible to the singleton instance returned by the factory.
 *
 * All methods are async to match the repository interface (which must be
 * async to support Supabase fetch queries). The in-memory impl is
 * synchronous in practice — async just wraps the return in a Promise.
 *
 * The `createVideoAsset` factory from `lib/records` is used to validate
 * inputs and produce the canonical record shape (id, timestamps, defaults).
 */

import {
  createVideoAsset,
  type VideoAsset,
} from "@/lib/records";
import type {
  VideoAssetRecordInput,
  VideoAssetRepository,
} from "./types";

/** In-memory store. Resets on deploy — fine for MVP. Exported for test reset. */
export const VIDEO_ASSETS: VideoAsset[] = [];

export class InMemoryVideoAssetRepository implements VideoAssetRepository {
  readonly mode = "mock" as const;

  async create(input: VideoAssetRecordInput): Promise<VideoAsset> {
    const asset = createVideoAsset(input);
    VIDEO_ASSETS.push(asset);
    return asset;
  }

  async getForSubmission(submissionId: string): Promise<VideoAsset | undefined> {
    // Return the most recent asset for the submission (newest uploadedAt,
    // insertion-order tiebreak for same-millisecond uploads).
    const matches = VIDEO_ASSETS.map((a, index) => ({ a, index }))
      .filter(({ a }) => a.submissionId === submissionId)
      .sort((x, y) => {
        const dt = y.a.uploadedAt - x.a.uploadedAt;
        if (dt !== 0) return dt;
        return y.index - x.index; // later insertion = newer
      })
      .map(({ a }) => a);
    return matches[0];
  }

  async getById(id: string): Promise<VideoAsset | undefined> {
    return VIDEO_ASSETS.find((a) => a.id === id);
  }

  async listForCoach(coachSlug: string): Promise<VideoAsset[]> {
    return VIDEO_ASSETS.map((a, index) => ({ a, index }))
      .filter(({ a }) => a.coachSlug === coachSlug)
      .sort((x, y) => {
        const dt = y.a.uploadedAt - x.a.uploadedAt;
        if (dt !== 0) return dt;
        return y.index - x.index; // later insertion = newer
      })
      .map(({ a }) => a);
  }

  async deleteForSubmission(submissionId: string): Promise<void> {
    // Remove all VideoAsset records matching the submission. Mutating the
    // exported array in place keeps the same reference visible to tests
    // (VIDEO_ASSETS.length = 0 resets) and to the facade re-export.
    for (let i = VIDEO_ASSETS.length - 1; i >= 0; i--) {
      if (VIDEO_ASSETS[i].submissionId === submissionId) {
        VIDEO_ASSETS.splice(i, 1);
      }
    }
    // Idempotent: no error if no assets existed.
  }
}
