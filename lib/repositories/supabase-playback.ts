/**
 * Supabase playback manifest repository (Wave 1 Slice D).
 *
 * Real PostgREST queries against the `playback_manifests` table. The full
 * `LessonPlaybackManifest` object is stored as JSONB in the `manifest` column.
 * Denormalized columns (coach_slug, parent_email, delivery_token_id, version,
 * status, processed_at, ai_summary) are populated from the manifest for
 * efficient querying but the manifest JSONB is the source of truth.
 *
 * The TS `StoredPlaybackManifest` type is `LessonPlaybackManifest & { submissionId: string }`.
 * When reading, the `submission_id` column (authoritative) is merged into the
 * manifest object. When writing, the manifest's own fields are extracted into
 * the denormalized columns.
 */

import { randomUUID } from "node:crypto";
import { asObject, postgrestRequest } from "./supabase-client";
import type {
  PlaybackManifestRepository,
  StoredPlaybackManifest,
} from "./types";
import type { LessonPlaybackManifest } from "@/lib/lesson/playback";

/** Postgres row shape for the `playback_manifests` table (snake_case). */
type ManifestRow = {
  id: string;
  submission_id: string;
  coach_slug: string | null;
  parent_email: string | null;
  delivery_token_id: string | null;
  manifest: LessonPlaybackManifest;
  version: number;
  status: string;
  processed_at: string | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
};

/** Map a Postgres row to the TS stored manifest type. */
function rowToManifest(row: ManifestRow): StoredPlaybackManifest {
  // The manifest JSONB contains all fields from LessonPlaybackManifest.
  // Override submissionId with the authoritative column value.
  return { ...row.manifest, submissionId: row.submission_id };
}

/** Build the Postgres insert/update body from a manifest. */
function manifestToRow(
  submissionId: string,
  manifest: LessonPlaybackManifest,
): Record<string, unknown> {
  return {
    id: randomUUID(),
    submission_id: submissionId,
    coach_slug: manifest.coachSlug ?? null,
    parent_email: manifest.parentEmail ?? null,
    delivery_token_id: manifest.deliveryTokenId ?? null,
    manifest,
    version: manifest.version ?? 1,
    status: manifest.status ?? "draft",
    processed_at: manifest.processedAt
      ? new Date(manifest.processedAt).toISOString()
      : null,
    ai_summary: manifest.aiSummary ?? null,
  };
}

export class SupabasePlaybackManifestRepository
  implements PlaybackManifestRepository
{
  readonly mode = "live" as const;

  async getForSubmission(
    submissionId: string,
  ): Promise<StoredPlaybackManifest | undefined> {
    const result = await postgrestRequest("playback_manifests", {
      method: "GET",
      query: { submission_id: `eq.${submissionId}` },
      single: true,
    });
    const row = asObject<ManifestRow>(result);
    return row ? rowToManifest(row) : undefined;
  }

  async save(
    submissionId: string,
    manifest: LessonPlaybackManifest,
  ): Promise<StoredPlaybackManifest> {
    // Check if a manifest already exists for this submission (upsert behavior).
    const existing = await this.getForSubmission(submissionId);

    if (existing) {
      // Update: PATCH the existing row. Don't generate a new ID.
      const updateBody: Record<string, unknown> = {
        coach_slug: manifest.coachSlug ?? null,
        parent_email: manifest.parentEmail ?? null,
        delivery_token_id: manifest.deliveryTokenId ?? null,
        manifest,
        version: manifest.version ?? 1,
        status: manifest.status ?? "draft",
        processed_at: manifest.processedAt
          ? new Date(manifest.processedAt).toISOString()
          : null,
        ai_summary: manifest.aiSummary ?? null,
      };
      const result = await postgrestRequest("playback_manifests", {
        method: "PATCH",
        query: { submission_id: `eq.${submissionId}` },
        body: updateBody,
        single: true,
      });
      const row = asObject<ManifestRow>(result);
      if (!row) {
        throw new Error(
          `[supabase-playback] save update returned no row for submission ${submissionId}`,
        );
      }
      return rowToManifest(row);
    }

    // Insert: new manifest row.
    const result = await postgrestRequest("playback_manifests", {
      method: "POST",
      body: manifestToRow(submissionId, manifest),
      single: true,
    });
    const row = asObject<ManifestRow>(result);
    if (!row) {
      throw new Error(
        `[supabase-playback] save insert returned no row for submission ${submissionId}`,
      );
    }
    return rowToManifest(row);
  }
}
