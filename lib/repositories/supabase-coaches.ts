/**
 * Supabase coach repository (Wave 1 Slice D).
 *
 * Real PostgREST queries against the `coaches` table. Maps between the
 * TypeScript `Coach` domain type (camelCase, priceUsd in dollars) and the
 * Postgres row shape (snake_case, price_usd_cents in cents). The `slug` is
 * the TEXT primary key.
 */

import { asObject, asArray, postgrestRequest } from "./supabase-client";
import {
  slugify,
  validateCoachInput,
  type Coach,
  type CoachInput,
  type CoachRepository,
} from "./types";

/** Postgres row shape for the `coaches` table (snake_case). */
type CoachRow = {
  slug: string;
  name: string;
  title: string;
  bio: string;
  location: string;
  price_usd_cents: number;
  turnaround: string;
  highlights: string[];
  testimonials: { author: string; quote: string }[];
  created_at: string;
  updated_at: string;
};

/** Map a Postgres row to the TS domain type (cents → dollars). */
function rowToCoach(row: CoachRow): Coach {
  return {
    slug: row.slug,
    name: row.name,
    title: row.title,
    bio: row.bio,
    location: row.location,
    priceUsd: row.price_usd_cents / 100,
    turnaround: row.turnaround,
    highlights: row.highlights,
    testimonials: row.testimonials,
  };
}

export class SupabaseCoachRepository implements CoachRepository {
  readonly mode = "live" as const;

  async getBySlug(slug: string): Promise<Coach | undefined> {
    const result = await postgrestRequest("coaches", {
      method: "GET",
      query: { slug: `eq.${slug}` },
      single: true,
    });
    const row = asObject<CoachRow>(result);
    return row ? rowToCoach(row) : undefined;
  }

  async getAllSlugs(): Promise<string[]> {
    const result = await postgrestRequest("coaches", {
      method: "GET",
      query: { select: "slug" },
    });
    const rows = asArray<{ slug: string }>(result);
    return rows.map((r) => r.slug);
  }

  /** Find the next available slug for a new coach, matching the in-memory disambiguation logic. */
  private async nextAvailableSlug(name: string): Promise<string> {
    const base = slugify(name);
    // Query for all slugs that start with the base slug to find taken ones.
    const result = await postgrestRequest("coaches", {
      method: "GET",
      query: {
        select: "slug",
        slug: `like.${base}*`,
      },
    });
    const taken = new Set(asArray<{ slug: string }>(result).map((r) => r.slug));
    if (!taken.has(base)) return base;
    let suffix = 2;
    while (taken.has(`${base}-${suffix}`)) suffix += 1;
    return `${base}-${suffix}`;
  }

  async upsert(input: CoachInput): Promise<Coach> {
    const errors = validateCoachInput(input);
    if (errors.length > 0) {
      throw new Error(`Invalid coach input: ${errors.join("; ")}`);
    }

    // Update path: an explicit existingSlug was provided and matches a coach.
    if (input.existingSlug) {
      const existing = await this.getBySlug(input.existingSlug);
      if (existing) {
        const result = await postgrestRequest("coaches", {
          method: "PATCH",
          query: { slug: `eq.${input.existingSlug}` },
          body: {
            name: input.name,
            title: input.title,
            bio: input.bio,
            location: input.location,
            price_usd_cents: input.priceUsd * 100,
            turnaround: input.turnaround,
            highlights: input.highlights,
          },
          single: true,
        });
        const row = asObject<CoachRow>(result);
        if (!row) {
          throw new Error(`Coach not found after update: ${input.existingSlug}`);
        }
        return rowToCoach(row);
      }
    }

    // Create path: new coach with a disambiguated slug.
    const slug = await this.nextAvailableSlug(input.name);
    const result = await postgrestRequest("coaches", {
      method: "POST",
      body: {
        slug,
        name: input.name,
        title: input.title,
        bio: input.bio,
        location: input.location,
        price_usd_cents: input.priceUsd * 100,
        turnaround: input.turnaround,
        highlights: input.highlights,
        testimonials: [],
      },
      single: true,
    });
    const row = asObject<CoachRow>(result);
    if (!row) {
      throw new Error("[supabase-coaches] upsert create returned no row");
    }
    return rowToCoach(row);
  }
}
