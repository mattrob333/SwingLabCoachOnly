import { describe, it, expect, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/submissions/[id]/lesson-draft/route";
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
  } as unknown as Parameters<typeof GET>[0];
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

async function generateDraft(id: string, token: string) {
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
}

describe("GET /api/submissions/[id]/lesson-draft", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    LESSON_DRAFTS.length = 0;
  });

  it("returns the lesson draft for a submission without requiring auth (parent access)", async () => {
    const id = completeSubmission();
    const token = signSession(createSessionPayload("marcus-reed"));
    await generateDraft(id, token);

    // No auth cookie — parent accesses via link
    const res = await GET(makeRequest({}), makeParams(id));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toContain("Baseball");
  });

  it("returns 404 when no draft exists for the submission", async () => {
    const id = completeSubmission();

    const res = await GET(makeRequest({}), makeParams(id));
    expect(res.status).toBe(404);
  });

  it("returns 404 when the submission does not exist", async () => {
    const res = await GET(makeRequest({}), makeParams("nonexistent"));
    expect(res.status).toBe(404);
  });

  it("returns the draft with all fields", async () => {
    const id = completeSubmission();
    const token = signSession(createSessionPayload("marcus-reed"));
    await generateDraft(id, token);

    const res = await GET(makeRequest({}), makeParams(id));
    const data = await res.json();

    expect(data.id).toBeTruthy();
    expect(data.submissionId).toBe(id);
    expect(data.title).toBeTruthy();
    expect(data.summary).toBeTruthy();
    expect(Array.isArray(data.keyPoints)).toBe(true);
    expect(Array.isArray(data.drills)).toBe(true);
    expect(data.coachNotes).toBe("");
    expect(data.status).toBe("draft");
    expect(data.generatedAt).toBeGreaterThan(0);
  });
});
