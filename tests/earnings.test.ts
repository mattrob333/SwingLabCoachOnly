import { describe, it, expect, beforeEach } from "vitest";
import {
  recordEarning,
  getEarningsForCoach,
  getTotalEarningsForCoach,
  getEarningForSubmission,
  EARNINGS,
  type EarningInput,
} from "@/lib/earnings";

function baseInput(): EarningInput {
  return {
    submissionId: "sub-1",
    coachSlug: "marcus-reed",
    amountUsd: 49,
    parentEmail: "parent@example.com",
  };
}

describe("earnings", () => {
  beforeEach(() => {
    EARNINGS.length = 0;
  });

  describe("recordEarning", () => {
    it("records an earning tied to a completed submission", () => {
      const earning = recordEarning(baseInput());

      expect(earning.id).toMatch(/^earn_/);
      expect(earning.submissionId).toBe("sub-1");
      expect(earning.coachSlug).toBe("marcus-reed");
      expect(earning.amountUsd).toBe(49);
      expect(earning.parentEmail).toBe("parent@example.com");
      expect(earning.createdAt).toBeInstanceOf(Date);
    });

    it("throws on non-positive amount", () => {
      expect(() =>
        recordEarning({ ...baseInput(), amountUsd: 0 }),
      ).toThrow(/amount/i);
    });

    it("throws on missing coach slug", () => {
      expect(() =>
        recordEarning({ ...baseInput(), coachSlug: "" }),
      ).toThrow(/coach/i);
    });

    it("is idempotent per submission — recording twice returns the existing earning", () => {
      const first = recordEarning(baseInput());
      const second = recordEarning(baseInput());

      expect(second.id).toBe(first.id);
      expect(EARNINGS.filter((e) => e.submissionId === "sub-1")).toHaveLength(1);
    });
  });

  describe("getEarningForSubmission", () => {
    it("returns the earning for a submission id", () => {
      recordEarning(baseInput());
      const found = getEarningForSubmission("sub-1");
      expect(found?.submissionId).toBe("sub-1");
    });

    it("returns undefined when no earning recorded", () => {
      expect(getEarningForSubmission("sub-missing")).toBeUndefined();
    });
  });

  describe("getEarningsForCoach", () => {
    it("returns only the coach's earnings, newest-first", () => {
      const a = recordEarning({ ...baseInput(), submissionId: "sub-1" });
      const b = recordEarning({ ...baseInput(), submissionId: "sub-2" });
      recordEarning({
        ...baseInput(),
        submissionId: "sub-3",
        coachSlug: "priya-anand",
      });

      const list = getEarningsForCoach("marcus-reed");
      expect(list).toHaveLength(2);
      // newest-first: b was recorded after a
      expect(list[0].id).toBe(b.id);
      expect(list[1].id).toBe(a.id);
    });

    it("uses insertion-order tiebreak for same-millisecond records", () => {
      const a = recordEarning({ ...baseInput(), submissionId: "sub-1" });
      const b = recordEarning({ ...baseInput(), submissionId: "sub-2" });
      // force same timestamp
      const ts = a.createdAt;
      b.createdAt = new Date(ts);
      const list = getEarningsForCoach("marcus-reed");
      // b pushed later → appears first
      expect(list[0].id).toBe(b.id);
    });

    it("returns empty array when coach has no earnings", () => {
      expect(getEarningsForCoach("nobody")).toEqual([]);
    });
  });

  describe("getTotalEarningsForCoach", () => {
    it("sums all earnings for a coach", () => {
      recordEarning({ ...baseInput(), submissionId: "sub-1", amountUsd: 49 });
      recordEarning({ ...baseInput(), submissionId: "sub-2", amountUsd: 39 });
      recordEarning({
        ...baseInput(),
        submissionId: "sub-3",
        coachSlug: "priya-anand",
        amountUsd: 100,
      });

      expect(getTotalEarningsForCoach("marcus-reed")).toBe(88);
      expect(getTotalEarningsForCoach("priya-anand")).toBe(100);
    });

    it("returns 0 when coach has no earnings", () => {
      expect(getTotalEarningsForCoach("nobody")).toBe(0);
    });
  });
});
