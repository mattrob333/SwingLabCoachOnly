/**
 * Supabase video asset repository (Wave 2 Task 1).
 *
 * Real PostgREST queries against the `video_assets` table. Maps between the
 * TypeScript `VideoAsset` domain type (camelCase, `uploadedAt` as a Date)
 * and the Postgres row shape (snake_case, `uploaded_at` as ISO timestamp,
 * `size_bytes` as BIGINT, `storage_provider` as a Postgres enum that maps
 * 1:1 to the TS `StorageProvider` union).
 *
 * The factory only returns this impl when `isLive("database")` is true.
 */

import { asObject, asArray, postgrestRequest } from "./supabase-client";
import type {
  VideoAsset,
  StorageProvider,
} from "@/lib/records";
import type {
  VideoAssetRecordInput,
  VideoAssetRepository,
} from "./types";

/** Postgres row shape for the `video_assets` table (snake_case). */
type VideoAssetRow = {
  id: string;
  submission_id: string;
  coach_slug: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  storage_provider: StorageProvider;
  duration_sec: number | null;
  uploaded_at: string; // ISO timestamp
};

/** Map a Postgres row to the TS domain type. */
function rowToVideoAsset(row: VideoAssetRow): VideoAsset {
  const asset: VideoAsset = {
    id: row.id,
    submissionId: row.submission_id,
    coachSlug: row.coach_slug,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storageKey: row.storage_key,
    storageProvider: row.storage_provider,
    uploadedAt: new Date(row.uploaded_at).getTime(),
  };
  if (row.duration_sec !== null) {
    asset.durationSec = row.duration_sec;
  }
  return asset;
}

/** Map a VideoAssetRecordInput to a Postgres insert row (without the id —
 * PostgREST returns the row with the server-generated id when
 * `Prefer: return=representation` is set). The id is generated server-side
 * by default, but we send an explicit id (matching the in-memory pattern)
 * so the client and server agree on the record id. */
function inputToRow(input: VideoAssetRecordInput): Record<string, unknown> {
  return {
    submission_id: input.submissionId,
    coach_slug: input.coachSlug,
    original_filename: input.originalFilename,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    storage_key: input.storageKey,
    storage_provider: input.storageProvider,
    ...(input.durationSec !== undefined ? { duration_sec: input.durationSec } : {}),
    uploaded_at: new Date(input.uploadedAt ?? Date.now()).toISOString(),
  };
}

export class SupabaseVideoAssetRepository implements VideoAssetRepository {
  readonly mode = "live" as const;

  async create(input: VideoAssetRecordInput): Promise<VideoAsset> {
    const row = inputToRow(input);
    const result = await postgrestRequest("video_assets", {
      method: "POST",
      body: row,
      single: true,
    });
    const created = asObject<VideoAssetRow>(result);
    if (!created) {
      throw new Error("[supabase-video-assets] create returned no row");
    }
    return rowToVideoAsset(created);
  }

  async getForSubmission(submissionId: string): Promise<VideoAsset | undefined> {
    const result = await postgrestRequest("video_assets", {
      method: "GET",
      query: {
        submission_id: `eq.${submissionId}`,
        order: "uploaded_at.desc",
        limit: "1",
      },
      single: true,
    });
    const row = asObject<VideoAssetRow>(result);
    return row ? rowToVideoAsset(row) : undefined;
  }

  async getById(id: string): Promise<VideoAsset | undefined> {
    const result = await postgrestRequest("video_assets", {
      method: "GET",
      query: { id: `eq.${id}` },
      single: true,
    });
    const row = asObject<VideoAssetRow>(result);
    return row ? rowToVideoAsset(row) : undefined;
  }

  async listForCoach(coachSlug: string): Promise<VideoAsset[]> {
    const result = await postgrestRequest("video_assets", {
      method: "GET",
      query: {
        coach_slug: `eq.${coachSlug}`,
        order: "uploaded_at.desc",
      },
    });
    return asArray<VideoAssetRow>(result).map(rowToVideoAsset);
  }

  async deleteForSubmission(submissionId: string): Promise<void> {
    // Idempotent: PostgREST DELETE on zero matching rows is a no-op. Does NOT
    // delete the underlying storage object — the route handler must call the
    // storage adapter's delete() first.
    await postgrestRequest("video_assets", {
      method: "DELETE",
      query: { submission_id: `eq.${submissionId}` },
    });
  }
}
