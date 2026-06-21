/**
 * Coach domain data (Phase 1 stub).
 *
 * In the MVP this will be served by `GET /api/public/coaches/:slug` backed by
 * the `coaches` table (see docs/DATA_MODEL.md). For Phase 1 we ship an
 * in-memory sample so the public profile route is renderable and testable
 * before the database exists.
 */

export type Coach = {
  slug: string;
  name: string;
  title: string;
  bio: string;
  location: string;
  /** USD price for a single swing review lesson. */
  priceUsd: number;
  /** ISO 8601 turnaround estimate, e.g. "PT24H". */
  turnaround: string;
  highlights: string[];
  /** Public testimonial snippets. */
  testimonials: { author: string; quote: string }[];
};

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

/** Look up a coach by slug. Returns `undefined` when not found. */
export function getCoachBySlug(slug: string): Coach | undefined {
  return COACHES.find((c) => c.slug === slug);
}

/** All coach slugs — used by `generateStaticParams`. */
export function getAllCoachSlugs(): string[] {
  return COACHES.map((c) => c.slug);
}

/** Input shape for creating/updating a coach profile (write path). */
export type CoachInput = {
  name: string;
  title: string;
  bio: string;
  location: string;
  priceUsd: number;
  /** ISO 8601 turnaround estimate, e.g. "PT24H". */
  turnaround: string;
  highlights: string[];
  /**
   * Optional: the slug of an existing coach to update. When provided and the
   * slug exists, that coach record is updated in place. When omitted (or the
   * slug is not found) a new coach is created with a disambiguated slug.
   */
  existingSlug?: string;
};

/**
 * Convert a human name into a URL-safe slug.
 * - Lowercase, hyphen-separated, non-alphanumerics stripped,
 *   multiple spaces collapsed, trimmed.
 * - Returns "" when the input contains no alphanumerics.
 */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Validate a CoachInput. Returns an array of human-readable error strings;
 * an empty array means the input is valid.
 */
export function validateCoachInput(input: CoachInput): string[] {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length === 0) {
    errors.push("Name is required");
  }
  if (!input.bio || input.bio.trim().length === 0) {
    errors.push("Bio is required");
  }
  if (input.priceUsd == null || input.priceUsd < 1) {
    errors.push("Price must be at least $1");
  }
  if (!input.turnaround || input.turnaround.trim().length === 0) {
    errors.push("Turnaround is required");
  }

  return errors;
}

/**
 * Pick the next available slug derived from `name`. If the base slug already
 * exists, append "-2", "-3", ... until a free one is found.
 */
function nextAvailableSlug(name: string): string {
  const base = slugify(name);
  if (!getCoachBySlug(base)) return base;

  let suffix = 2;
  while (getCoachBySlug(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/**
 * Create or update a coach from the given input.
 *
 * - If the derived slug already maps to a coach, that coach is updated in place
 *   (same object reference returned).
 * - Otherwise a new coach is appended to the in-memory store.
 * - Throws if the input is invalid (see `validateCoachInput`).
 */
export function upsertCoach(input: CoachInput): Coach {
  const errors = validateCoachInput(input);
  if (errors.length > 0) {
    throw new Error(`Invalid coach input: ${errors.join("; ")}`);
  }

  // Update path: an explicit existingSlug was provided and matches a coach.
  if (input.existingSlug) {
    const existing = getCoachBySlug(input.existingSlug);
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
