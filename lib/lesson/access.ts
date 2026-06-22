/**
 * Wave 2 Task 4 Sub-slice D part 2 — Lesson access token verification.
 *
 * `verifyLessonAccess()` is the consumer-facing magic-link access gate used by
 * the `/lesson/[id]` page. It composes the repository lookup
 * (`getDeliveryTokenRepository().getByToken`) with the pure
 * `verifyDeliveryToken` validity check, enforces that the token belongs to the
 * requested submission, and idempotently marks the token as viewed on first
 * access.
 *
 * Result discriminated union:
 *   - { ok: true,  token }                   → grant access
 *   - { ok: false, reason: "missing" }       → no token in the URL
 *   - { ok: false, reason: "not_found" }     → token record doesn't exist
 *   - { ok: false, reason: "expired" }       → token past its expiry
 *   - { ok: false, reason: "revoked" }       → token explicitly revoked
 *   - { ok: false, reason: "mismatch" }      → token valid but for a different submission
 *
 * The `markViewed` side effect is idempotent (only fired when `viewedAt` is
 * unset) and non-fatal (a failure is swallowed — access is the primary
 * operation; viewing is a retryable side effect).
 */
import {
  getDeliveryTokenRepository,
  verifyDeliveryToken,
} from "@/lib/repositories";
import type { LessonDeliveryToken } from "@/lib/records";

export type LessonAccessDeniedReason =
  | "missing"
  | "not_found"
  | "expired"
  | "revoked"
  | "mismatch";

export type LessonAccessResult =
  | { ok: true; token: LessonDeliveryToken }
  | { ok: false; reason: LessonAccessDeniedReason };

/**
 * Verify a parent's magic-link access to a lesson.
 *
 * @param params.submissionId The submission id from the route (`/lesson/[id]`).
 * @param params.token        The opaque token from the query string (`?token=…`).
 */
export async function verifyLessonAccess(params: {
  submissionId: string;
  token?: string | null;
}): Promise<LessonAccessResult> {
  const { submissionId, token } = params;

  if (!token || token.trim().length === 0) {
    return { ok: false, reason: "missing" };
  }

  const repo = getDeliveryTokenRepository();
  const record = await repo.getByToken(token);

  const verification = verifyDeliveryToken(record);
  if (verification === undefined) {
    return { ok: false, reason: "not_found" };
  }
  if (!verification.valid) {
    return { ok: false, reason: verification.reason ?? "not_found" };
  }

  // record is non-null here (verifyDeliveryToken only returns undefined for
  // null/undefined input).
  if (record!.submissionId !== submissionId) {
    return { ok: false, reason: "mismatch" };
  }

  // Idempotent mark-viewed: only on first access.
  if (record!.viewedAt === undefined) {
    try {
      await repo.markViewed(record!.id);
    } catch {
      // Non-fatal — access is granted; viewing is a retryable side effect.
    }
  }

  return { ok: true, token: record! };
}
