/**
 * Coach domain facade (Wave 1 Task 5).
 *
 * Re-exports types, slugify/validate helpers, and the in-memory coach array
 * (for test reset + lib/auth/credentials.ts which maps over it). Delegates
 * data-access free functions through the env-gated repository factory.
 */

export type { Coach, CoachInput } from "@/lib/repositories/types";
export { slugify, validateCoachInput } from "@/lib/repositories/types";

import { getCoachRepository } from "@/lib/repositories";
import type { Coach, CoachInput } from "@/lib/repositories/types";

/** In-memory store. Exported for test reset + auth credentials seed. */
export { COACHES } from "@/lib/repositories/in-memory-coaches";

/** Look up a coach by slug. Returns `undefined` when not found. */
export function getCoachBySlug(slug: string): Coach | undefined {
  return getCoachRepository().getBySlug(slug);
}

/** All coach slugs — used by `generateStaticParams`. */
export function getAllCoachSlugs(): string[] {
  return getCoachRepository().getAllSlugs();
}

/** Create or update a coach from the given input. */
export function upsertCoach(input: CoachInput): Coach {
  return getCoachRepository().upsert(input);
}
