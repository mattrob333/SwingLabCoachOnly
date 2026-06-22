/**
 * Email adapter factory.
 *
 * Returns the live Resend adapter when RESEND_API_KEY is present, otherwise
 * the mock adapter. Env-gated so the app runs in mock mode by default and
 * flips live when the user adds email credentials to `.env`.
 */

import { isLive } from "@/lib/env";
import { MockEmailAdapter } from "./mock-email";
import { ResendEmailAdapter } from "./resend-email";
import type { EmailAdapter } from "./types";

let cached: EmailAdapter | null = null;

export function getEmailAdapter(): EmailAdapter {
  if (cached) return cached;
  if (isLive("email")) {
    cached = new ResendEmailAdapter();
  } else {
    cached = new MockEmailAdapter();
  }
  if (process.env.NODE_ENV !== "production") {
    console.log(`[email] using ${cached.mode} adapter`);
  }
  return cached;
}

/** Test-only: reset the cached adapter (so mode switches take effect). */
export function _resetEmailAdapterForTests(): void {
  cached = null;
}

export type { EmailAdapter, SendLessonDeliveryInput, SendEmailResult } from "./types";
