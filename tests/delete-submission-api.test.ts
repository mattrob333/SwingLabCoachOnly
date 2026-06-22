import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "@/app/api/submissions/[id]/route";
import {
  createSubmission,
  markSubmissionPaid,
  markSubmissionInReview,
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
import { getDeliveryTokenRepository } from "@/lib/repositories";
import { DELIVERY_TOKENS } from "@/lib/repositories/in-memory-delivery-tokens";
import { VIDEO_ASSETS } from "@/lib/repositories/in-memory-video-assets";
import { createVideoAssetRecord } from "@/lib/video-assets";
import { getStorageAdapter } from "@/lib/storage";
import { _resetAllRepositoriesForTests } from "@/lib/repositories";

function makeRequest(cookies: Record<string, string>) {
  return {
    cookies: {
      get: (name: string) =>
        name in cookies ? { value: cookies[name] } : undefined,
    },
  } as unknown as Parameters<typeof DELETE>[0];
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

async function seedFullyPopulatedSubmission() {
  const sub = await createSubmission(validInput());
  await markSubmissionPaid(sub.id);
  await markSubmissionInReview(sub.id);

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
      },
    ],
    submissionId: sub.id,
    coachSlug: "marcus-reed",
    parentEmail: "parent@example.com",
  });
  manifest.aiSummary = "Test summary";
  manifest.status = "approved";
  await savePlaybackManifest(sub.id, manifest);

  await getDeliveryTokenRepository().create({
    submissionId: sub.id,
    parentEmail: "parent@example.com",
  });
  await getDeliveryTokenRepository().create({
    submissionId: sub.id,
    parentEmail: "parent@example.com",
  });

  await createVideoAssetRecord({
    submissionId: sub.id,
    coachSlug: "marcus-reed",
    originalFilename: "swing.mp4",
    mimeType: "video/mp4",
    sizeBytes: 1024,
    storageKey: "submissions/swing-abc.mp4",
    storageProvider: "mock",
  });

  return sub;
}

describe("DELETE /api/submissions/[id] — coach deletes a submission + all its data", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    PLAYBACK_MANIFESTS.length = 0;
    DELIVERY_TOKENS.length = 0;
    VIDEO_ASSETS.length = 0;
    _resetAllRepositoriesForTests();
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    const sub = await seedFullyPopulatedSubmission();
    const res = await DELETE(makeRequest({}), makeParams(sub.id));
    expect(res.status).toBe(401);
  });

  it("returns 404 when submission not found", async () => {
    const token = signSession(createSessionPayload("marcus-reed"));
    const res = await DELETE(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams("nonexistent-id"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when submission belongs to a different coach", async () => {
    const sub = await seedFullyPopulatedSubmission();
    const token = signSession(createSessionPayload("priya-anand"));
    const res = await DELETE(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );
    expect(res.status).toBe(403);
  });

  it("deletes the submission record", async () => {
    const sub = await seedFullyPopulatedSubmission();
    expect(SUBMISSIONS.find((s) => s.id === sub.id)).toBeDefined();

    const token = signSession(createSessionPayload("marcus-reed"));
    const res = await DELETE(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true, submissionId: sub.id });
    expect(SUBMISSIONS.find((s) => s.id === sub.id)).toBeUndefined();
  });

  it("deletes the associated playback manifest", async () => {
    const sub = await seedFullyPopulatedSubmission();
    expect(
      PLAYBACK_MANIFESTS.find((m) => m.submissionId === sub.id),
    ).toBeDefined();

    const token = signSession(createSessionPayload("marcus-reed"));
    await DELETE(makeRequest({ [SESSION_COOKIE]: token }), makeParams(sub.id));

    expect(
      PLAYBACK_MANIFESTS.find((m) => m.submissionId === sub.id),
    ).toBeUndefined();
  });

  it("deletes all delivery tokens for the submission", async () => {
    const sub = await seedFullyPopulatedSubmission();
    expect(
      DELIVERY_TOKENS.filter((t) => t.submissionId === sub.id),
    ).toHaveLength(2);

    const token = signSession(createSessionPayload("marcus-reed"));
    await DELETE(makeRequest({ [SESSION_COOKIE]: token }), makeParams(sub.id));

    expect(
      DELIVERY_TOKENS.filter((t) => t.submissionId === sub.id),
    ).toHaveLength(0);
  });

  it("deletes the video asset record", async () => {
    const sub = await seedFullyPopulatedSubmission();
    expect(
      VIDEO_ASSETS.filter((a) => a.submissionId === sub.id),
    ).toHaveLength(1);

    const token = signSession(createSessionPayload("marcus-reed"));
    await DELETE(makeRequest({ [SESSION_COOKIE]: token }), makeParams(sub.id));

    expect(
      VIDEO_ASSETS.filter((a) => a.submissionId === sub.id),
    ).toHaveLength(0);
  });

  it("deletes the video file from the storage adapter (best-effort)", async () => {
    const sub = await seedFullyPopulatedSubmission();
    const deleteSpy = vi.spyOn(getStorageAdapter(), "delete");

    const token = signSession(createSessionPayload("marcus-reed"));
    await DELETE(makeRequest({ [SESSION_COOKIE]: token }), makeParams(sub.id));

    expect(deleteSpy).toHaveBeenCalledWith(
      "videos",
      "submissions/swing-abc.mp4",
    );
  });

  it("continues with record deletion even if storage delete throws", async () => {
    const sub = await seedFullyPopulatedSubmission();
    vi.spyOn(getStorageAdapter(), "delete").mockRejectedValue(
      new Error("storage unavailable"),
    );

    const token = signSession(createSessionPayload("marcus-reed"));
    const res = await DELETE(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    // Non-fatal: the submission + records are still deleted.
    expect(res.status).toBe(200);
    expect(SUBMISSIONS.find((s) => s.id === sub.id)).toBeUndefined();
    expect(
      VIDEO_ASSETS.filter((a) => a.submissionId === sub.id),
    ).toHaveLength(0);
  });

  it("succeeds when the submission has no manifest/tokens/video (sparse submission)", async () => {
    const sub = await createSubmission(validInput());
    // No manifest, no tokens, no video asset — just the submission record.

    const token = signSession(createSessionPayload("marcus-reed"));
    const res = await DELETE(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);
    expect(SUBMISSIONS.find((s) => s.id === sub.id)).toBeUndefined();
  });
});
