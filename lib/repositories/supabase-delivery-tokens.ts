/**
 * Supabase delivery token repository (Wave 2 Task 4 Sub-slice D).
 *
 * Real PostgREST queries against the `lesson_delivery_tokens` table. Maps
 * between the TypeScript `LessonDeliveryToken` domain type (camelCase,
 * epoch-ms timestamps via `Date.getTime()`) and the Postgres row shape
 * (snake_case, ISO `TIMESTAMPTZ` strings, nullable `viewed_at`/`revoked_at`).
 *
 * On `create`, the opaque token + id + timestamps are generated client-side
 * via `createLessonDeliveryToken()` (mirrors the in-memory impl) and sent in
 * the POST body — the `token` column is `TEXT UNIQUE` and must be the exact
 * opaque string the coach emailed to the parent, so the server cannot
 * regenerate it. `viewed_at`/`revoked_at` are never sent on create (they
 * default to NULL); they are set only by `markViewed`/`revoke` PATCH calls.
 *
 * The factory only returns this impl when `isLive("database")` is true.
 */

import { asArray, asObject, postgrestRequest } from "./supabase-client";
import {
  createLessonDeliveryToken,
  type LessonDeliveryToken,
} from "@/lib/records";
import type {
  DeliveryTokenCreateInput,
  DeliveryTokenRepository,
} from "./types";

/** Postgres row shape for the `lesson_delivery_tokens` table (snake_case). */
type DeliveryTokenRow = {
  id: string;
  submission_id: string;
  token: string;
  parent_email: string;
  created_at: string; // ISO timestamp
  expires_at: string; // ISO timestamp
  viewed_at: string | null;
  revoked_at: string | null;
};

/** Map a Postgres row to the TS domain type (epoch ms, nullable → optional). */
function rowToToken(row: DeliveryTokenRow): LessonDeliveryToken {
  const token: LessonDeliveryToken = {
    id: row.id,
    submissionId: row.submission_id,
    token: row.token,
    parentEmail: row.parent_email,
    createdAt: new Date(row.created_at).getTime(),
    expiresAt: new Date(row.expires_at).getTime(),
  };
  if (row.viewed_at !== null) {
    token.viewedAt = new Date(row.viewed_at).getTime();
  }
  if (row.revoked_at !== null) {
    token.revokedAt = new Date(row.revoked_at).getTime();
  }
  return token;
}

export class SupabaseDeliveryTokenRepository
  implements DeliveryTokenRepository
{
  readonly mode = "live" as const;

  async create(input: DeliveryTokenCreateInput): Promise<LessonDeliveryToken> {
    // Generate the full domain record client-side (id, opaque token,
    // createdAt, expiresAt) — same factory the in-memory impl uses, so the
    // token string emailed to the parent is exactly what's stored in the DB.
    const record = createLessonDeliveryToken(input);
    const result = await postgrestRequest("lesson_delivery_tokens", {
      method: "POST",
      body: {
        id: record.id,
        submission_id: record.submissionId,
        token: record.token,
        parent_email: record.parentEmail,
        created_at: new Date(record.createdAt).toISOString(),
        expires_at: new Date(record.expiresAt).toISOString(),
      },
      single: true,
    });
    const row = asObject<DeliveryTokenRow>(result);
    if (!row) {
      throw new Error("[supabase-delivery-tokens] create returned no row");
    }
    return rowToToken(row);
  }

  async getByToken(token: string): Promise<LessonDeliveryToken | undefined> {
    const result = await postgrestRequest("lesson_delivery_tokens", {
      method: "GET",
      query: { token: `eq.${token}` },
      single: true,
    });
    const row = asObject<DeliveryTokenRow>(result);
    return row ? rowToToken(row) : undefined;
  }

  async getBySubmissionId(
    submissionId: string,
  ): Promise<LessonDeliveryToken[]> {
    const result = await postgrestRequest("lesson_delivery_tokens", {
      method: "GET",
      query: {
        submission_id: `eq.${submissionId}`,
        order: "created_at.desc",
      },
    });
    return asArray<DeliveryTokenRow>(result).map(rowToToken);
  }

  async markViewed(id: string): Promise<LessonDeliveryToken> {
    const result = await postgrestRequest("lesson_delivery_tokens", {
      method: "PATCH",
      query: { id: `eq.${id}` },
      body: { viewed_at: new Date().toISOString() },
      single: true,
    });
    const row = asObject<DeliveryTokenRow>(result);
    if (!row) {
      throw new Error(
        `[supabase-delivery-tokens] markViewed: token ${id} not found`,
      );
    }
    return rowToToken(row);
  }

  async revoke(id: string): Promise<LessonDeliveryToken> {
    const result = await postgrestRequest("lesson_delivery_tokens", {
      method: "PATCH",
      query: { id: `eq.${id}` },
      body: { revoked_at: new Date().toISOString() },
      single: true,
    });
    const row = asObject<DeliveryTokenRow>(result);
    if (!row) {
      throw new Error(
        `[supabase-delivery-tokens] revoke: token ${id} not found`,
      );
    }
    return rowToToken(row);
  }
}
