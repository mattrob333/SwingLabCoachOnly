/**
 * Transcription adapter factory.
 *
 * Returns the live Deepgram adapter when DEEPGRAM_API_KEY is present,
 * otherwise the mock adapter. Env-gated so the app runs in mock mode by
 * default and flips live when the user adds transcription credentials to
 * `.env`.
 */

import { isLive } from "@/lib/env";
import { MockTranscriptionAdapter } from "./mock-transcription";
import { DeepgramTranscriptionAdapter } from "./deepgram-transcription";
import type { TranscriptionAdapter } from "./types";

let cached: TranscriptionAdapter | null = null;

export function getTranscriptionAdapter(): TranscriptionAdapter {
  if (cached) return cached;
  if (isLive("transcription")) {
    cached = new DeepgramTranscriptionAdapter();
  } else {
    cached = new MockTranscriptionAdapter();
  }
  if (process.env.NODE_ENV !== "production") {
    console.log(`[transcription] using ${cached.mode} adapter`);
  }
  return cached;
}

/** Test-only: reset the cached adapter (so mode switches take effect). */
export function _resetTranscriptionAdapterForTests(): void {
  cached = null;
}

export type {
  TranscriptionAdapter,
  TranscribeInput,
  TranscribeResult,
} from "./types";
