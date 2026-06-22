import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/submissions/[id]/approve/route";
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
import { DELIVERY_TOKENS } from "@/lib/repositories/in-memory-delivery-tokens";
import { MOCK_SENT_EMAILS } from "@/lib/email/mock-email";
import { _resetEmailAdapterForTests } from "@/lib/email";
import { _resetAllRepositoriesForTests } from "@/lib/repositories";

function makeRequest(cookies: Record<string, string>) {
  return {
    cookies: {
      get: (name: string) =>
        name in cookies ? { value: cookies[name] } : undefined,
    },
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

/** Seed a packaged manifest (simulates a prior POST /package). */
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

describe("POST /api/submissions/[id]/approve — coach approves AI-packaged lesson", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    PLAYBACK_MANIFESTS.length = 0;
    DELIVERY_TOKENS.length = 0;
    MOCK_SENT_EMAILS.length = 0;
    _resetAllRepositoriesForTests();
    _resetEmailAdapterForTests();
  });

  it("rejects unauthenticated requests", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await seedPackagedManifest(sub.id);

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
    await seedPackagedManifest(sub.id);

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

  it("returns 409 when manifest has not been packaged yet (no aiSummary)", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    // Save a manifest WITHOUT aiSummary (not packaged)
    await savePlaybackManifest(sub.id, makeManifest(sub.id));
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("package");
  });

  it("approves the lesson — transitions manifest status to 'approved'", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await seedPackagedManifest(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("approved");

    // Persisted
    const stored = PLAYBACK_MANIFESTS[0];
    expect(stored.status).toBe("approved");
  });

  it("creates a delivery token when the lesson is approved", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await seedPackagedManifest(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    expect(DELIVERY_TOKENS).toHaveLength(1);
    expect(DELIVERY_TOKENS[0].submissionId).toBe(sub.id);
    expect(DELIVERY_TOKENS[0].parentEmail).toBe("parent@example.com");
    expect(DELIVERY_TOKENS[0].token).toBeTruthy();
  });

  it("sends a lesson delivery email when the lesson is approved", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await seedPackagedManifest(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    expect(MOCK_SENT_EMAILS).toHaveLength(1);
    const email = MOCK_SENT_EMAILS[0];
    expect(email.to).toBe("parent@example.com");
    expect(email.submissionId).toBe(sub.id);
    expect(email.lessonUrl).toContain(`/lesson/${sub.id}?token=`);
    expect(email.coachName).toBeTruthy();
  });

  it("does not create a duplicate token when re-approving an already-approved lesson", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);
    await markSubmissionInReview(sub.id);
    await seedPackagedManifest(sub.id);
    const token = signSession(createSessionPayload("marcus-reed"));

    // First approval
    await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    // Second approval (idempotent — should not create a second token)
    await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    expect(DELIVERY_TOKENS).toHaveLength(1);
    expect(MOCK_SENT_EMAILS).toHaveLength(1);
  });
});
