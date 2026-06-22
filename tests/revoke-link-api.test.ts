import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/submissions/[id]/revoke-link/route";
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

async function seedApprovedSubmissionWithToken() {
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
  const token = await getDeliveryTokenRepository().create({
    submissionId: sub.id,
    parentEmail: "parent@example.com",
  });
  return { sub, token };
}

describe("POST /api/submissions/[id]/revoke-link — coach revokes delivery link", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    PLAYBACK_MANIFESTS.length = 0;
    DELIVERY_TOKENS.length = 0;
    _resetAllRepositoriesForTests();
  });

  it("rejects unauthenticated requests", async () => {
    const { sub } = await seedApprovedSubmissionWithToken();
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
    const { sub } = await seedApprovedSubmissionWithToken();
    const token = signSession(createSessionPayload("priya-anand"));
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: token }),
      makeParams(sub.id),
    );
    expect(res.status).toBe(403);
  });

  it("revokes all delivery tokens for the submission", async () => {
    const { sub, token } = await seedApprovedSubmissionWithToken();
    // Create a second token for the same submission
    await getDeliveryTokenRepository().create({
      submissionId: sub.id,
      parentEmail: "parent@example.com",
    });
    expect(DELIVERY_TOKENS.filter((t) => !t.revokedAt)).toHaveLength(2);

    const sessionToken = signSession(createSessionPayload("marcus-reed"));
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: sessionToken }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.revokedCount).toBe(2);

    // All tokens should now have revokedAt set
    const activeTokens = DELIVERY_TOKENS.filter((t) => !t.revokedAt);
    expect(activeTokens).toHaveLength(0);

    // The original token should be revoked
    const updated = DELIVERY_TOKENS.find((t) => t.id === token.id);
    expect(updated?.revokedAt).toBeDefined();
  });

  it("returns revokedCount=0 when no tokens exist", async () => {
    const sub = await createSubmission(validInput());
    await markSubmissionPaid(sub.id);

    const sessionToken = signSession(createSessionPayload("marcus-reed"));
    const res = await POST(
      makeRequest({ [SESSION_COOKIE]: sessionToken }),
      makeParams(sub.id),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.revokedCount).toBe(0);
  });

  it("is idempotent — revoking already-revoked tokens returns count of active ones revoked", async () => {
    const { sub } = await seedApprovedSubmissionWithToken();
    const sessionToken = signSession(createSessionPayload("marcus-reed"));

    // First revocation
    const res1 = await POST(
      makeRequest({ [SESSION_COOKIE]: sessionToken }),
      makeParams(sub.id),
    );
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.revokedCount).toBe(1);

    // Second revocation — no active tokens left
    const res2 = await POST(
      makeRequest({ [SESSION_COOKIE]: sessionToken }),
      makeParams(sub.id),
    );
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.revokedCount).toBe(0);
  });
});
