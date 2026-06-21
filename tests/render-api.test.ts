import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/submissions/[id]/render/route";
import {
  createSubmission,
  markSubmissionPaid,
  markSubmissionInReview,
  getSubmissionById,
  SUBMISSIONS,
  type SubmissionInput,
} from "@/lib/submissions";
import { RENDER_MANIFESTS } from "@/lib/render/store";
import {
  signSession,
  createSessionPayload,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import type { RenderInput } from "@/lib/render/pipeline";

function makeRequest(cookies: Record<string, string>, body: unknown) {
  return {
    cookies: {
      get: (name: string) =>
        name in cookies ? { value: cookies[name] } : undefined,
    },
    json: async () => body,
  } as unknown as Parameters<typeof POST>[0];
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
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

function validRenderInput(): RenderInput {
  return {
    videoUrl: "https://example.com/swing.mp4",
    segments: [
      {
        id: "seg-1",
        startTime: 5,
        duration: 10,
        audioBlobUrl: "blob:abc",
      },
    ],
    strokes: [
      {
        id: "stroke-1",
        timecode: 7,
        color: "#ff0000",
        points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
      },
    ],
    events: [
      {
        id: "evt-1",
        type: "play",
        timecode: 0,
        payload: null,
        wallClock: 1700000000000,
      },
    ],
  };
}

describe("POST /api/submissions/[id]/render", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    RENDER_MANIFESTS.length = 0;
  });

  it("builds a manifest, stores it, and transitions submission to completed", async () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);
    markSubmissionInReview(sub.id);

    const token = signSession(createSessionPayload("marcus-reed"));
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, validRenderInput()),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.videoUrl).toBe("https://example.com/swing.mp4");
    expect(data.audioLayers).toHaveLength(1);
    expect(data.annotationLayers).toHaveLength(1);
    expect(data.events).toHaveLength(1);
    expect(getSubmissionById(sub.id)?.status).toBe("completed");
    expect(RENDER_MANIFESTS).toHaveLength(1);
    expect(RENDER_MANIFESTS[0].videoUrl).toBe(
      "https://example.com/swing.mp4",
    );
  });

  it("returns 401 when not authenticated", async () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);
    markSubmissionInReview(sub.id);

    const res = await POST(
      makeRequest({}, validRenderInput()),
      makeParams(sub.id),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when the submission belongs to a different coach", async () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);
    markSubmissionInReview(sub.id);

    const token = signSession(createSessionPayload("priya-anand"));
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, validRenderInput()),
      makeParams(sub.id),
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when the submission does not exist", async () => {
    const token = signSession(createSessionPayload("marcus-reed"));
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, validRenderInput()),
      makeParams("nonexistent-id"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 when the submission is not in_review", async () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);
    // still "paid", not in_review

    const token = signSession(createSessionPayload("marcus-reed"));
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, validRenderInput()),
      makeParams(sub.id),
    );
    expect(res.status).toBe(409);
  });

  it("returns 400 when the request body has an empty videoUrl", async () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);
    markSubmissionInReview(sub.id);

    const token = signSession(createSessionPayload("marcus-reed"));
    const badInput = { ...validRenderInput(), videoUrl: "" };
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, badInput),
      makeParams(sub.id),
    );
    expect(res.status).toBe(400);
  });
});
