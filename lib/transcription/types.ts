/**
 * Transcription adapter interface.
 *
 * Env-gated: the factory (lib/transcription/index.ts) returns the real
 * Deepgram adapter when DEEPGRAM_API_KEY is present, and the mock adapter
 * otherwise. The transcription worker consumes this interface so the
 * backend is swappable with zero code changes.
 *
 * Design: uses Deepgram's REST API via fetch() (no SDK dependency) for
 * consistency with the Supabase PostgREST, Stripe, and Resend email
 * adapter patterns. The mock adapter returns a deterministic placeholder
 * transcript and stores results in an array for test inspection — no
 * external calls.
 *
 * Wave 4: Deepgram transcription worker runs after each voice note upload,
 * stores raw transcript + status + errors per note (FreezeFrameNote.transcriptRaw,
 * transcriptStatus, transcriptProvider, transcriptError). Retry endpoint
 * allows re-running failed transcriptions.
 */

export type TranscribeInput = {
  /** URL of the audio blob to transcribe (data URL or public/signed URL). */
  audioUrl: string;
  /** Submission ID for correlation/debugging. */
  submissionId: string;
  /** Freeze-frame note ID this transcript belongs to. */
  noteId: string;
  /** Optional language hint (BCP-47 code, e.g. "en", "en-US"). Defaults to "en". */
  language?: string;
};

export type TranscribeResult = {
  success: boolean;
  /** Raw transcript text, or null on failure. */
  transcript: string | null;
  /** Provider name ("deepgram" or "mock"). */
  provider: string;
  mode: "live" | "mock";
  /** Error message if success is false. */
  error?: string;
};

export interface TranscriptionAdapter {
  readonly mode: "live" | "mock";
  transcribe(input: TranscribeInput): Promise<TranscribeResult>;
}
