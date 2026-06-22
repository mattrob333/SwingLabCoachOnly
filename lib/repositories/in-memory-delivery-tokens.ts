/**
 * In-memory delivery token repository (Wave 2 Task 4 Sub-slice B).
 *
 * Stores LessonDeliveryToken records in a module-level array. The array is
 * exported (DELIVERY_TOKENS) so tests can reset it and so any future facade
 * can re-export the same reference — keeping test resets visible to the
 * singleton instance returned by the factory.
 *
 * All methods are async to match the repository interface (which must be
 * async to support Supabase fetch queries). The in-memory impl is synchronous
 * in practice — async just wraps the return in a Promise.
 *
 * The `createLessonDeliveryToken` factory from `lib/records` is used to
 * validate inputs and produce the canonical record shape (id, token,
 * timestamps, defaults).
 */

import {
  createLessonDeliveryToken,
  type LessonDeliveryToken,
} from "@/lib/records";
import type {
  DeliveryTokenCreateInput,
  DeliveryTokenRepository,
} from "./types";

/** In-memory store. Resets on deploy — fine for MVP. Exported for test reset. */
export const DELIVERY_TOKENS: LessonDeliveryToken[] = [];

export class InMemoryDeliveryTokenRepository
  implements DeliveryTokenRepository
{
  readonly mode = "mock" as const;

  async create(input: DeliveryTokenCreateInput): Promise<LessonDeliveryToken> {
    const token = createLessonDeliveryToken(input);
    DELIVERY_TOKENS.push(token);
    return token;
  }

  async getByToken(token: string): Promise<LessonDeliveryToken | undefined> {
    return DELIVERY_TOKENS.find((t) => t.token === token);
  }

  async getBySubmissionId(
    submissionId: string,
  ): Promise<LessonDeliveryToken[]> {
    // Newest-first by createdAt, with insertion-order tiebreak for
    // same-millisecond tokens (later push = newer).
    return DELIVERY_TOKENS.map((t, index) => ({ t, index }))
      .filter(({ t }) => t.submissionId === submissionId)
      .sort((x, y) => {
        const dt = y.t.createdAt - x.t.createdAt;
        if (dt !== 0) return dt;
        return y.index - x.index; // later insertion = newer
      })
      .map(({ t }) => t);
  }

  async markViewed(id: string): Promise<LessonDeliveryToken> {
    const token = DELIVERY_TOKENS.find((t) => t.id === id);
    if (!token) {
      throw new Error(`[delivery-tokens] markViewed: token ${id} not found`);
    }
    token.viewedAt = Date.now();
    return token;
  }

  async revoke(id: string): Promise<LessonDeliveryToken> {
    const token = DELIVERY_TOKENS.find((t) => t.id === id);
    if (!token) {
      throw new Error(`[delivery-tokens] revoke: token ${id} not found`);
    }
    token.revokedAt = Date.now();
    return token;
  }

  async deleteForSubmission(submissionId: string): Promise<void> {
    // Remove all token records matching the submission, in place (preserves
    // the exported DELIVERY_TOKENS array reference that tests reset).
    for (let i = DELIVERY_TOKENS.length - 1; i >= 0; i--) {
      if (DELIVERY_TOKENS[i].submissionId === submissionId) {
        DELIVERY_TOKENS.splice(i, 1);
      }
    }
    // Idempotent: no error if no tokens existed.
  }
}
