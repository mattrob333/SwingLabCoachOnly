import { describe, it, expect, beforeEach } from "vitest";
import { POST, PATCH } from "@/app/api/submissions/[id]/lesson-draft/route";
import {
  createSubmission,
  markSubmissionPaid,
  markSubmissionInReview,
  markSubmissionRendering,
  markSubmissionCompleted,
  SUBMISSIONS,
  type SubmissionInput,
} from "@/lib/submissions";
import { LESSON_DRAFTS } from "@/lib/ai/lesson-draft-store";
import {
  signSession,
  createSessionPayload,
  SESSION_COOKIE,
} from "@/lib/auth/session";

function makeRequest(cookies: Record<string, string>, body?: unknown) {
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

function completeSubmission(): string {
  const sub = createSubmission(validInput());
  markSubmissionPaid(sub.id);
  markSubmissionInReview(sub.id);
  markSubmissionRendering(sub.id);
  markSubmissionCompleted(sub.id);
  return sub.id;
}

describe("POST /api/submissions/[id]/lesson-draft", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    LESSON_DRAFTS.length = 0;
  });

  it("generates a lesson draft for a completed submission", async () => {
    const id = completeSubmission();
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, {
        swingType: "baseball",
        manifest: {
          videoUrl: "https://example.com/swing.mp4",
          audioLayers: [],
          annotationLayers: [
            {
              type: "annotation",
              timecode: 5,
              color: "#ff0000",
              pointCount: 2,
              points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
            },
          ],
          events: [],
          createdAt: 1700000000000,
        },
      }),
      makeParams(id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toContain("Baseball");
    expect(data.status).toBe("draft");
    expect(data.keyPoints).toHaveLength(1);
    expect(LESSON_DRAFTS).toHaveLength(1);
  });

  it("returns 401 when not authenticated", async () => {
    const id = completeSubmission();
    const res = await POST(
      makeRequest({}, { swingType: "baseball", manifest: { videoUrl: "x", audioLayers: [], annotationLayers: [], events: [], createdAt: 0 } }),
      makeParams(id),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when the submission belongs to a different coach", async () => {
    const id = completeSubmission();
    const token = signSession(createSessionPayload("priya-anand"));
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, { swingType: "baseball", manifest: { videoUrl: "x", audioLayers: [], annotationLayers: [], events: [], createdAt: 0 } }),
      makeParams(id),
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when the submission does not exist", async () => {
    const token = signSession(createSessionPayload("marcus-reed"));
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, { swingType: "baseball", manifest: { videoUrl: "x", audioLayers: [], annotationLayers: [], events: [], createdAt: 0 } }),
      makeParams("nonexistent"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 when the submission is not completed", async () => {
    const sub = createSubmission(validInput());
    markSubmissionPaid(sub.id);
    markSubmissionInReview(sub.id);
    // still in_review, not completed

    const token = signSession(createSessionPayload("marcus-reed"));
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, { swingType: "baseball", manifest: { videoUrl: "x", audioLayers: [], annotationLayers: [], events: [], createdAt: 0 } }),
      makeParams(sub.id),
    );
    expect(res.status).toBe(409);
  });
});

describe("PATCH /api/submissions/[id]/lesson-draft", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    LESSON_DRAFTS.length = 0;
  });

  it("approves a lesson draft", async () => {
    const id = completeSubmission();
    const token = signSession(createSessionPayload("marcus-reed"));

    // Generate first
    await POST(
      makeRequest({ [SESSION_COOKIE]: token }, {
        swingType: "baseball",
        manifest: {
          videoUrl: "https://example.com/swing.mp4",
          audioLayers: [],
          annotationLayers: [],
          events: [],
          createdAt: 1700000000000,
        },
      }),
      makeParams(id),
    );

    // Approve
    const res = await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }, { status: "approved" }),
      makeParams(id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("approved");
  });

  it("rejects a lesson draft", async () => {
    const id = completeSubmission();
    const token = signSession(createSessionPayload("marcus-reed"));

    await POST(
      makeRequest({ [SESSION_COOKIE]: token }, {
        swingType: "baseball",
        manifest: {
          videoUrl: "https://example.com/swing.mp4",
          audioLayers: [],
          annotationLayers: [],
          events: [],
          createdAt: 1700000000000,
        },
      }),
      makeParams(id),
    );

    const res = await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }, { status: "rejected" }),
      makeParams(id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("rejected");
  });

  it("updates coach notes", async () => {
    const id = completeSubmission();
    const token = signSession(createSessionPayload("marcus-reed"));

    await POST(
      makeRequest({ [SESSION_COOKIE]: token }, {
        swingType: "baseball",
        manifest: {
          videoUrl: "https://example.com/swing.mp4",
          audioLayers: [],
          annotationLayers: [],
          events: [],
          createdAt: 1700000000000,
        },
      }),
      makeParams(id),
    );

    const res = await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }, { coachNotes: "Great work!" }),
      makeParams(id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.coachNotes).toBe("Great work!");
  });

  it("returns 404 when no draft exists for the submission", async () => {
    const id = completeSubmission();
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }, { status: "approved" }),
      makeParams(id),
    );
    expect(res.status).toBe(404);
  });

  it("returns 401 when not authenticated", async () => {
    const id = completeSubmission();
    const res = await PATCH(
      makeRequest({}, { status: "approved" }),
      makeParams(id),
    );
    expect(res.status).toBe(401);
  });
});
