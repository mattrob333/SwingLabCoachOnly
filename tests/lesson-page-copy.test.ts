import { describe, it, expect } from "vitest";
import { buildLessonPageCopy } from "@/lib/lesson/page-copy";

describe("buildLessonPageCopy", () => {
  it("uses coach display name when provided", () => {
    const copy = buildLessonPageCopy({
      coachName: "Marcus Reed",
      hasAiSummary: false,
    });
    expect(copy.headerTitle).toContain("Marcus Reed");
    expect(copy.headerTitle).toContain("Your Lesson");
  });

  it("uses generic title when no coach name", () => {
    const copy = buildLessonPageCopy({
      coachName: undefined,
      hasAiSummary: false,
    });
    expect(copy.headerTitle).toContain("Your SwingLab Lesson");
  });

  it("includes coach name in CTA when provided", () => {
    const copy = buildLessonPageCopy({
      coachName: "Marcus Reed",
      hasAiSummary: false,
    });
    expect(copy.ctaText).toContain("Marcus Reed");
  });

  it("uses generic CTA when no coach name", () => {
    const copy = buildLessonPageCopy({
      coachName: undefined,
      hasAiSummary: false,
    });
    expect(copy.ctaText).toContain("your coach");
    expect(copy.ctaText).not.toContain("Marcus Reed");
  });

  it("shows summary section label when aiSummary exists", () => {
    const copy = buildLessonPageCopy({
      coachName: "Marcus Reed",
      hasAiSummary: true,
    });
    expect(copy.showSummarySection).toBe(true);
  });

  it("hides summary section when no aiSummary", () => {
    const copy = buildLessonPageCopy({
      coachName: "Marcus Reed",
      hasAiSummary: false,
    });
    expect(copy.showSummarySection).toBe(false);
  });
});
