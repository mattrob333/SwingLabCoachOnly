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
