/**
 * In-memory coach repository (Wave 1 Task 5 — async since Task 7).
 *
 * Wraps the existing in-memory coach array (seeded with the two MVP sample
 * coaches) that previously lived in lib/coaches.ts. The array is exported
 * so tests and lib/auth/credentials.ts (which maps over COACHES) can access
 * the same reference the facade re-exports.
 *
 * All methods are async to match the repository interface.
 */

import { randomUUID } from "node:crypto";
import {
  slugify,
  validateCoachInput,
  type Coach,
  type CoachInput,
  type CoachRepository,
} from "./types";

/** In-memory store — seeded with the two MVP sample coaches. */
export const COACHES: Coach[] = [
  {
    slug: "marcus-reed",
    name: "Marcus Reed",
    title: "Hitting Coach · Former MiLB",
    bio: "10 years developing hitters from youth to minor-league prospects. Data-informed mechanics with a feel-first coaching style.",
    location: "Austin, TX",
    priceUsd: 49,
    turnaround: "PT24H",
    highlights: [
      "Voice-over video review in under 24 hours",
      "Drill plan tailored to each swing",
      "Follow-up check-in after 7 days",
    ],
    testimonials: [
      {
        author: "Dana K.",
        quote: "My son's load completely changed after one review. Worth every penny.",
      },
    ],
  },
  {
    slug: "priya-anand",
    name: "Priya Anand",
    title: "Performance Hitting Coach",
    bio: "Certified strength & hitting specialist. Blends biomechanics with simple cues parents can reinforce at home.",
    location: "Remote · Nationwide",
    priceUsd: 39,
    turnaround: "PT48H",
    highlights: [
      "Biomechanics-backed swing analysis",
      "Parent-friendly drill sheet",
      "Unlimited message follow-ups for 14 days",
    ],
    testimonials: [
      {
        author: "Coach T.",
        quote: "Priya's reviews are the clearest I've seen. Our whole staff learned from them.",
      },
    ],
  },
];

function nextAvailableSlug(name: string): string {
  const base = slugify(name);
  if (!COACHES.find((c) => c.slug === base)) return base;
  let suffix = 2;
  while (COACHES.find((c) => c.slug === `${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export class InMemoryCoachRepository implements CoachRepository {
  readonly mode = "mock" as const;

  async getBySlug(slug: string): Promise<Coach | undefined> {
    return COACHES.find((c) => c.slug === slug);
  }

  async getAllSlugs(): Promise<string[]> {
    return COACHES.map((c) => c.slug);
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
        existing.name = input.name;
        existing.title = input.title;
        existing.bio = input.bio;
        existing.location = input.location;
        existing.priceUsd = input.priceUsd;
        existing.turnaround = input.turnaround;
        existing.highlights = input.highlights;
        return existing;
      }
    }

    // Create path: new coach with a disambiguated slug.
    const coach: Coach = {
      slug: nextAvailableSlug(input.name),
      name: input.name,
      title: input.title,
      bio: input.bio,
      location: input.location,
      priceUsd: input.priceUsd,
      turnaround: input.turnaround,
      highlights: input.highlights,
      testimonials: [],
    };
    COACHES.push(coach);
    return coach;
  }
}
