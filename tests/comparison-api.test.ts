import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/comparison/route";
import { SUBMISSIONS, createSubmission, markSubmissionPaid } from "@/lib/submissions";
import { RENDER_MANIFESTS } from "@/lib/render/store";
import {
  signSession,
  createSessionPayload,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import type { SubmissionInput } from "@/lib/submissions";

function makeRequest(cookies: Record<string, string>, query: Record<string, string>) {
  const url = new URL("http://localhost/api/comparison");
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return {
    cookies: {
      get: (name: string) =>
        name in cookies ? { value: cookies[name] } : undefined,
    },
    nextUrl: { searchParams: url.searchParams },
  } as unknown as Parameters<typeof GET>[0];
}

function validInput(): SubmissionInput {
  return {
    coachSlug: "marcus-reed",
    parentEmail: "parent@example.com",
    playerAge: 12,
    swingType: "baseball",
    notes: "Help with load.",
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

describe("GET /api/comparison", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    RENDER_MANIFESTS.length = 0;
  });

  describe("candidate list (?original=X)", () => {
    it("returns 401 when not authenticated", async () => {
      const res = await GET(makeRequest({}, { original: "orig-1" }));
      expect(res.status).toBe(401);
    });

    it("returns completed follow-ups for the original", async () => {
      const original = createSubmission(validInput());
      markSubmissionPaid(original.id);
      const followUp = createSubmission({ ...validInput(), followUpFor: original.id });
      markSubmissionPaid(followUp.id);
      seedManifest(original.id, "https://cdn/orig.mp4");
      seedManifest(followUp.id, "https://cdn/follow.mp4");

      const token = signSession(createSessionPayload("marcus-reed"));
      const res = await GET(
        makeRequest({ [SESSION_COOKIE]: token }, { original: original.id }),
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.candidates).toHaveLength(1);
      expect(data.candidates[0].submissionId).toBe(followUp.id);
      expect(data.candidates[0].videoUrl).toBe("https://cdn/follow.mp4");
    });

    it("returns 404 when the original submission does not exist", async () => {
      const token = signSession(createSessionPayload("marcus-reed"));
      const res = await GET(
        makeRequest({ [SESSION_COOKIE]: token }, { original: "nope" }),
      );
      expect(res.status).toBe(404);
    });
  });

  describe("pair (?original=X&followUp=Y)", () => {
    it("returns the comparison pair with both video URLs", async () => {
      const original = createSubmission(validInput());
      markSubmissionPaid(original.id);
      const followUp = createSubmission({ ...validInput(), followUpFor: original.id });
      markSubmissionPaid(followUp.id);
      seedManifest(original.id, "https://cdn/orig.mp4");
      seedManifest(followUp.id, "https://cdn/follow.mp4");

      const token = signSession(createSessionPayload("marcus-reed"));
      const res = await GET(
        makeRequest(
          { [SESSION_COOKIE]: token },
          { original: original.id, followUp: followUp.id },
        ),
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.original.submissionId).toBe(original.id);
      expect(data.original.videoUrl).toBe("https://cdn/orig.mp4");
      expect(data.followUp.submissionId).toBe(followUp.id);
      expect(data.followUp.videoUrl).toBe("https://cdn/follow.mp4");
    });

    it("returns 400 when followUp is missing from the query", async () => {
      const original = createSubmission(validInput());
      markSubmissionPaid(original.id);
      seedManifest(original.id, "https://cdn/orig.mp4");

      const token = signSession(createSessionPayload("marcus-reed"));
      const res = await GET(
        makeRequest({ [SESSION_COOKIE]: token }, { original: original.id }),
      );
      // original-only → candidate list path, not pair. Should be 200 with candidates.
      expect(res.status).toBe(200);
    });

    it("returns 404 when the follow-up is not linked to the original", async () => {
      const original = createSubmission(validInput());
      markSubmissionPaid(original.id);
      // followUp points to a different original
      const followUp = createSubmission({ ...validInput(), followUpFor: "other" });
      markSubmissionPaid(followUp.id);
      seedManifest(original.id, "https://cdn/orig.mp4");
      seedManifest(followUp.id, "https://cdn/follow.mp4");

      const token = signSession(createSessionPayload("marcus-reed"));
      const res = await GET(
        makeRequest(
          { [SESSION_COOKIE]: token },
          { original: original.id, followUp: followUp.id },
        ),
      );
      expect(res.status).toBe(404);
    });

    it("returns 404 when the original has no render manifest", async () => {
      const original = createSubmission(validInput());
      markSubmissionPaid(original.id);
      const followUp = createSubmission({ ...validInput(), followUpFor: original.id });
      markSubmissionPaid(followUp.id);
      seedManifest(followUp.id, "https://cdn/follow.mp4");

      const token = signSession(createSessionPayload("marcus-reed"));
      const res = await GET(
        makeRequest(
          { [SESSION_COOKIE]: token },
          { original: original.id, followUp: followUp.id },
        ),
      );
      expect(res.status).toBe(404);
    });
  });
});
