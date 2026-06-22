/**
 * Submission domain facade (Wave 1 Task 5 — async since Task 7).
 *
 * This module re-exports the public types, validation helper, and in-memory
 * array (for test reset), and delegates the data-access free functions
 * through the env-gated repository factory. In mock mode (default) the
 * in-memory implementation is used — identical to the pre-Wave-1 behavior.
 * When Supabase keys are added to .env, all calls transparently route to
 * the Supabase repository (currently a stub — Wave 1 Task 6+).
 *
 * All functions are async to match the repository interface (which must be
 * async to support Supabase fetch queries).
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
export async function createSubmission(
  input: SubmissionInput,
): Promise<Submission> {
  return getSubmissionRepository().create(input);
}

/** Look up a submission by id. */
export async function getSubmissionById(
  id: string,
): Promise<Submission | undefined> {
  return getSubmissionRepository().getById(id);
}

/**
 * Get all follow-up submissions linked to an original submission id.
 * Returns newest-first.
 */
export async function getFollowUpsForSubmission(
  originalId: string,
): Promise<Submission[]> {
  return getSubmissionRepository().getFollowUpsFor(originalId);
}

/** All submissions for a given coach, newest first. */
export async function getSubmissionsForCoach(
  coachSlug: string,
): Promise<Submission[]> {
  return getSubmissionRepository().getForCoach(coachSlug);
}

/** Mark a submission as paid. Only transitions from `pending_payment` → `paid`. */
export async function markSubmissionPaid(id: string): Promise<Submission> {
  return getSubmissionRepository().markPaid(id);
}

/** Mark a paid submission as in_review. Only transitions from `paid` → `in_review`. */
export async function markSubmissionInReview(
  id: string,
): Promise<Submission> {
  return getSubmissionRepository().markInReview(id);
}

/** Mark an in_review submission as rendering. Only transitions from `in_review` → `rendering`. */
export async function markSubmissionRendering(
  id: string,
): Promise<Submission> {
  return getSubmissionRepository().markRendering(id);
}

/** Mark a rendering submission as completed. Only transitions from `rendering` → `completed`. */
export async function markSubmissionCompleted(
  id: string,
): Promise<Submission> {
  return getSubmissionRepository().markCompleted(id);
}

/**
 * Hard-delete a submission record by id. Throws if not found. Does NOT
 * cascade — callers must delete associated manifests/tokens/video assets
 * first (see the DELETE /api/submissions/[id] route handler).
 */
export async function deleteSubmission(id: string): Promise<void> {
  return getSubmissionRepository().delete(id);
}
