/**
 * Supabase earning repository (Wave 1 Slice D).
 *
 * Real PostgREST queries against the `earnings` table. Maps between the
 * TypeScript `Earning` domain type (camelCase, amountUsd in dollars) and the
 * Postgres row shape (snake_case, amount_usd_cents in cents). The `record`
 * method is idempotent — if an earning already exists for the submission,
 * it returns the existing one (mirrors the in-memory impl).
 */

import { randomUUID } from "node:crypto";
import { asObject, asArray, postgrestRequest } from "./supabase-client";
import type {
  Earning,
  EarningInput,
  EarningRepository,
} from "./types";

/** Postgres row shape for the `earnings` table (snake_case). */
type EarningRow = {
  id: string;
  submission_id: string;
  coach_slug: string;
  amount_usd_cents: number;
  parent_email: string;
  created_at: string;
  updated_at: string;
};

/** Map a Postgres row to the TS domain type (cents → dollars). */
function rowToEarning(row: EarningRow): Earning {
  return {
    id: row.id,
    submissionId: row.submission_id,
    coachSlug: row.coach_slug,
    amountUsd: row.amount_usd_cents / 100,
    parentEmail: row.parent_email,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseEarningRepository implements EarningRepository {
  readonly mode = "live" as const;

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

    // Idempotent: if an earning already exists for this submission, return it.
    const existing = await this.getForSubmission(input.submissionId);
    if (existing) return existing;

    const result = await postgrestRequest("earnings", {
      method: "POST",
      body: {
        id: `earn_${randomUUID()}`,
        submission_id: input.submissionId,
        coach_slug: input.coachSlug,
        amount_usd_cents: input.amountUsd * 100,
        parent_email: input.parentEmail,
      },
      single: true,
    });
    const row = asObject<EarningRow>(result);
    if (!row) {
      throw new Error("[supabase-earnings] record returned no row");
    }
    return rowToEarning(row);
  }

  async getForSubmission(submissionId: string): Promise<Earning | undefined> {
    const result = await postgrestRequest("earnings", {
      method: "GET",
      query: { submission_id: `eq.${submissionId}` },
      single: true,
    });
    const row = asObject<EarningRow>(result);
    return row ? rowToEarning(row) : undefined;
  }

  async getForCoach(coachSlug: string): Promise<Earning[]> {
    const result = await postgrestRequest("earnings", {
      method: "GET",
      query: {
        coach_slug: `eq.${coachSlug}`,
        order: "created_at.desc",
      },
    });
    return asArray<EarningRow>(result).map(rowToEarning);
  }

  async getTotalForCoach(coachSlug: string): Promise<number> {
    const earnings = await this.getForCoach(coachSlug);
    return earnings.reduce((sum, e) => sum + e.amountUsd, 0);
  }
}
