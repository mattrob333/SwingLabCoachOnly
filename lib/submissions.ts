import { randomUUID } from "node:crypto";

/**
 * Phase 3 — Parent submission model (in-memory store for MVP).
 *
 * A submission represents a parent's request for a swing review from a specific
 * coach. The lifecycle follows PRD §31:
 *   pending_payment → paid → in_review → completed
 *
 * Guardrail: payment before review. A submission starts as `pending_payment`
 * and only transitions to `paid` after the payment flow completes (Phase 3 #4).
 */

export type SubmissionStatus =
  | "pending_payment"
  | "paid"
  | "in_review"
  | "completed";

export type Submission = {
  id: string;
  coachSlug: string;
  parentEmail: string;
  playerAge: number;
  swingType: string;
  notes: string;
  status: SubmissionStatus;
  createdAt: Date;
};

export type SubmissionInput = {
  coachSlug: string;
  parentEmail: string;
  playerAge: number;
  swingType: string;
  notes: string;
};

/** In-memory store. Resets on deploy — fine for MVP. */
export const SUBMISSIONS: Submission[] = [];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate a submission input. Returns an array of error strings.
 */
export function validateSubmissionInput(input: SubmissionInput): string[] {
  const errors: string[] = [];

  if (!input.coachSlug || input.coachSlug.trim().length === 0) {
    errors.push("Coach is required");
  }
  if (!input.parentEmail || !EMAIL_RE.test(input.parentEmail)) {
    errors.push("Valid email is required");
  }
  if (input.playerAge < 5 || input.playerAge > 18) {
    errors.push("Player age must be between 5 and 18");
  }

  return errors;
}

/**
 * Create a new submission. Always starts as `pending_payment`.
 * Throws if the input is invalid.
 */
export function createSubmission(input: SubmissionInput): Submission {
  const errors = validateSubmissionInput(input);
  if (errors.length > 0) {
    throw new Error(`Invalid submission: ${errors.join("; ")}`);
  }

  const submission: Submission = {
    id: randomUUID(),
    coachSlug: input.coachSlug,
    parentEmail: input.parentEmail,
    playerAge: input.playerAge,
    swingType: input.swingType,
    notes: input.notes,
    status: "pending_payment",
    createdAt: new Date(),
  };
  SUBMISSIONS.push(submission);
  return submission;
}

/** Look up a submission by id. */
export function getSubmissionById(id: string): Submission | undefined {
  return SUBMISSIONS.find((s) => s.id === id);
}

/** All submissions for a given coach, newest first. */
export function getSubmissionsForCoach(coachSlug: string): Submission[] {
  return SUBMISSIONS.filter((s) => s.coachSlug === coachSlug).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

/**
 * Mark a submission as paid. Only transitions from `pending_payment` → `paid`.
 * Returns the updated submission or throws if the submission doesn't exist
 * or is not in a payable state.
 */
export function markSubmissionPaid(id: string): Submission {
  const submission = getSubmissionById(id);
  if (!submission) {
    throw new Error(`Submission not found: ${id}`);
  }
  if (submission.status !== "pending_payment") {
    throw new Error(
      `Submission ${id} is not pending payment (current: ${submission.status})`,
    );
  }
  submission.status = "paid";
  return submission;
}

/**
 * Mark a paid submission as in_review. Only transitions from `paid` → `in_review`.
 * Returns the updated submission or throws if the submission doesn't exist
 * or is not in a reviewable state.
 */
export function markSubmissionInReview(id: string): Submission {
  const submission = getSubmissionById(id);
  if (!submission) {
    throw new Error(`Submission not found: ${id}`);
  }
  if (submission.status === "in_review") {
    throw new Error(`Submission ${id} is already in review`);
  }
  if (submission.status !== "paid") {
    throw new Error(
      `Submission ${id} is not paid (current: ${submission.status})`,
    );
  }
  submission.status = "in_review";
  return submission;
}
