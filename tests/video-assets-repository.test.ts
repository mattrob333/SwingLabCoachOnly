import { describe, it, expect, beforeEach } from "vitest";
import {
  VIDEO_ASSETS,
  InMemoryVideoAssetRepository,
} from "@/lib/repositories/in-memory-video-assets";
import type {
  VideoAssetRepository,
  VideoAssetRecordInput,
} from "@/lib/repositories/types";
import type { VideoAsset } from "@/lib/records";

function sampleInput(overrides: Partial<VideoAssetRecordInput> = {}): VideoAssetRecordInput {
  return {
    submissionId: "sub-1",
    coachSlug: "marcus-reed",
    originalFilename: "swing.mp4",
    mimeType: "video/mp4",
    sizeBytes: 5_000_000,
    storageKey: "videos/sub-1/abc.mp4",
    storageProvider: "mock",
    ...overrides,
  };
}

describe("InMemoryVideoAssetRepository", () => {
  let repo: VideoAssetRepository;

  beforeEach(() => {
    VIDEO_ASSETS.length = 0;
    repo = new InMemoryVideoAssetRepository();
  });

  it("reports mode 'mock'", () => {
    expect(repo.mode).toBe("mock");
  });

  it("creates a VideoAsset with a generated id and defaults", async () => {
    const before = Date.now();
    const asset = await repo.create(sampleInput());
    const after = Date.now();
    expect(asset.id).toMatch(/^vid_/);
    expect(asset.submissionId).toBe("sub-1");
    expect(asset.coachSlug).toBe("marcus-reed");
    expect(asset.storageKey).toBe("videos/sub-1/abc.mp4");
    expect(asset.uploadedAt).toBeGreaterThanOrEqual(before);
    expect(asset.uploadedAt).toBeLessThanOrEqual(after);
    expect(VIDEO_ASSETS).toContain(asset);
  });

  it("preserves a provided uploadedAt timestamp", async () => {
    const asset = await repo.create(sampleInput({ uploadedAt: 1700000000000 }));
    expect(asset.uploadedAt).toBe(1700000000000);
  });

  it("rejects invalid input (empty submissionId)", async () => {
    await expect(
      repo.create(sampleInput({ submissionId: "" })),
    ).rejects.toThrow(/submissionId/i);
  });

  it("getForSubmission returns the matching asset", async () => {
    await repo.create(sampleInput({ submissionId: "sub-1" }));
    await repo.create(sampleInput({ submissionId: "sub-2", storageKey: "videos/sub-2/x.mp4" }));
    const found = await repo.getForSubmission("sub-1");
    expect(found?.submissionId).toBe("sub-1");
  });

  it("getForSubmission returns undefined when none exists", async () => {
    expect(await repo.getForSubmission("nope")).toBeUndefined();
  });

  it("getById returns by id, undefined if missing", async () => {
    const asset = await repo.create(sampleInput());
    expect((await repo.getById(asset.id))?.id).toBe(asset.id);
    expect(await repo.getById("missing")).toBeUndefined();
  });

  it("listForCoach returns all assets for a coach, newest-first by uploadedAt with insertion tiebreak", async () => {
    const a1 = await repo.create(sampleInput({ uploadedAt: 1000 }));
    const a2 = await repo.create(sampleInput({ storageKey: "videos/sub-1/b.mp4", uploadedAt: 2000 }));
    const a3 = await repo.create(sampleInput({ coachSlug: "other-coach", storageKey: "videos/x.mp4" }));
    const list = await repo.listForCoach("marcus-reed");
    expect(list).toHaveLength(2);
    // newest first → a2 (2000) then a1 (1000)
    expect(list[0].id).toBe(a2.id);
    expect(list[1].id).toBe(a1.id);
    expect(list.find((a) => a.id === a3.id)).toBeUndefined();
  });

  it("listForCoach is deterministic when uploadedAt ties (later insertion first)", async () => {
    const a1 = await repo.create(sampleInput({ storageKey: "k1" }));
    const a2 = await repo.create(sampleInput({ storageKey: "k2" }));
    // same millisecond likely; force tie by overwriting uploadedAt
    (VIDEO_ASSETS[0] as VideoAsset).uploadedAt = 500;
    (VIDEO_ASSETS[1] as VideoAsset).uploadedAt = 500;
    const list = await repo.listForCoach("marcus-reed");
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe(a2.id); // later insertion = newer
    expect(list[1].id).toBe(a1.id);
  });
});
