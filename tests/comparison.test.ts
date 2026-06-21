import { describe, it, expect, beforeEach } from "vitest";
import {
  getComparisonPair,
  listComparisonCandidates,
} from "@/lib/comparison";
import { SUBMISSIONS } from "@/lib/submissions";
import { RENDER_MANIFESTS } from "@/lib/render/store";
import type { Submission } from "@/lib/submissions";

function makeSubmission(
  overrides: Partial<Submission> & { id: string },
): Submission {
  return {
    id: overrides.id,
    coachSlug: overrides.coachSlug ?? "marcus-reed",
    parentEmail: overrides.parentEmail ?? "parent@example.com",
    playerAge: overrides.playerAge ?? 12,
    swingType: overrides.swingType ?? "tee",
    notes: overrides.notes ?? "",
    status: overrides.status ?? "completed",
    createdAt: overrides.createdAt ?? new Date("2026-06-01T00:00:00Z"),
    ...(overrides.followUpFor ? { followUpFor: overrides.followUpFor } : {}),
  };
}

function seedManifest(submissionId: string, videoUrl: string) {
  RENDER_MANIFESTS.push({
    submissionId,
    videoUrl,
    audioLayers: [],
    annotationLayers: [],
    events: [],
    createdAt: Date.now(),
  });
}

describe("comparison mode (Phase 10)", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    RENDER_MANIFESTS.length = 0;
  });

  describe("getComparisonPair", () => {
    it("returns original + follow-up with their video URLs", () => {
      const original = makeSubmission({ id: "orig-1" });
      const followUp = makeSubmission({
        id: "follow-1",
        followUpFor: "orig-1",
        createdAt: new Date("2026-06-10T00:00:00Z"),
      });
      SUBMISSIONS.push(original, followUp);
      seedManifest("orig-1", "https://cdn/original.mp4");
      seedManifest("follow-1", "https://cdn/followup.mp4");

      const pair = getComparisonPair("orig-1", "follow-1");

      expect(pair.original.submission.id).toBe("orig-1");
      expect(pair.followUp.submission.id).toBe("follow-1");
      expect(pair.original.videoUrl).toBe("https://cdn/original.mp4");
      expect(pair.followUp.videoUrl).toBe("https://cdn/followup.mp4");
    });

    it("throws if the original submission does not exist", () => {
      const followUp = makeSubmission({
        id: "follow-1",
        followUpFor: "orig-1",
      });
      SUBMISSIONS.push(followUp);
      seedManifest("follow-1", "https://cdn/followup.mp4");

      expect(() => getComparisonPair("orig-1", "follow-1")).toThrow(
        /Original submission not found/,
      );
    });

    it("throws if the follow-up submission does not exist", () => {
      const original = makeSubmission({ id: "orig-1" });
      SUBMISSIONS.push(original);
      seedManifest("orig-1", "https://cdn/original.mp4");

      expect(() => getComparisonPair("orig-1", "follow-1")).toThrow(
        /Follow-up submission not found/,
      );
    });

    it("throws if the follow-up is not linked to the original", () => {
      const original = makeSubmission({ id: "orig-1" });
      // followUpFor points to a DIFFERENT original
      const followUp = makeSubmission({
        id: "follow-1",
        followUpFor: "other-orig",
      });
      SUBMISSIONS.push(original, followUp);
      seedManifest("orig-1", "https://cdn/original.mp4");
      seedManifest("follow-1", "https://cdn/followup.mp4");

      expect(() => getComparisonPair("orig-1", "follow-1")).toThrow(
        /not a follow-up of/,
      );
    });

    it("throws if the original has no render manifest", () => {
      const original = makeSubmission({ id: "orig-1" });
      const followUp = makeSubmission({
        id: "follow-1",
        followUpFor: "orig-1",
      });
      SUBMISSIONS.push(original, followUp);
      seedManifest("follow-1", "https://cdn/followup.mp4");

      expect(() => getComparisonPair("orig-1", "follow-1")).toThrow(
        /Original submission has no rendered lesson/,
      );
    });

    it("throws if the follow-up has no render manifest", () => {
      const original = makeSubmission({ id: "orig-1" });
      const followUp = makeSubmission({
        id: "follow-1",
        followUpFor: "orig-1",
      });
      SUBMISSIONS.push(original, followUp);
      seedManifest("orig-1", "https://cdn/original.mp4");

      expect(() => getComparisonPair("orig-1", "follow-1")).toThrow(
        /Follow-up submission has no rendered lesson/,
      );
    });
  });

  describe("listComparisonCandidates", () => {
    it("returns completed follow-ups for an original, newest-first", () => {
      const original = makeSubmission({ id: "orig-1" });
      const older = makeSubmission({
        id: "follow-old",
        followUpFor: "orig-1",
        createdAt: new Date("2026-06-05T00:00:00Z"),
      });
      const newer = makeSubmission({
        id: "follow-new",
        followUpFor: "orig-1",
        createdAt: new Date("2026-06-15T00:00:00Z"),
      });
      SUBMISSIONS.push(original, older, newer);
      seedManifest("orig-1", "https://cdn/original.mp4");
      seedManifest("follow-old", "https://cdn/old.mp4");
      seedManifest("follow-new", "https://cdn/new.mp4");

      const candidates = listComparisonCandidates("orig-1");
      expect(candidates.map((c) => c.submission.id)).toEqual([
        "follow-new",
        "follow-old",
      ]);
    });

    it("excludes follow-ups that have no render manifest yet", () => {
      const original = makeSubmission({ id: "orig-1" });
      const completed = makeSubmission({
        id: "follow-done",
        followUpFor: "orig-1",
      });
      const notRendered = makeSubmission({
        id: "follow-pending",
        followUpFor: "orig-1",
        status: "in_review",
      });
      SUBMISSIONS.push(original, completed, notRendered);
      seedManifest("orig-1", "https://cdn/original.mp4");
      seedManifest("follow-done", "https://cdn/done.mp4");

      const candidates = listComparisonCandidates("orig-1");
      expect(candidates.map((c) => c.submission.id)).toEqual(["follow-done"]);
    });

    it("returns an empty array when there are no follow-ups", () => {
      const original = makeSubmission({ id: "orig-1" });
      SUBMISSIONS.push(original);
      seedManifest("orig-1", "https://cdn/original.mp4");

      expect(listComparisonCandidates("orig-1")).toEqual([]);
    });

    it("breaks same-timestamp ties by insertion order (later = newer)", () => {
      const ts = new Date("2026-06-10T00:00:00Z");
      const original = makeSubmission({ id: "orig-1" });
      const first = makeSubmission({
        id: "follow-first",
        followUpFor: "orig-1",
        createdAt: ts,
      });
      const second = makeSubmission({
        id: "follow-second",
        followUpFor: "orig-1",
        createdAt: ts,
      });
      SUBMISSIONS.push(original, first, second);
      seedManifest("orig-1", "https://cdn/original.mp4");
      seedManifest("follow-first", "https://cdn/first.mp4");
      seedManifest("follow-second", "https://cdn/second.mp4");

      const candidates = listComparisonCandidates("orig-1");
      // second was pushed later → appears first (newest)
      expect(candidates.map((c) => c.submission.id)).toEqual([
        "follow-second",
        "follow-first",
      ]);
    });
  });
});
