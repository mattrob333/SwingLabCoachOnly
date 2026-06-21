import { randomUUID } from "node:crypto";

/**
 * Phase 8 — Coach earnings model (in-memory store for MVP).
 *
 * An earning is recorded when a submission reaches `completed` (PRD §31 build
 * order #18: track coach earnings per completed submission). The earnings
 * dashboard surfaces the total + per-submission breakdown.
 *
 * Recordings are idempotent per submission — completing the same submission
 * twice (e.g. a retry) does not double-count.
 */

export type Earning = {
  id: string;
  submissionId: string;
  coachSlug: string;
  /** USD amount paid by the parent for this review. */
  amountUsd: number;
  parentEmail: string;
  createdAt: Date;
};

export type EarningInput = {
  submissionId: string;
  coachSlug: string;
  amountUsd: number;
  parentEmail: string;
};

/** In-memory store. Resets on deploy — fine for MVP. */
export const EARNINGS: Earning[] = [];

/**
 * Record an earning for a completed submission. Idempotent per submission —
 * if an earning already exists for `submissionId`, the existing record is
 * returned unchanged (no duplicate). Throws on invalid input.
 */
export function recordEarning(input: EarningInput): Earning {
  if (!input.coachSlug || input.coachSlug.trim().length === 0) {
    throw new Error("Coach slug is required for earning");
  }
  if (!input.submissionId || input.submissionId.trim().length === 0) {
    throw new Error("Submission id is required for earning");
  }
  if (!input.amountUsd || input.amountUsd < 1) {
    throw new Error("Earning amount must be at least $1");
  }

  const existing = getEarningForSubmission(input.submissionId);
  if (existing) return existing;

  const earning: Earning = {
    id: `earn_${randomUUID()}`,
    submissionId: input.submissionId,
    coachSlug: input.coachSlug,
    amountUsd: input.amountUsd,
    parentEmail: input.parentEmail,
    createdAt: new Date(),
  };
  EARNINGS.push(earning);
  return earning;
}

/** Look up the earning (if any) recorded for a submission id. */
export function getEarningForSubmission(
  submissionId: string,
): Earning | undefined {
  return EARNINGS.find((e) => e.submissionId === submissionId);
}

/**
 * All earnings for a coach, newest-first. Ties (same-millisecond creations,
 * common in rapid test/setup flows) are broken by store insertion order
 * (later push = newer) so ordering is deterministic regardless of timestamp
 * resolution.
 */
export function getEarningsForCoach(coachSlug: string): Earning[] {
  return EARNINGS.map((e, index) => ({ e, index }))
    .filter(({ e }) => e.coachSlug === coachSlug)
    .sort((a, b) => {
      const dt = b.e.createdAt.getTime() - a.e.createdAt.getTime();
      if (dt !== 0) return dt;
      return b.index - a.index; // later insertion = newer
    })
    .map(({ e }) => e);
}

/** Sum of all earnings for a coach, in USD. Returns 0 when none. */
export function getTotalEarningsForCoach(coachSlug: string): number {
  return getEarningsForCoach(coachSlug).reduce(
    (sum, e) => sum + e.amountUsd,
    0,
  );
}
