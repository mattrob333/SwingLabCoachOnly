import { describe, it, expect } from "vitest";
import { COACHES, getCoachBySlug, getAllCoachSlugs } from "@/lib/coaches";

describe("coaches data", () => {
  it("exposes at least one sample coach", () => {
    expect(COACHES.length).toBeGreaterThanOrEqual(1);
  });

  it("every coach has a unique, non-empty slug", () => {
    const slugs = COACHES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s.length).toBeGreaterThan(0);
  });

  it("getCoachBySlug returns the matching coach", () => {
    const first = COACHES[0];
    expect(getCoachBySlug(first.slug)).toBe(first);
  });

  it("getCoachBySlug returns undefined for unknown slug", () => {
    expect(getCoachBySlug("does-not-exist")).toBeUndefined();
  });

  it("getCoachBySlug is case-sensitive", () => {
    const upper = COACHES[0].slug.toUpperCase();
    expect(getCoachBySlug(upper)).toBeUndefined();
  });

  it("getAllCoachSlugs matches the coaches array", () => {
    expect(getAllCoachSlugs()).toEqual(COACHES.map((c) => c.slug));
  });
});
