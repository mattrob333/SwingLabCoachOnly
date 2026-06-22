/**
 * Mock (filesystem) storage adapter.
 *
 * Writes assets to `<baseDir>/<bucket>/<key>` on disk and serves them from
 * `/uploads/<bucket>/<key>` (compatible with Next.js static serving from
 * `public/uploads`). Default baseDir is `<cwd>/public/uploads` so it matches
 * the existing local-dev upload behavior.
 *
 * This adapter is used automatically when the Supabase storage env keys are
 * not present (see `lib/storage/index.ts`).
 */

import { mkdir, writeFile, rm, access } from "node:fs/promises";
import { join } from "node:path";
import {
  isStorageBucket,
  type StorageAdapter,
  type StorageBucket,
  type UploadedAsset,
} from "./types";

const DEFAULT_BASE_DIR = join(process.cwd(), "public", "uploads");

export class MockStorageAdapter implements StorageAdapter {
  readonly mode = "mock" as const;
  private readonly baseDir: string;

  constructor(baseDir: string = DEFAULT_BASE_DIR) {
    this.baseDir = baseDir;
  }

  private resolve(bucket: StorageBucket, key: string): string {
    return join(this.baseDir, bucket, key);
  }

  async upload(
    bucket: StorageBucket,
    key: string,
    data: Uint8Array,
    contentType: string,
  ): Promise<UploadedAsset> {
    if (!isStorageBucket(bucket)) {
      throw new Error(`Unknown storage bucket: ${bucket}`);
    }
    const filePath = this.resolve(bucket, key);
    await mkdir(join(this.baseDir, bucket), { recursive: true });
    await writeFile(filePath, data);
    return {
      url: this.publicUrl(bucket, key),
      key,
      bucket,
      size: data.byteLength,
      contentType,
    };
  }

  async getUrl(bucket: StorageBucket, key: string): Promise<string> {
    return this.publicUrl(bucket, key);
  }

  async delete(bucket: StorageBucket, key: string): Promise<void> {
    const filePath = this.resolve(bucket, key);
    await rm(filePath, { force: true });
  }

  async exists(bucket: StorageBucket, key: string): Promise<boolean> {
    try {
      await access(this.resolve(bucket, key));
      return true;
    } catch {
      return false;
    }
  }

  private publicUrl(bucket: StorageBucket, key: string): string {
    return `/uploads/${bucket}/${key}`;
  }
}
