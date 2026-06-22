import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/submissions/[id]/package/route";
import {
  createSubmission,
  markSubmissionInReview,
  markSubmissionPaid,
  SUBMISSIONS,
  type SubmissionInput,
} from "@/lib/submissions";
import {
  PLAYBACK_MANIFESTS,
  savePlaybackManifest,
} from "@/lib/lesson/playback-store";
import { buildLessonPlaybackManifest } from "@/lib/lesson/playback";
import {
  createSessionPayload,
  SESSION_COOKIE,
  signSession,
} from "@/lib/auth/session";
import {
  _resetPackagingAdapterForTests,
} from "@/lib/packaging";
import { MOCK_PACKAGINGS } from "@/lib/packaging/mock-packaging";

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

function makeManifest(submissionId: string) {
  return buildLessonPlaybackManifest({
    videoUrl: "/uploads/swing.mp4",
    notes: [
      {
        id: "note-1",
        timecode: 1.2,
        audioUrl: "/uploads/audio/note-1.webm",
        audioDuration: 3,
        annotations: [],
        createdAt: 1700000000000,
        transcriptStatus: "ready",
        transcriptRaw: "Keep your elbow up and follow through.",
      },
      {
        id: "note-2",
        timecode: 5.0,
        audioUrl: "/uploads/audio/note-2.webm",
        audioDuration: 4,
        annotations: [],
        createdAt: 1700000000001,
        transcriptStatus: "ready",
        transcriptRaw: "Good hip rotation on this one.",
      },
    ],
    submissionId,
    coachSlug: "marcus-reed",
    parentEmail: "parent@example.com",
  });
}

describe("packaging worker API", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    PLAYBACK_MANIFESTS.length = 0;
    MOCK_PACKAGINGS.length = 0;
    _resetPackagingAdapterForTests();
  });

  it("rejects unauthenticated requests", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await savePlaybackManifest(sub.id, makeManifest(sub.id));

    const res = await POST(makeRequest({}), makeParams(sub.id));

    expect(res.status).toBe(401);
  });

  it("returns 404 when submission not found", async () => {
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams("nonexistent"),
    );

    expect(res.status).toBe(404);
  });

  it("returns 403 when submission belongs to a different coach", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await savePlaybackManifest(sub.id, makeManifest(sub.id));

    const token = signSession(createSessionPayload("priya-anand"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(403);
  });

  it("returns 404 when no manifest exists for the submission", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(404);
  });

  it("packages the manifest and returns the result (mock mode)", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await savePlaybackManifest(sub.id, makeManifest(sub.id));
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.noteTitles).toHaveLength(2);
    expect(data.noteTitles[0].noteId).toBe("note-1");
    expect(data.noteTitles[1].noteId).toBe("note-2");
    expect(data.summary).toBeTruthy();
    expect(data.provider).toBe("mock");
    expect(data.mode).toBe("mock");
  });

  it("persists aiSummary and aiNoteTitles onto the stored manifest", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await savePlaybackManifest(sub.id, makeManifest(sub.id));
    const token = signSession(createSessionPayload("marcus-reed"));

    await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    const stored = PLAYBACK_MANIFESTS[0];
    expect(stored).toBeDefined();
    expect(stored.aiSummary).toBeTruthy();
    expect(stored.aiSummary).toContain("Marcus");
    expect(stored.aiNoteTitles).toBeDefined();
    expect(stored.aiNoteTitles).toHaveLength(2);
    expect(stored.aiNoteTitles![0].noteId).toBe("note-1");
    expect(stored.aiNoteTitles![1].noteId).toBe("note-2");
  });

  it("stores a MOCK_PACKAGING entry for inspection", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await savePlaybackManifest(sub.id, makeManifest(sub.id));
    const token = signSession(createSessionPayload("marcus-reed"));

    await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    expect(MOCK_PACKAGINGS).toHaveLength(1);
    expect(MOCK_PACKAGINGS[0].submissionId).toBe(sub.id);
    expect(MOCK_PACKAGINGS[0].noteTitles).toHaveLength(2);
  });

  it("handles adapter failure gracefully (500)", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    // Save a manifest with zero notes — buildLessonPlaybackManifest would throw,
    // so create one manually with an empty notes array to simulate a bad manifest.
    const manifest = {
      ...makeManifest(sub.id),
      notes: [],
    };
    await savePlaybackManifest(sub.id, manifest);
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    // Adapter returns success: false for empty notes, route returns 500
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeTruthy();
  });
});
