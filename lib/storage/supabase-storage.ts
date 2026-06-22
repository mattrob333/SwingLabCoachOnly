/**
 * Supabase Storage adapter (live).
 *
 * Uses the Supabase Storage REST API to upload/fetch/delete assets in
 * dedicated buckets. Activated automatically when the Supabase env keys
 * (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) are present.
 *
 * Buckets must be pre-created in the Supabase project dashboard:
 *   videos, audio, thumbnails, manifests (all private by default; signed URLs
 *   are generated on demand via getUrl).
 *
 * This implementation uses fetch() directly (no `@supabase/supabase-js`
 * dependency) to keep the bundle lean and avoid a hard dep that would crash
 * in mock mode.
 */

import {
  isStorageBucket,
  type StorageAdapter,
  type StorageBucket,
  type UploadedAsset,
} from "./types";

export class SupabaseStorageAdapter implements StorageAdapter {
  readonly mode = "live" as const;
  private readonly projectUrl: string;
  private readonly serviceRoleKey: string;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "SupabaseStorageAdapter requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
      );
    }
    this.projectUrl = url.replace(/\/$/, "");
    this.serviceRoleKey = key;
  }

  private bucketApi(bucket: StorageBucket): string {
    return `${this.projectUrl}/storage/v1/object/${bucket}`;
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
    const res = await fetch(`${this.bucketApi(bucket)}/${key}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: Buffer.from(data),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Supabase storage upload failed (${res.status}): ${body}`,
      );
    }
    return {
      url: await this.getUrl(bucket, key),
      key,
      bucket,
      size: data.byteLength,
      contentType,
    };
  }

  async getUrl(bucket: StorageBucket, key: string): Promise<string> {
    // Signed URL valid for 1 hour (3600s). For public buckets, this still
    // works; for private buckets the signature is required.
    const res = await fetch(
      `${this.projectUrl}/storage/v1/object/sign/${bucket}/${key}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: 3600 }),
      },
    );
    if (!res.ok) {
      // Fallback: construct a public URL (works for public buckets).
      return `${this.projectUrl}/storage/v1/object/public/${bucket}/${key}`;
    }
    const json = (await res.json()) as { signedURL?: string };
    if (!json.signedURL) {
      return `${this.projectUrl}/storage/v1/object/public/${bucket}/${key}`;
    }
    return json.signedURL.startsWith("http")
      ? json.signedURL
      : `${this.projectUrl}${json.signedURL}`;
  }

  async delete(bucket: StorageBucket, key: string): Promise<void> {
    await fetch(`${this.bucketApi(bucket)}/${key}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.serviceRoleKey}` },
    });
  }

  async exists(bucket: StorageBucket, key: string): Promise<boolean> {
    // HEAD request via the object endpoint; 200 = exists, 404 = missing.
    const res = await fetch(
      `${this.projectUrl}/storage/v1/object/${bucket}/${key}`,
      {
        method: "HEAD",
        headers: { Authorization: `Bearer ${this.serviceRoleKey}` },
      },
    );
    return res.ok;
  }
}
