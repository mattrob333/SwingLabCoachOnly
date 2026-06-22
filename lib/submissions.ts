/**
 * Submission domain facade (Wave 1 Task 5).
 *
 * This module re-exports the public types, validation helper, and in-memory
 * array (for test reset), and delegates the data-access free functions
 * through the env-gated repository factory. In mock mode (default) the
 * in-memory implementation is used — identical to the pre-Wave-1 behavior.
 * When Supabase keys are added to .env, all calls transparently route to
 * the Supabase repository (currently a stub — Wave 1 Task 6+).
 *
 * All 44 existing import sites continue to work unchanged because the
 * exported names and types are identical.
 */

export type {
  Submission,
  SubmissionInput,
  SubmissionStatus,
} from "@/lib/repositories/types";
export { validateSubmissionInput } from "@/lib/repositories/types";

import { getSubmissionRepository } from "@/lib/repositories";
import type { Submission, SubmissionInput } from "@/lib/repositories/types";

/** In-memory store. Exported for test reset (SUBMISSIONS.length = 0). */
export { SUBMISSIONS } from "@/lib/repositories/in-memory-submissions";

/** Create a new submission. Always starts as `pending_payment`. */
export function createSubmission(input: SubmissionInput): Submission {
  return getSubmissionRepository().create(input);
}

/** Look up a submission by id. */
export function getSubmissionById(id: string): Submission | undefined {
  return getSubmissionRepository().getById(id);
}

/**
 * Get all follow-up submissions linked to an original submission id.
 * Returns newest-first.
 */
export function getFollowUpsForSubmission(originalId: string): Submission[] {
  return getSubmissionRepository().getFollowUpsFor(originalId);
}

/** All submissions for a given coach, newest first. */
export function getSubmissionsForCoach(coachSlug: string): Submission[] {
  return getSubmissionRepository().getForCoach(coachSlug);
}

/** Mark a submission as paid. Only transitions from `pending_payment` → `paid`. */
export function markSubmissionPaid(id: string): Submission {
  return getSubmissionRepository().markPaid(id);
}

/** Mark a paid submission as in_review. Only transitions from `paid` → `in_review`. */
export function markSubmissionInReview(id: string): Submission {
  return getSubmissionRepository().markInReview(id);
}

/** Mark an in_review submission as rendering. Only transitions from `in_review` → `rendering`. */
export function markSubmissionRendering(id: string): Submission {
  return getSubmissionRepository().markRendering(id);
}

/** Mark a rendering submission as completed. Only transitions from `rendering` → `completed`. */
export function markSubmissionCompleted(id: string): Submission {
  return getSubmissionRepository().markCompleted(id);
}
