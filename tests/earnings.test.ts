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

  describe("recordEarning", async () => {
    it("records an earning tied to a completed submission", async () => {
      const earning = await recordEarning(baseInput());

      expect(earning.id).toMatch(/^earn_/);
      expect(earning.submissionId).toBe("sub-1");
      expect(earning.coachSlug).toBe("marcus-reed");
      expect(earning.amountUsd).toBe(49);
      expect(earning.parentEmail).toBe("parent@example.com");
      expect(earning.createdAt).toBeInstanceOf(Date);
    });

    it("throws on non-positive amount", async () => {
      await expect(
        recordEarning({ ...baseInput(), amountUsd: 0 }),
      ).rejects.toThrow(/amount/i);
    });

    it("throws on missing coach slug", async () => {
      await expect(
        recordEarning({ ...baseInput(), coachSlug: "" }),
      ).rejects.toThrow(/coach/i);
    });

    it("is idempotent per submission — recording twice returns the existing earning", async () => {
      const first = await recordEarning(baseInput());
      const second = await recordEarning(baseInput());

      expect(second.id).toBe(first.id);
      expect(EARNINGS.filter((e) => e.submissionId === "sub-1")).toHaveLength(1);
    });
  });

  describe("getEarningForSubmission", () => {
    it("returns the earning for a submission id", async () => {
      await recordEarning(baseInput());
      const found = await getEarningForSubmission("sub-1");
      expect(found?.submissionId).toBe("sub-1");
    });

    it("returns undefined when no earning recorded", async () => {
      expect(await getEarningForSubmission("sub-missing")).toBeUndefined();
    });
  });

  describe("getEarningsForCoach", () => {
    it("returns only the coach's earnings, newest-first", async () => {
      const a = await recordEarning({ ...baseInput(), submissionId: "sub-1" });
      const b = await recordEarning({ ...baseInput(), submissionId: "sub-2" });
      await recordEarning({
        ...baseInput(),
        submissionId: "sub-3",
        coachSlug: "priya-anand",
      });

      const list = await getEarningsForCoach("marcus-reed");
      expect(list).toHaveLength(2);
      // newest-first: b was recorded after a
      expect(list[0].id).toBe(b.id);
      expect(list[1].id).toBe(a.id);
    });

    it("uses insertion-order tiebreak for same-millisecond records", async () => {
      const a = await recordEarning({ ...baseInput(), submissionId: "sub-1" });
      const b = await recordEarning({ ...baseInput(), submissionId: "sub-2" });
      // force same timestamp
      const ts = a.createdAt;
      b.createdAt = new Date(ts);
      const list = await getEarningsForCoach("marcus-reed");
      // b pushed later → appears first
      expect(list[0].id).toBe(b.id);
    });

    it("returns empty array when coach has no earnings", async () => {
      expect(await getEarningsForCoach("nobody")).toEqual([]);
    });
  });

  describe("getTotalEarningsForCoach", () => {
    it("sums all earnings for a coach", async () => {
      await recordEarning({ ...baseInput(), submissionId: "sub-1", amountUsd: 49 });
      await recordEarning({ ...baseInput(), submissionId: "sub-2", amountUsd: 39 });
      await recordEarning({
        ...baseInput(),
        submissionId: "sub-3",
        coachSlug: "priya-anand",
        amountUsd: 100,
      });

      expect(await getTotalEarningsForCoach("marcus-reed")).toBe(88);
      expect(await getTotalEarningsForCoach("priya-anand")).toBe(100);
    });

    it("returns 0 when coach has no earnings", async () => {
      expect(await getTotalEarningsForCoach("nobody")).toBe(0);
    });
  });
});
