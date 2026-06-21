import { describe, it, expect, beforeEach } from "vitest";
import {
  COACHES,
  getCoachBySlug,
  getAllCoachSlugs,
  upsertCoach,
  slugify,
  validateCoachInput,
  type CoachInput,
} from "@/lib/coaches";

describe("slugify", () => {
  it("lowercases and hyphenates a name", () => {
    expect(slugify("Marcus Reed")).toBe("marcus-reed");
  });

  it("collapses multiple spaces and trims", () => {
    expect(slugify("  Priya   Anand  ")).toBe("priya-anand");
  });

  it("strips non-alphanumeric characters", () => {
    expect(slugify("Coach O'Brien!")).toBe("coach-obrien");
  });

  it("returns empty string for input with no alphanumerics", () => {
    expect(slugify("!!! ---")).toBe("");
  });
});

describe("validateCoachInput", () => {
  function validInput(): CoachInput {
    return {
      name: "Jane Doe",
      title: "Hitting Coach",
      bio: "A short bio.",
      location: "Denver, CO",
      priceUsd: 45,
      turnaround: "PT24H",
      highlights: ["Fast turnaround"],
    };
  }

  it("accepts a valid input (no errors)", () => {
    expect(validateCoachInput(validInput())).toEqual([]);
  });

  it("rejects an empty name", () => {
    const errors = validateCoachInput({ ...validInput(), name: "" });
    expect(errors).toContain("Name is required");
  });

  it("rejects a name that is only whitespace", () => {
    const errors = validateCoachInput({ ...validInput(), name: "   " });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects a price below 1", () => {
    const errors = validateCoachInput({ ...validInput(), priceUsd: 0 });
    expect(errors).toContain("Price must be at least $1");
  });

  it("rejects a negative price", () => {
    const errors = validateCoachInput({ ...validInput(), priceUsd: -5 });
    expect(errors).toContain("Price must be at least $1");
  });

  it("rejects an empty turnaround", () => {
    const errors = validateCoachInput({ ...validInput(), turnaround: "" });
    expect(errors).toContain("Turnaround is required");
  });

  it("rejects an empty bio", () => {
    const errors = validateCoachInput({ ...validInput(), bio: "" });
    expect(errors).toContain("Bio is required");
  });
});

describe("upsertCoach", () => {
  // Snapshot the original seeded slugs so each test can restore the store.
  const originalSlugs = COACHES.map((c) => c.slug);

  beforeEach(() => {
    // Remove any coaches added during a test (keep the seeded ones).
    for (const c of [...COACHES]) {
      if (!originalSlugs.includes(c.slug)) {
        const idx = COACHES.indexOf(c);
        if (idx !== -1) COACHES.splice(idx, 1);
      }
    }
  });

  it("creates a new coach from valid input", () => {
    const input: CoachInput = {
      name: "Jane Doe",
      title: "Hitting Coach",
      bio: "A short bio.",
      location: "Denver, CO",
      priceUsd: 45,
      turnaround: "PT24H",
      highlights: ["Fast turnaround", "Drill plan"],
    };
    const coach = upsertCoach(input);
    expect(coach.slug).toBe("jane-doe");
    expect(coach.name).toBe("Jane Doe");
    expect(coach.highlights).toEqual(["Fast turnaround", "Drill plan"]);
    expect(coach.testimonials).toEqual([]);
    expect(getCoachBySlug("jane-doe")).toBe(coach);
  });

  it("updates an existing coach when the slug matches", () => {
    const input: CoachInput = {
      name: "Marcus Reed",
      title: "Updated Title",
      bio: "Updated bio.",
      location: "Austin, TX",
      priceUsd: 59,
      turnaround: "PT12H",
      highlights: ["New highlight"],
      existingSlug: "marcus-reed",
    };
    const coach = upsertCoach(input);
    expect(coach.slug).toBe("marcus-reed");
    expect(coach.title).toBe("Updated Title");
    expect(coach.priceUsd).toBe(59);
    // Same object reference (updated in place)
    expect(getCoachBySlug("marcus-reed")).toBe(coach);
  });

  it("disambiguates a slug collision by appending a numeric suffix", () => {
    const input: CoachInput = {
      name: "Marcus Reed",
      title: "Another Coach",
      bio: "Bio.",
      location: "Remote",
      priceUsd: 30,
      turnaround: "PT48H",
      highlights: [],
    };
    const coach = upsertCoach(input);
    expect(coach.slug).toBe("marcus-reed-2");
    expect(getAllCoachSlugs()).toContain("marcus-reed-2");
  });

  it("throws on invalid input", () => {
    expect(() =>
      upsertCoach({
        name: "",
        title: "x",
        bio: "",
        location: "",
        priceUsd: 0,
        turnaround: "",
        highlights: [],
      })
    ).toThrow();
  });
});
