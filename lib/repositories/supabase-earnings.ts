/**
 * Supabase earning repository stub (Wave 1 Task 5 — async since Task 7).
 */

import type { Earning, EarningInput, EarningRepository } from "./types";

function notImpl(method: string): never {
  throw new Error(
    `[supabase-earnings] ${method} not implemented — Wave 1 Slice D will add the impl`,
  );
}

export class SupabaseEarningRepository implements EarningRepository {
  readonly mode = "live" as const;

  async record(_input: EarningInput): Promise<Earning> {
    notImpl("record");
  }
  async getForSubmission(_submissionId: string): Promise<Earning | undefined> {
    notImpl("getForSubmission");
  }
  async getForCoach(_coachSlug: string): Promise<Earning[]> {
    notImpl("getForCoach");
  }
  async getTotalForCoach(_coachSlug: string): Promise<number> {
    notImpl("getTotalForCoach");
  }
}
