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

  it("getCoachBySlug returns the matching coach", async () => {
    const first = COACHES[0];
    expect(await getCoachBySlug(first.slug)).toBe(first);
  });

  it("getCoachBySlug returns undefined for unknown slug", async () => {
    expect(await getCoachBySlug("does-not-exist")).toBeUndefined();
  });

  it("getCoachBySlug is case-sensitive", async () => {
    const upper = COACHES[0].slug.toUpperCase();
    expect(await getCoachBySlug(upper)).toBeUndefined();
  });

  it("getAllCoachSlugs matches the coaches array", async () => {
    expect(await getAllCoachSlugs()).toEqual(COACHES.map((c) => c.slug));
  });
});
