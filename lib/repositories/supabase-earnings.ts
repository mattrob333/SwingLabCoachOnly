/**
 * Supabase earning repository stub (Wave 1 Task 5).
 */

import type { Earning, EarningInput, EarningRepository } from "./types";

function notImpl(method: string): never {
  throw new Error(
    `[supabase-earnings] ${method} not implemented — Wave 1 Task 6+ will add the schema + impl`,
  );
}

export class SupabaseEarningRepository implements EarningRepository {
  readonly mode = "live" as const;

  record(_input: EarningInput): Earning {
    notImpl("record");
  }
  getForSubmission(_submissionId: string): Earning | undefined {
    notImpl("getForSubmission");
  }
  getForCoach(_coachSlug: string): Earning[] {
    notImpl("getForCoach");
  }
  getTotalForCoach(_coachSlug: string): number {
    notImpl("getTotalForCoach");
  }
}
