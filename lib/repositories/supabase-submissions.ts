/**
 * Supabase submission repository stub (Wave 1 Task 5).
 *
 * Every method throws "not implemented" — the real schema + queries land in
 * Wave 1 Task 6+ (Supabase Postgres migrations). The factory only returns
 * this impl when `isLive("database")` is true (i.e. the user has added
 * Supabase credentials to .env). Until then the in-memory impl is used.
 */

import type {
  Submission,
  SubmissionInput,
  SubmissionRepository,
} from "./types";

function notImpl(method: string): never {
  throw new Error(
    `[supabase-submissions] ${method} not implemented — Wave 1 Task 6+ will add the schema + impl`,
  );
}

export class SupabaseSubmissionRepository implements SubmissionRepository {
  readonly mode = "live" as const;

  create(_input: SubmissionInput): Submission {
    notImpl("create");
  }
  getById(_id: string): Submission | undefined {
    notImpl("getById");
  }
  getFollowUpsFor(_originalId: string): Submission[] {
    notImpl("getFollowUpsFor");
  }
  getForCoach(_coachSlug: string): Submission[] {
    notImpl("getForCoach");
  }
  markPaid(_id: string): Submission {
    notImpl("markPaid");
  }
  markInReview(_id: string): Submission {
    notImpl("markInReview");
  }
  markRendering(_id: string): Submission {
    notImpl("markRendering");
  }
  markCompleted(_id: string): Submission {
    notImpl("markCompleted");
  }
}
