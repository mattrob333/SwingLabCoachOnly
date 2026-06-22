/**
 * Supabase coach repository stub (Wave 1 Task 5 — async since Task 7).
 */

import type { Coach, CoachInput, CoachRepository } from "./types";

function notImpl(method: string): never {
  throw new Error(
    `[supabase-coaches] ${method} not implemented — Wave 1 Slice D will add the impl`,
  );
}

export class SupabaseCoachRepository implements CoachRepository {
  readonly mode = "live" as const;

  async getBySlug(_slug: string): Promise<Coach | undefined> {
    notImpl("getBySlug");
  }
  async getAllSlugs(): Promise<string[]> {
    notImpl("getAllSlugs");
  }
  async upsert(_input: CoachInput): Promise<Coach> {
    notImpl("upsert");
  }
}
