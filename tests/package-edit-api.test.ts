import { beforeEach, describe, expect, it } from "vitest";
import { PATCH } from "@/app/api/submissions/[id]/package/route";
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
  } as unknown as Parameters<typeof PATCH>[0];
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

/** Seed a manifest that already has AI output (simulates a prior POST /package). */
async function seedPackagedManifest(submissionId: string) {
  const manifest = makeManifest(submissionId);
  manifest.aiSummary = "AI-generated summary for 2 notes.";
  manifest.aiNoteTitles = [
    { noteId: "note-1", title: "AI Title One" },
    { noteId: "note-2", title: "AI Title Two" },
  ];
  await savePlaybackManifest(submissionId, manifest);
  return manifest;
}

describe("PATCH /api/submissions/[id]/package — edit AI output", () => {
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
    await seedPackagedManifest(sub.id);

    const res = await PATCH(makeRequest({}), makeParams(sub.id));

    expect(res.status).toBe(401);
  });

  it("returns 404 when submission not found", async () => {
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams("nonexistent"),
    );

    expect(res.status).toBe(404);
  });

  it("returns 403 when submission belongs to a different coach", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await seedPackagedManifest(sub.id);

    const token = signSession(createSessionPayload("priya-anand"));

    const res = await PATCH(
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

    const res = await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(404);
  });

  it("returns 400 on invalid JSON body", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await seedPackagedManifest(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    const badRequest = {
      cookies: {
        get: (name: string) =>
          name === SESSION_COOKIE ? { value: token } : undefined,
      },
      json: async () => {
        throw new Error("invalid json");
      },
    } as unknown as Parameters<typeof PATCH>[0];

    const res = await PATCH(badRequest, makeParams(sub.id));

    expect(res.status).toBe(400);
  });

  it("updates aiSummary on the manifest", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await seedPackagedManifest(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }, { aiSummary: "Coach-edited summary." }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.aiSummary).toBe("Coach-edited summary.");
    // aiNoteTitles should be preserved
    expect(data.aiNoteTitles).toHaveLength(2);

    // Persisted to store
    const stored = PLAYBACK_MANIFESTS[0];
    expect(stored.aiSummary).toBe("Coach-edited summary.");
  });

  it("updates aiNoteTitles on the manifest", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await seedPackagedManifest(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    const newTitles = [
      { noteId: "note-1", title: "Coach Title One" },
      { noteId: "note-2", title: "Coach Title Two" },
    ];

    const res = await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }, { aiNoteTitles: newTitles }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.aiNoteTitles).toEqual(newTitles);
    // aiSummary should be preserved
    expect(data.aiSummary).toBe("AI-generated summary for 2 notes.");

    const stored = PLAYBACK_MANIFESTS[0];
    expect(stored.aiNoteTitles).toEqual(newTitles);
  });

  it("updates both aiSummary and aiNoteTitles in one request", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await seedPackagedManifest(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    const newTitles = [
      { noteId: "note-1", title: "Edited One" },
      { noteId: "note-2", title: "Edited Two" },
    ];

    const res = await PATCH(
      makeRequest(
        { [SESSION_COOKIE]: token },
        { aiSummary: "Both edited.", aiNoteTitles: newTitles },
      ),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.aiSummary).toBe("Both edited.");
    expect(data.aiNoteTitles).toEqual(newTitles);
  });

  it("ignores undefined fields (partial update — preserves existing)", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await seedPackagedManifest(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    // Only send aiSummary, don't send aiNoteTitles — it should be preserved
    const res = await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }, { aiSummary: "New summary only." }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.aiSummary).toBe("New summary only.");
    expect(data.aiNoteTitles).toHaveLength(2);
    expect(data.aiNoteTitles[0].title).toBe("AI Title One");
  });

  it("rejects aiNoteTitles with mismatched noteId (not in manifest)", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await seedPackagedManifest(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    const badTitles = [
      { noteId: "note-1", title: "Valid" },
      { noteId: "nonexistent-note", title: "Invalid" },
    ];

    const res = await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }, { aiNoteTitles: badTitles }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("noteId");
  });

  it("can clear aiSummary by sending empty string", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await seedPackagedManifest(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await PATCH(
      makeRequest({ [SESSION_COOKIE]: token }, { aiSummary: "" }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.aiSummary).toBe("");
  });
});
