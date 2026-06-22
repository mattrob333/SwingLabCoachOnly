/**
 * Email adapter interface.
 *
 * Env-gated: the factory (lib/email/index.ts) returns the real Resend
 * adapter when RESEND_API_KEY is present, and the mock adapter otherwise.
 * The lesson delivery flow consumes this interface so the backend is
 * swappable with zero code changes.
 *
 * Design: uses Resend's REST API via fetch() (no SDK dependency) for
 * consistency with the Supabase PostgREST and Stripe adapter patterns.
 * The mock adapter logs to console and stores sent emails in an array for
 * test inspection — no external calls.
 */

export type SendLessonDeliveryInput = {
  /** Parent's email address (recipient). */
  to: string;
  /** Parent's display name (optional, used in greeting). */
  parentName?: string;
  /** Coach's display name (used in email body). */
  coachName: string;
  /** The full magic-link URL the parent clicks to view the lesson. */
  lessonUrl: string;
  /** Submission ID for correlation/debugging. */
  submissionId: string;
};

export type SendEmailResult = {
  success: boolean;
  /** Provider message ID (Resend `id`), or null for mock mode. */
  messageId: string | null;
  mode: "live" | "mock";
  /** Error message if success is false. */
  error?: string;
};

export interface EmailAdapter {
  readonly mode: "live" | "mock";
  sendLessonDeliveryEmail(
    input: SendLessonDeliveryInput,
  ): Promise<SendEmailResult>;
}
