import type {
  PackagingAdapter,
  PackageInput,
  PackageResult,
  NoteTitle,
} from "./types";
import type { FreezeFrameNote } from "@/lib/lesson/playback";

/**
 * In-memory store of mock packaging results (for test inspection).
 * Each entry captures the input + the generated titles + summary + a
 * timestamp, so tests can assert on the packaging without coupling to
 * external APIs.
 */
export type MockPackaging = {
  submissionId: string;
  noteTitles: NoteTitle[];
  summary: string;
  packagedAt: number;
};

export const MOCK_PACKAGINGS: MockPackaging[] = [];

/**
 * Returns the effective transcript text for a note, preferring the
 * coach-edited transcript, then the raw transcript, then the legacy
 * `transcript` field.
 */
function effectiveTranscript(note: FreezeFrameNote): string {
  return (
    note.transcriptEdited ??
    note.transcriptRaw ??
    note.transcript ??
    ""
  );
}

/**
 * Generates a deterministic, concise moment title for a note based on
 * its transcript content. Falls back to a position-based label when no
 * transcript is available.
 *
 * GUARDRAIL: the mock never invents coaching advice — it only labels
 * the moment using the coach's own words (truncated) or a neutral
 * "Moment N" label. This mirrors the constraint the real OpenAI adapter
 * enforces via its system prompt.
 */
function generateMockTitle(note: FreezeFrameNote, index: number): string {
  const transcript = effectiveTranscript(note).trim();
  if (!transcript) {
    return `Moment ${index + 1}`;
  }
  // Use the first few words of the coach's own transcript as the title.
  const words = transcript.split(/\s+/).slice(0, 5).join(" ");
  // Strip a trailing partial word / punctuation for cleanliness.
  const cleaned = words.replace(/[,;:.]+$/, "");
  return cleaned.length > 0 ? cleaned : `Moment ${index + 1}`;
}

/**
 * Generates a deterministic, parent-friendly summary based on the
 * manifest content. The summary restates the number of notes and the
 * coach's name (when provided) without inventing technical feedback.
 */
function generateMockSummary(
  noteCount: number,
  coachName: string | undefined,
): string {
  const coach = coachName && coachName.trim().length > 0 ? coachName : "your coach";
  return (
    `[Mock summary] ${coach} recorded ${noteCount} ` +
    `${noteCount === 1 ? "moment" : "moments"} of feedback for this swing. ` +
    `Add OPENAI_API_KEY to .env to generate a real parent-friendly summary ` +
    `that organizes the coach's points.`
  );
}

/**
 * Mock packaging adapter — used when OPENAI_API_KEY is absent.
 *
 * Returns deterministic placeholder titles + summary and stores the
 * result in MOCK_PACKAGINGS for test inspection. No external calls.
 */
export class MockPackagingAdapter implements PackagingAdapter {
  readonly mode = "mock" as const;

  async package(input: PackageInput): Promise<PackageResult> {
    if (!input.submissionId || input.submissionId.trim().length === 0) {
      return {
        success: false,
        noteTitles: null,
        summary: null,
        provider: "mock",
        mode: "mock",
        error: "submissionId is required",
      };
    }
    if (
      !input.manifest ||
      !Array.isArray(input.manifest.notes) ||
      input.manifest.notes.length === 0
    ) {
      return {
        success: false,
        noteTitles: null,
        summary: null,
        provider: "mock",
        mode: "mock",
        error: "manifest must contain at least one note",
      };
    }

    const noteTitles: NoteTitle[] = input.manifest.notes.map((note, index) => ({
      noteId: note.id,
      title: generateMockTitle(note, index),
    }));
    const summary = generateMockSummary(noteTitles.length, input.coachName);

    const entry: MockPackaging = {
      submissionId: input.submissionId,
      noteTitles,
      summary,
      packagedAt: Date.now(),
    };
    MOCK_PACKAGINGS.push(entry);

    console.log(
      `[packaging:mock] packaged ${noteTitles.length} notes ` +
        `(submission: ${input.submissionId})`,
    );

    return {
      success: true,
      noteTitles,
      summary,
      provider: "mock",
      mode: "mock",
    };
  }
}
