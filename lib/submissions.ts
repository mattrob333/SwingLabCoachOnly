import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

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
  | "rendering"
  | "completed";

export type Submission = {
  id: string;
  coachSlug: string;
  parentEmail: string;
  playerAge: number;
  swingType: string;
  notes: string;
  videoUrl?: string;
  videoFileName?: string;
  status: SubmissionStatus;
  createdAt: Date;
  /**
   * Optional reference to the original submission this swing follows up on.
   * Present when a parent submits a new swing after receiving a lesson,
   * linking the follow-up to the original review (PRD §31 build order #17).
   */
  followUpFor?: string;
};

export type SubmissionInput = {
  coachSlug: string;
  parentEmail: string;
  playerAge: number;
  swingType: string;
  notes: string;
  videoUrl?: string;
  videoFileName?: string;
  /** Optional — links this submission to an original lesson's submission id. */
  followUpFor?: string;
};

/** In-memory store. Resets on deploy — fine for MVP. */
export const SUBMISSIONS: Submission[] = [];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORE_PATH = join(process.cwd(), ".swinglab-data", "submissions.json");
const USE_FILE_STORE = process.env.NODE_ENV !== "test";

type StoredSubmission = Omit<Submission, "createdAt"> & {
  createdAt: string;
};

function serializeSubmission(submission: Submission): StoredSubmission {
  return {
    ...submission,
    createdAt: submission.createdAt.toISOString(),
  };
}

function deserializeSubmission(submission: StoredSubmission): Submission {
  return {
    ...submission,
    createdAt: new Date(submission.createdAt),
  };
}

function loadSubmissions(): void {
  if (!USE_FILE_STORE || !existsSync(STORE_PATH)) return;

  try {
    const stored = JSON.parse(readFileSync(STORE_PATH, "utf8")) as StoredSubmission[];
    SUBMISSIONS.splice(0, SUBMISSIONS.length, ...stored.map(deserializeSubmission));
  } catch {
    SUBMISSIONS.length = 0;
  }
}

function saveSubmissions(): void {
  if (!USE_FILE_STORE) return;

  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(
    STORE_PATH,
    JSON.stringify(SUBMISSIONS.map(serializeSubmission), null, 2),
    "utf8",
  );
}

function withFreshSubmissions<T>(read: () => T): T {
  loadSubmissions();
  return read();
}

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
  loadSubmissions();
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
    ...(input.videoUrl ? { videoUrl: input.videoUrl } : {}),
    ...(input.videoFileName ? { videoFileName: input.videoFileName } : {}),
    status: "pending_payment",
    createdAt: new Date(),
    ...(input.followUpFor ? { followUpFor: input.followUpFor } : {}),
  };
  SUBMISSIONS.push(submission);
  saveSubmissions();
  return submission;
}

/** Look up a submission by id. */
export function getSubmissionById(id: string): Submission | undefined {
  return withFreshSubmissions(() => SUBMISSIONS.find((s) => s.id === id));
}

/**
 * Get all follow-up submissions linked to an original submission id.
 * Returns newest-first. Used by the coach to see iterative progress on a
 * player's swing after a lesson was delivered (PRD §31 build order #17).
 *
 * Sort is by createdAt descending; ties (same-millisecond creations) are
 * broken by store insertion order (later push = newer) so ordering is
 * deterministic regardless of timestamp resolution.
 */
export function getFollowUpsForSubmission(originalId: string): Submission[] {
  return withFreshSubmissions(() =>
    SUBMISSIONS.map((s, index) => ({ s, index }))
      .filter(({ s }) => s.followUpFor === originalId)
      .sort((a, b) => {
        const dt = b.s.createdAt.getTime() - a.s.createdAt.getTime();
        if (dt !== 0) return dt;
        return b.index - a.index; // later insertion = newer
      })
      .map(({ s }) => s),
  );
}

/** All submissions for a given coach, newest first. */
export function getSubmissionsForCoach(coachSlug: string): Submission[] {
  return withFreshSubmissions(() =>
    SUBMISSIONS.filter((s) => s.coachSlug === coachSlug).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    ),
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
  saveSubmissions();
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
  saveSubmissions();
  return submission;
}

/**
 * Mark an in_review submission as rendering.
 * Only transitions from `in_review` → `rendering`.
 * Returns the updated submission or throws if the submission doesn't exist
 * or is not in review.
 */
export function markSubmissionRendering(id: string): Submission {
  const submission = getSubmissionById(id);
  if (!submission) {
    throw new Error(`Submission not found: ${id}`);
  }
  if (submission.status !== "in_review") {
    throw new Error(
      `Submission ${id} is not in review (current: ${submission.status})`,
    );
  }
  submission.status = "rendering";
  saveSubmissions();
  return submission;
}

/**
 * Mark a rendering submission as completed.
 * Only transitions from `rendering` → `completed`.
 * Returns the updated submission or throws if the submission doesn't exist
 * or is not rendering.
 */
export function markSubmissionCompleted(id: string): Submission {
  const submission = getSubmissionById(id);
  if (!submission) {
    throw new Error(`Submission not found: ${id}`);
  }
  if (submission.status !== "rendering") {
    throw new Error(
      `Submission ${id} is not rendering (current: ${submission.status})`,
    );
  }
  submission.status = "completed";
  saveSubmissions();
  return submission;
}
