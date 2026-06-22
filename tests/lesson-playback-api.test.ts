import { beforeEach, describe, expect, it } from "vitest";
import {
  GET,
  POST,
} from "@/app/api/submissions/[id]/lesson-playback/route";
import {
  createSubmission,
  markSubmissionInReview,
  markSubmissionPaid,
  getSubmissionById,
  SUBMISSIONS,
  type SubmissionInput,
} from "@/lib/submissions";
import {
  PLAYBACK_MANIFESTS,
} from "@/lib/lesson/playback-store";
import { EARNINGS } from "@/lib/earnings";
import {
  createSessionPayload,
  SESSION_COOKIE,
  signSession,
} from "@/lib/auth/session";
import type { LessonPlaybackInput } from "@/lib/lesson/playback";

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
    notes: "",
    videoUrl: "/uploads/swing.mp4",
  };
}

function playbackInput(): LessonPlaybackInput {
  return {
    videoUrl: "/uploads/swing.mp4",
    notes: [
      {
        id: "note-1",
        timecode: 1.2,
        audioUrl: "/uploads/audio/note-1.webm",
        audioDuration: 3,
        annotations: [],
        createdAt: 1700000000000,
      },
    ],
  };
}

describe("lesson playback API", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    PLAYBACK_MANIFESTS.length = 0;
    EARNINGS.length = 0;
  });

  it("rejects unauthenticated processing", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);

    const res = await POST(makeRequest({}, playbackInput()), makeParams(sub.id));

    expect(res.status).toBe(401);
  });

  it("returns 403 when the submission belongs to a different coach", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);

    // Signed in as a different coach than the submission's owner
    const token = signSession(createSessionPayload("priya-anand"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, playbackInput()),
      makeParams(sub.id),
    );

    expect(res.status).toBe(403);
  });

  it("rejects processing with no notes", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, { videoUrl: "/uploads/swing.mp4", notes: [] }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(400);
  });

  it("stores a playback manifest and completes the submission", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, playbackInput()),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.notes).toHaveLength(1);
    expect(PLAYBACK_MANIFESTS).toHaveLength(1);
    expect((await getSubmissionById(sub.id))?.status).toBe("completed");
    expect(EARNINGS).toHaveLength(1);
  });

  it("returns the processed playback manifest", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    await POST(
      makeRequest({ [SESSION_COOKIE]: token }, playbackInput()),
      makeParams(sub.id),
    );
    const res = await GET(makeRequest({}), makeParams(sub.id));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.submissionId).toBe(sub.id);
    expect(data.videoUrl).toBe("/uploads/swing.mp4");
  });
});
