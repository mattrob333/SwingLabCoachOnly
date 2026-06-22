/**
 * Lesson packaging adapter interface.
 *
 * Env-gated: the factory (lib/packaging/index.ts) returns the real
 * OpenAI adapter when OPENAI_API_KEY is present, and the mock adapter
 * otherwise. The packaging worker consumes this interface so the
 * backend is swappable with zero code changes.
 *
 * Design: uses OpenAI's Chat Completions API via fetch() (no SDK
 * dependency) for consistency with the Deepgram, Stripe, and Resend
 * adapter patterns. The mock adapter generates deterministic placeholder
 * titles + summary based on the manifest content so downstream features
 * (lesson page chapter titles, summary display) can be developed and
 * tested without an OpenAI key.
 *
 * Wave 4: packaging worker runs after transcription, generates:
 *   1. A concise "moment title" per freeze-frame note (derived from the
 *      coach's transcribed feedback — used as chapter/section labels).
 *   2. A parent-friendly lesson summary that organizes the coach's points
 *      into a short, readable overview.
 *
 * GUARDRAIL (SwingLab PRD): AI summarizes and organizes coach feedback —
 * it NEVER invents technical diagnosis or new coaching content. The
 * adapter's system prompt enforces this; the mock adapter's placeholder
 * output reflects the same constraint (it restates note IDs / counts,
 * not invented advice).
 */

import type { LessonPlaybackManifest } from "@/lib/lesson/playback";

export type PackageInput = {
  /** Submission ID for correlation/debugging. */
  submissionId: string;
  /** The lesson manifest with transcribed notes to package. */
  manifest: LessonPlaybackManifest;
  /** Optional coach display name, included in the summary context. */
  coachName?: string;
};

export type NoteTitle = {
  /** Freeze-frame note ID this title applies to. */
  noteId: string;
  /** Concise moment title (a few words) derived from the coach feedback. */
  title: string;
};

export type PackageResult = {
  success: boolean;
  /** Per-note moment titles, or null on failure. */
  noteTitles: NoteTitle[] | null;
  /** Parent-friendly lesson summary, or null on failure. */
  summary: string | null;
  /** Provider name ("openai" or "mock"). */
  provider: string;
  mode: "live" | "mock";
  /** Error message if success is false. */
  error?: string;
};

export interface PackagingAdapter {
  readonly mode: "live" | "mock";
  package(input: PackageInput): Promise<PackageResult>;
}
