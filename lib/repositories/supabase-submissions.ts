/**
 * Supabase submission repository stub (Wave 1 Task 5 — async since Task 7).
 *
 * Every method throws "not implemented" — the real schema + queries land in
 * Wave 1 Slice D (Supabase PostgREST impls). The factory only returns this
 * impl when `isLive("database")` is true. Methods are async to match the
 * repository interface.
 */

import type {
  Submission,
  SubmissionInput,
  SubmissionRepository,
} from "./types";

function notImpl(method: string): never {
  throw new Error(
    `[supabase-submissions] ${method} not implemented — Wave 1 Slice D will add the impl`,
  );
}

export class SupabaseSubmissionRepository implements SubmissionRepository {
  readonly mode = "live" as const;

  async create(_input: SubmissionInput): Promise<Submission> {
    notImpl("create");
  }
  async getById(_id: string): Promise<Submission | undefined> {
    notImpl("getById");
  }
  async getFollowUpsFor(_originalId: string): Promise<Submission[]> {
    notImpl("getFollowUpsFor");
  }
  async getForCoach(_coachSlug: string): Promise<Submission[]> {
    notImpl("getForCoach");
  }
  async markPaid(_id: string): Promise<Submission> {
    notImpl("markPaid");
  }
  async markInReview(_id: string): Promise<Submission> {
    notImpl("markInReview");
  }
  async markRendering(_id: string): Promise<Submission> {
    notImpl("markRendering");
  }
  async markCompleted(_id: string): Promise<Submission> {
    notImpl("markCompleted");
  }
}
