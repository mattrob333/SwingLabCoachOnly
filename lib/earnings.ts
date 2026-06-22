/**
 * Earning domain facade (Wave 1 Task 5).
 *
 * Re-exports types and the in-memory earning array (for test reset).
 * Delegates data-access free functions through the env-gated repository
 * factory.
 */

export type { Earning, EarningInput } from "@/lib/repositories/types";

import { getEarningRepository } from "@/lib/repositories";
import type { Earning, EarningInput } from "@/lib/repositories/types";

/** In-memory store. Exported for test reset. */
export { EARNINGS } from "@/lib/repositories/in-memory-earnings";

/** Record an earning for a completed submission. Idempotent per submission. */
export function recordEarning(input: EarningInput): Earning {
  return getEarningRepository().record(input);
}

/** Look up the earning (if any) recorded for a submission id. */
export function getEarningForSubmission(
  submissionId: string,
): Earning | undefined {
  return getEarningRepository().getForSubmission(submissionId);
}

/** All earnings for a coach, newest-first. */
export function getEarningsForCoach(coachSlug: string): Earning[] {
  return getEarningRepository().getForCoach(coachSlug);
}

/** Sum of all earnings for a coach, in USD. Returns 0 when none. */
export function getTotalEarningsForCoach(coachSlug: string): number {
  return getEarningRepository().getTotalForCoach(coachSlug);
}
