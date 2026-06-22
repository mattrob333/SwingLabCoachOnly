/**
 * Storage adapter interface.
 *
 * Abstraction over file storage (videos, audio, thumbnails, manifests).
 * Implementations: MockStorageAdapter (filesystem, default) and
 * SupabaseStorageAdapter (live when env keys present).
 *
 * The factory `getStorageAdapter()` in `lib/storage/index.ts` picks the right
 * implementation at runtime based on env-gated mode detection.
 */

export type StorageBucket = "videos" | "audio" | "thumbnails" | "manifests";

export const STORAGE_BUCKETS: readonly StorageBucket[] = [
  "videos",
  "audio",
  "thumbnails",
  "manifests",
];

export function isStorageBucket(value: string): value is StorageBucket {
  return (STORAGE_BUCKETS as readonly string[]).includes(value);
}

export interface UploadedAsset {
  /** Public or signed URL the client can use to fetch the asset. */
  url: string;
  /** Storage key (filename) within the bucket. */
  key: string;
  /** Bucket the asset was stored in. */
  bucket: StorageBucket;
  /** Asset size in bytes. */
  size: number;
  /** MIME type of the asset. */
  contentType: string;
}

export interface StorageAdapter {
  readonly mode: "live" | "mock";
  /**
   * Upload bytes to a bucket under the given key. Overwrites if the key
   * already exists.
   */
  upload(
    bucket: StorageBucket,
    key: string,
    data: Uint8Array,
    contentType: string,
  ): Promise<UploadedAsset>;
  /** Resolve a fetchable URL for a stored asset (no upload side-effect). */
  getUrl(bucket: StorageBucket, key: string): Promise<string>;
  /** Delete an asset. Idempotent — no error if the key doesn't exist. */
  delete(bucket: StorageBucket, key: string): Promise<void>;
  /** Whether an asset exists at the given bucket+key. */
  exists(bucket: StorageBucket, key: string): Promise<boolean>;
}
