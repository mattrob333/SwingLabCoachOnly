/**
 * Earning domain facade (Wave 1 Task 5 — async since Task 7).
 *
 * Re-exports types and the in-memory earning array (for test reset).
 * Delegates data-access free functions through the env-gated repository
 * factory. All functions are async to match the repository interface.
 */

export type { Earning, EarningInput } from "@/lib/repositories/types";

import { getEarningRepository } from "@/lib/repositories";
import type { Earning, EarningInput } from "@/lib/repositories/types";

/** In-memory store. Exported for test reset. */
export { EARNINGS } from "@/lib/repositories/in-memory-earnings";

/** Record an earning for a completed submission. Idempotent per submission. */
export async function recordEarning(input: EarningInput): Promise<Earning> {
  return getEarningRepository().record(input);
}

/** Look up the earning (if any) recorded for a submission id. */
export async function getEarningForSubmission(
  submissionId: string,
): Promise<Earning | undefined> {
  return getEarningRepository().getForSubmission(submissionId);
}

/** All earnings for a coach, newest-first. */
export async function getEarningsForCoach(
  coachSlug: string,
): Promise<Earning[]> {
  return getEarningRepository().getForCoach(coachSlug);
}

/** Sum of all earnings for a coach, in USD. Returns 0 when none. */
export async function getTotalEarningsForCoach(
  coachSlug: string,
): Promise<number> {
  return getEarningRepository().getTotalForCoach(coachSlug);
}
