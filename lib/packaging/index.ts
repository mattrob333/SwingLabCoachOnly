/**
 * Packaging adapter factory.
 *
 * Returns the live OpenAI adapter when OPENAI_API_KEY is present,
 * otherwise the mock adapter. Env-gated so the app runs in mock mode
 * by default and flips live when the user adds AI credentials to
 * `.env`.
 */

import { isLive } from "@/lib/env";
import { MockPackagingAdapter } from "./mock-packaging";
import { OpenAIPackagingAdapter } from "./openai-packaging";
import type { PackagingAdapter } from "./types";

let cached: PackagingAdapter | null = null;

export function getPackagingAdapter(): PackagingAdapter {
  if (cached) return cached;
  if (isLive("ai")) {
    cached = new OpenAIPackagingAdapter();
  } else {
    cached = new MockPackagingAdapter();
  }
  if (process.env.NODE_ENV !== "production") {
    console.log(`[packaging] using ${cached.mode} adapter`);
  }
  return cached;
}

/** Test-only: reset the cached adapter (so mode switches take effect). */
export function _resetPackagingAdapterForTests(): void {
  cached = null;
}

export type {
  PackagingAdapter,
  PackageInput,
  PackageResult,
  NoteTitle,
} from "./types";
