import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/submissions/[id]/transcribe/route";
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
  _resetTranscriptionAdapterForTests,
} from "@/lib/transcription";
import { MOCK_TRANSCRIPTIONS } from "@/lib/transcription/mock-transcription";

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

describe("transcription worker API", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    PLAYBACK_MANIFESTS.length = 0;
    MOCK_TRANSCRIPTIONS.length = 0;
    _resetTranscriptionAdapterForTests();
  });

  it("rejects unauthenticated requests", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);

    const res = await POST(
      makeRequest({}, { noteId: "note-1", audioUrl: "/uploads/audio/note-1.webm" }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(401);
  });

  it("returns 404 when submission not found", async () => {
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, { noteId: "note-1", audioUrl: "/uploads/audio/note-1.webm" }),
      makeParams("nonexistent"),
    );

    expect(res.status).toBe(404);
  });

  it("returns 403 when submission belongs to a different coach", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);

    const token = signSession(createSessionPayload("priya-anand"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, { noteId: "note-1", audioUrl: "/uploads/audio/note-1.webm" }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(403);
  });

  it("returns 400 when noteId is missing", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, { audioUrl: "/uploads/audio/note-1.webm" }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 when audioUrl is missing", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, { noteId: "note-1" }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(400);
  });

  it("transcribes a voice note and returns the result (mock mode)", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, { noteId: "note-1", audioUrl: "/uploads/audio/note-1.webm" }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.transcript).toContain("note-1");
    expect(data.provider).toBe("mock");
    expect(data.mode).toBe("mock");
    expect(MOCK_TRANSCRIPTIONS).toHaveLength(1);
    expect(MOCK_TRANSCRIPTIONS[0].noteId).toBe("note-1");
    expect(MOCK_TRANSCRIPTIONS[0].submissionId).toBe(sub.id);
  });

  it("returns 400 for invalid JSON body", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    const badRequest = {
      cookies: {
        get: (name: string) =>
          name === SESSION_COOKIE ? { value: token } : undefined,
      },
      json: async () => {
        throw new Error("Invalid JSON");
      },
    } as unknown as Parameters<typeof POST>[0];

    const res = await POST(badRequest, makeParams(sub.id));

    expect(res.status).toBe(400);
  });

  it("updates the note in an existing manifest with the transcript", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    // Pre-save a manifest with a note that has no transcript yet
    const manifest = buildLessonPlaybackManifest({
      videoUrl: "/uploads/swing.mp4",
      notes: [
        {
          id: "note-1",
          timecode: 1.2,
          audioUrl: "/uploads/audio/note-1.webm",
          audioDuration: 3,
          annotations: [],
          createdAt: 1700000000000,
          transcriptStatus: "pending",
        },
      ],
      submissionId: sub.id,
      coachSlug: "marcus-reed",
      parentEmail: "parent@example.com",
    });
    await savePlaybackManifest(sub.id, manifest);

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, { noteId: "note-1", audioUrl: "/uploads/audio/note-1.webm" }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);

    // Verify the note in the stored manifest was updated
    const stored = PLAYBACK_MANIFESTS[0];
    expect(stored).toBeDefined();
    const note = stored.notes.find((n: { id: string }) => n.id === "note-1");
    expect(note).toBeDefined();
    expect(note.transcriptRaw).toBeTruthy();
    expect(note.transcriptStatus).toBe("ready");
    expect(note.transcriptProvider).toBe("mock");
    expect(note.transcriptError).toBeUndefined();
  });

  it("works without an existing manifest (returns result only)", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    // No manifest saved — just transcribe and return
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }, { noteId: "note-99", audioUrl: "/uploads/audio/note-99.webm" }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.transcript).toContain("note-99");
    // No manifest should have been created
    expect(PLAYBACK_MANIFESTS).toHaveLength(0);
  });
});
