/**
 * Supabase coach repository stub (Wave 1 Task 5).
 */

import type { Coach, CoachInput, CoachRepository } from "./types";

function notImpl(method: string): never {
  throw new Error(
    `[supabase-coaches] ${method} not implemented — Wave 1 Task 6+ will add the schema + impl`,
  );
}

export class SupabaseCoachRepository implements CoachRepository {
  readonly mode = "live" as const;

  getBySlug(_slug: string): Coach | undefined {
    notImpl("getBySlug");
  }
  getAllSlugs(): string[] {
    notImpl("getAllSlugs");
  }
  upsert(_input: CoachInput): Coach {
    notImpl("upsert");
  }
}
