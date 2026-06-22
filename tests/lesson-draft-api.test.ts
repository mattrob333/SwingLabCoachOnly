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
import { DELIVERY_TOKENS } from "@/lib/repositories/in-memory-delivery-tokens";
import { MOCK_SENT_EMAILS } from "@/lib/email/mock-email";
import { _resetAllRepositoriesForTests } from "@/lib/repositories";
import { _resetEmailAdapterForTests } from "@/lib/email";

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

async function completeSubmission(): Promise<string> {
  const sub = await createSubmission(validInput());
  await markSubmissionPaid(sub.id);
  await markSubmissionInReview(sub.id);
  await markSubmissionRendering(sub.id);
  await markSubmissionCompleted(sub.id);
  return sub.id;
}

describe("POST /api/submissions/[id]/lesson-draft", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    LESSON_DRAFTS.length = 0;
    DELIVERY_TOKENS.length = 0;
    MOCK_SENT_EMAILS.length = 0;
    _resetAllRepositoriesForTests();
    _resetEmailAdapterForTests();
  });

  it("generates a lesson draft for a completed submission", async () => {
    const id = await completeSubmission();
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
    const id = await completeSubmission();
    const res = await POST(
      makeRequest({}, { swingType: "baseball", manifest: { videoUrl: "x", audioLayers: [], annotationLayers: [], events: [], createdAt: 0 } }),
      makeParams(id),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when the submission belongs to a different coach", async () => {
    const id = await completeSubmission();
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
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
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
    DELIVERY_TOKENS.length = 0;
    MOCK_SENT_EMAILS.length = 0;
    _resetAllRepositoriesForTests();
    _resetEmailAdapterForTests();
  });

  it("approves a lesson draft", async () => {
    const id = await completeSubmission();
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
    const id = await completeSubmission();
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
    const id = await completeSubmission();
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
    const id = await completeSubmission();
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }, { status: "approved" }),
      makeParams(id),
    );
    expect(res.status).toBe(404);
  });

  it("returns 401 when not authenticated", async () => {
    const id = await completeSubmission();
    const res = await PATCH(
      makeRequest({}, { status: "approved" }),
      makeParams(id),
    );
    expect(res.status).toBe(401);
  });

  // ── Delivery token + email wiring (Wave 2 Task 4 Sub-slice C) ──

  it("creates a delivery token when the lesson is approved", async () => {
    const id = await completeSubmission();
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

    await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }, { status: "approved" }),
      makeParams(id),
    );

    expect(DELIVERY_TOKENS).toHaveLength(1);
    expect(DELIVERY_TOKENS[0].submissionId).toBe(id);
    expect(DELIVERY_TOKENS[0].parentEmail).toBe("parent@example.com");
    expect(DELIVERY_TOKENS[0].token).toBeTruthy();
  });

  it("sends a lesson delivery email when the lesson is approved", async () => {
    const id = await completeSubmission();
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

    await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }, { status: "approved" }),
      makeParams(id),
    );

    expect(MOCK_SENT_EMAILS).toHaveLength(1);
    const email = MOCK_SENT_EMAILS[0];
    expect(email.to).toBe("parent@example.com");
    expect(email.submissionId).toBe(id);
    expect(email.lessonUrl).toContain(`/lesson/${id}?token=`);
    expect(email.coachName).toBeTruthy();
  });

  it("does not create a duplicate token when approving an already-approved draft", async () => {
    const id = await completeSubmission();
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

    await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }, { status: "approved" }),
      makeParams(id),
    );
    // Re-approve (idempotent — should not create a second token)
    await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }, { status: "approved" }),
      makeParams(id),
    );

    expect(DELIVERY_TOKENS).toHaveLength(1);
    expect(MOCK_SENT_EMAILS).toHaveLength(1);
  });

  it("does not create a delivery token when rejecting", async () => {
    const id = await completeSubmission();
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

    await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }, { status: "rejected" }),
      makeParams(id),
    );

    expect(DELIVERY_TOKENS).toHaveLength(0);
    expect(MOCK_SENT_EMAILS).toHaveLength(0);
  });
});
