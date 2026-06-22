import { describe, expect, it } from "vitest";
import {
  createVideoAsset,
  createAudioAsset,
  createLessonDeliveryToken,
  createAiPackagingJob,
  type VideoAsset,
  type LessonDeliveryToken,
  type AiPackagingJob,
} from "@/lib/records";

describe("createVideoAsset", () => {
  it("builds a VideoAsset with generated id and timestamps", () => {
    const before = Date.now();
    const asset = createVideoAsset({
      submissionId: "sub-1",
      coachSlug: "marcus-reed",
      originalFilename: "swing.mp4",
      mimeType: "video/mp4",
      sizeBytes: 5_000_000,
      storageKey: "videos/sub-1/swing.mp4",
      storageProvider: "mock",
    });
    const after = Date.now();

    expect(asset.id).toBeTruthy();
    expect(asset.submissionId).toBe("sub-1");
    expect(asset.coachSlug).toBe("marcus-reed");
    expect(asset.uploadedAt).toBeGreaterThanOrEqual(before);
    expect(asset.uploadedAt).toBeLessThanOrEqual(after);
    expect(asset.storageProvider).toBe("mock");
  });

  it("rejects empty submissionId", () => {
    expect(() =>
      createVideoAsset({
        submissionId: "",
        coachSlug: "marcus-reed",
        originalFilename: "swing.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1,
        storageKey: "videos/swing.mp4",
        storageProvider: "mock",
      }),
    ).toThrow(/submissionId/i);
  });

  it("rejects non-positive sizeBytes", () => {
    expect(() =>
      createVideoAsset({
        submissionId: "sub-1",
        coachSlug: "marcus-reed",
        originalFilename: "swing.mp4",
        mimeType: "video/mp4",
        sizeBytes: 0,
        storageKey: "videos/swing.mp4",
        storageProvider: "mock",
      }),
    ).toThrow(/sizeBytes/i);
  });
});

describe("createAudioAsset", () => {
  it("builds an AudioAsset for a note", () => {
    const asset = createAudioAsset({
      noteId: "note-1",
      submissionId: "sub-1",
      coachSlug: "marcus-reed",
      mimeType: "audio/webm",
      sizeBytes: 50_000,
      storageKey: "audio/sub-1/note-1.webm",
      storageProvider: "mock",
      durationSec: 3.2,
    });
    expect(asset.id).toBeTruthy();
    expect(asset.noteId).toBe("note-1");
    expect(asset.durationSec).toBe(3.2);
  });

  it("rejects empty noteId", () => {
    expect(() =>
      createAudioAsset({
        noteId: "",
        submissionId: "sub-1",
        coachSlug: "marcus-reed",
        mimeType: "audio/webm",
        sizeBytes: 1,
        storageKey: "audio/x.webm",
        storageProvider: "mock",
        durationSec: 1,
      }),
    ).toThrow(/noteId/i);
  });
});

describe("createLessonDeliveryToken", () => {
  it("builds a token with expiry 30 days out", () => {
    const before = Date.now();
    const token = createLessonDeliveryToken({
      submissionId: "sub-1",
      parentEmail: "parent@example.com",
    });
    const expiresAt = token.expiresAt;

    expect(token.id).toBeTruthy();
    expect(token.token).toBeTruthy();
    expect(token.token).not.toBe(token.id);
    expect(token.revokedAt).toBeUndefined();
    expect(token.viewedAt).toBeUndefined();
    // ~30 days
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(expiresAt).toBeGreaterThanOrEqual(before + thirtyDaysMs - 1000);
    expect(expiresAt).toBeLessThanOrEqual(before + thirtyDaysMs + 5000);
  });

  it("rejects invalid email", () => {
    expect(() =>
      createLessonDeliveryToken({
        submissionId: "sub-1",
        parentEmail: "not-an-email",
      }),
    ).toThrow(/email/i);
  });

  it("generates unique tokens per call", () => {
    const a = createLessonDeliveryToken({
      submissionId: "sub-1",
      parentEmail: "parent@example.com",
    });
    const b = createLessonDeliveryToken({
      submissionId: "sub-1",
      parentEmail: "parent@example.com",
    });
    expect(a.token).not.toBe(b.token);
    expect(a.id).not.toBe(b.id);
  });

  it("respects a custom ttlDays", () => {
    const before = Date.now();
    const token = createLessonDeliveryToken({
      submissionId: "sub-1",
      parentEmail: "parent@example.com",
      ttlDays: 7,
    });
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(token.expiresAt).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(token.expiresAt).toBeLessThanOrEqual(before + sevenDaysMs + 5000);
  });
});

describe("createAiPackagingJob", () => {
  it("builds a queued job", () => {
    const before = Date.now();
    const job = createAiPackagingJob({
      submissionId: "sub-1",
      provider: "openai",
    });
    expect(job.status).toBe("queued");
    expect(job.startedAt).toBeUndefined();
    expect(job.completedAt).toBeUndefined();
    expect(job.error).toBeUndefined();
    expect(job.createdAt).toBeGreaterThanOrEqual(before);
  });

  it("rejects unknown provider", () => {
    expect(() =>
      createAiPackagingJob({
        submissionId: "sub-1",
        provider: "anthropic" as never,
      }),
    ).toThrow(/provider/i);
  });

  it("type allows status transitions", () => {
    const job: AiPackagingJob = createAiPackagingJob({
      submissionId: "sub-1",
      provider: "openai",
    });
    const running: AiPackagingJob = { ...job, status: "running", startedAt: Date.now() };
    const done: AiPackagingJob = {
      ...running,
      status: "completed",
      completedAt: Date.now(),
      outputSummary: "Focus on hip rotation.",
    };
    expect(done.status).toBe("completed");
    expect(done.outputSummary).toBe("Focus on hip rotation.");
  });
});

describe("record type completeness", () => {
  it("VideoAsset has storage fields", () => {
    const a: VideoAsset = createVideoAsset({
      submissionId: "s",
      coachSlug: "c",
      originalFilename: "f.mp4",
      mimeType: "video/mp4",
      sizeBytes: 1,
      storageKey: "k",
      storageProvider: "mock",
    });
    expect(a.storageKey).toBe("k");
    expect(a.storageProvider).toBe("mock");
  });

  it("LessonDeliveryToken is assignable to manifest.deliveryTokenId via id", () => {
    const t: LessonDeliveryToken = createLessonDeliveryToken({
      submissionId: "s",
      parentEmail: "p@example.com",
    });
    const deliveryTokenId: string = t.id;
    expect(deliveryTokenId).toBe(t.id);
  });
});
