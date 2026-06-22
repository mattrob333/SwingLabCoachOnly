import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MockStorageAdapter } from "@/lib/storage/mock-storage";
import type { StorageAdapter, StorageBucket } from "@/lib/storage/types";

const BUCKETS: StorageBucket[] = ["videos", "audio", "thumbnails", "manifests"];

describe("MockStorageAdapter", () => {
  let baseDir: string;
  let adapter: StorageAdapter;

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), "sl-storage-"));
    adapter = new MockStorageAdapter(baseDir);
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("reports mode 'mock'", () => {
    expect(adapter.mode).toBe("mock");
  });

  it("uploads bytes and returns a URL containing bucket + key", async () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    const asset = await adapter.upload("videos", "swing-001.mp4", data, "video/mp4");
    expect(asset.bucket).toBe("videos");
    expect(asset.key).toBe("swing-001.mp4");
    expect(asset.size).toBe(4);
    expect(asset.contentType).toBe("video/mp4");
    expect(asset.url).toContain("videos");
    expect(asset.url).toContain("swing-001.mp4");
  });

  it("persists the file to disk under <baseDir>/<bucket>/<key>", async () => {
    const data = new Uint8Array([10, 20, 30]);
    await adapter.upload("audio", "note-1.webm", data, "audio/webm");
    const written = await readFile(join(baseDir, "audio", "note-1.webm"));
    expect(Array.from(written)).toEqual([10, 20, 30]);
  });

  it("exists() returns true after upload, false before", async () => {
    expect(await adapter.exists("thumbnails", "thumb-1.jpg")).toBe(false);
    await adapter.upload("thumbnails", "thumb-1.jpg", new Uint8Array([0xff]), "image/jpeg");
    expect(await adapter.exists("thumbnails", "thumb-1.jpg")).toBe(true);
  });

  it("delete() removes the file", async () => {
    await adapter.upload("manifests", "lesson-1.json", new Uint8Array([1]), "application/json");
    expect(await adapter.exists("manifests", "lesson-1.json")).toBe(true);
    await adapter.delete("manifests", "lesson-1.json");
    expect(await adapter.exists("manifests", "lesson-1.json")).toBe(false);
  });

  it("delete() is idempotent (no throw on missing file)", async () => {
    await expect(adapter.delete("videos", "never-existed.mp4")).resolves.toBeUndefined();
  });

  it("getUrl() returns a stable URL without uploading", async () => {
    const url = await adapter.getUrl("videos", "some-key.mp4");
    expect(url).toContain("videos");
    expect(url).toContain("some-key.mp4");
  });

  it("creating the same key twice overwrites (idempotent upload)", async () => {
    await adapter.upload("audio", "dup.webm", new Uint8Array([1, 2]), "audio/webm");
    await adapter.upload("audio", "dup.webm", new Uint8Array([3, 4, 5, 6]), "audio/webm");
    const st = await stat(join(baseDir, "audio", "dup.webm"));
    expect(st.size).toBe(4);
  });

  it("supports all four storage buckets", async () => {
    for (const bucket of BUCKETS) {
      const data = new Uint8Array([bucket.length]);
      const asset = await adapter.upload(bucket, `key-${bucket}`, data, "application/octet-stream");
      expect(asset.bucket).toBe(bucket);
      expect(await adapter.exists(bucket, `key-${bucket}`)).toBe(true);
    }
  });

  it("rejects an unknown bucket name", async () => {
    // @ts-expect-error -- invalid bucket
    await expect(adapter.upload("unknown", "k", new Uint8Array(), "x")).rejects.toThrow();
  });
});
