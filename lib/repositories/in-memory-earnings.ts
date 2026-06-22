/**
 * In-memory earning repository (Wave 1 Task 5 — async since Task 7).
 *
 * Wraps the existing in-memory earning array + idempotent record logic that
 * previously lived in lib/earnings.ts. The array is exported for test reset.
 * All methods are async to match the repository interface.
 */

import { randomUUID } from "node:crypto";
import type {
  Earning,
  EarningInput,
  EarningRepository,
} from "./types";

/** In-memory store. Exported for test reset. */
export const EARNINGS: Earning[] = [];

export class InMemoryEarningRepository implements EarningRepository {
  readonly mode = "mock" as const;

  async record(input: EarningInput): Promise<Earning> {
    if (!input.coachSlug || input.coachSlug.trim().length === 0) {
      throw new Error("Coach slug is required for earning");
    }
    if (!input.submissionId || input.submissionId.trim().length === 0) {
      throw new Error("Submission id is required for earning");
    }
    if (!input.amountUsd || input.amountUsd < 1) {
      throw new Error("Earning amount must be at least $1");
    }
    const existing = await this.getForSubmission(input.submissionId);
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

  async getForSubmission(submissionId: string): Promise<Earning | undefined> {
    return EARNINGS.find((e) => e.submissionId === submissionId);
  }

  async getForCoach(coachSlug: string): Promise<Earning[]> {
    return EARNINGS.map((e, index) => ({ e, index }))
      .filter(({ e }) => e.coachSlug === coachSlug)
      .sort((a, b) => {
        const dt = b.e.createdAt.getTime() - a.e.createdAt.getTime();
        if (dt !== 0) return dt;
        return b.index - a.index; // later insertion = newer
      })
      .map(({ e }) => e);
  }

  async getTotalForCoach(coachSlug: string): Promise<number> {
    const earnings = await this.getForCoach(coachSlug);
    return earnings.reduce((sum, e) => sum + e.amountUsd, 0);
  }
}
