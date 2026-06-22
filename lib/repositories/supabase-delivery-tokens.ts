/**
 * Supabase delivery token repository (Wave 2 Task 4 Sub-slice B).
 *
 * STUB — throws "not implemented" on all methods. The real PostgREST impl
 * will be filled in following the same pattern as the other Supabase impls
 * (supabase-video-assets.ts, etc.) in a follow-up sub-slice. The factory
 * only returns this impl when `isLive("database")` is true.
 *
 * The `lesson_delivery_tokens` table already exists in the schema
 * (supabase/migrations/0001_initial_schema.sql) with columns:
 *   id TEXT PK, submission_id TEXT, token TEXT UNIQUE, parent_email TEXT,
 *   created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, viewed_at TIMESTAMPTZ,
 *   revoked_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
 */

import type {
  DeliveryTokenCreateInput,
  DeliveryTokenRepository,
} from "./types";
import type { LessonDeliveryToken } from "@/lib/records";

const NOT_IMPL = (method: string) =>
  `[supabase-delivery-tokens] ${method}: not implemented yet (Wave 2 Task 4 Sub-slice B stub)`;

export class SupabaseDeliveryTokenRepository
  implements DeliveryTokenRepository
{
  readonly mode = "live" as const;

  async create(_input: DeliveryTokenCreateInput): Promise<LessonDeliveryToken> {
    throw new Error(NOT_IMPL("create"));
  }

  async getByToken(_token: string): Promise<LessonDeliveryToken | undefined> {
    throw new Error(NOT_IMPL("getByToken"));
  }

  async getBySubmissionId(
    _submissionId: string,
  ): Promise<LessonDeliveryToken[]> {
    throw new Error(NOT_IMPL("getBySubmissionId"));
  }

  async markViewed(_id: string): Promise<LessonDeliveryToken> {
    throw new Error(NOT_IMPL("markViewed"));
  }

  async revoke(_id: string): Promise<LessonDeliveryToken> {
    throw new Error(NOT_IMPL("revoke"));
  }
}
