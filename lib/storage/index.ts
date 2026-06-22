/**
 * Storage adapter factory.
 *
 * Returns the live Supabase storage adapter when env keys are present,
 * otherwise the mock (filesystem) adapter. The choice is env-gated so the
 * app runs in mock mode by default and flips live when the user adds
 * Supabase credentials to `.env`.
 */

import { isLive } from "@/lib/env";
import { MockStorageAdapter } from "./mock-storage";
import { SupabaseStorageAdapter } from "./supabase-storage";
import type { StorageAdapter } from "./types";

let cached: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (cached) return cached;
  if (isLive("storage")) {
    cached = new SupabaseStorageAdapter();
  } else {
    cached = new MockStorageAdapter();
  }
  if (process.env.NODE_ENV !== "production") {
    // Helpful dev-mode log so it's clear which storage backend is active.
    // In production, the env validation module logs mock-mode warnings.
    console.log(`[storage] using ${cached.mode} adapter`);
  }
  return cached;
}

/** Test-only: reset the cached adapter (so mode switches take effect). */
export function _resetStorageAdapterForTests(): void {
  cached = null;
}

export type { StorageAdapter, StorageBucket, UploadedAsset } from "./types";
export { isStorageBucket, STORAGE_BUCKETS } from "./types";
