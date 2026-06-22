import type {
  TranscriptionAdapter,
  TranscribeInput,
  TranscribeResult,
} from "./types";

/**
 * In-memory store of mock transcriptions (for test inspection).
 * Each entry captures the input + the generated transcript + a timestamp,
 * so tests can assert on the transcription without coupling to external APIs.
 */
export type MockTranscription = {
  audioUrl: string;
  submissionId: string;
  noteId: string;
  transcript: string;
  transcribedAt: number;
};

export const MOCK_TRANSCRIPTIONS: MockTranscription[] = [];

/**
 * Generates a deterministic placeholder transcript based on the noteId.
 * This gives the system a usable (non-empty) transcript in mock mode so
 * downstream features (transcript editing, AI packaging) can be developed
 * and tested without a real Deepgram key.
 *
 * The transcript is deterministic per noteId so tests can assert exact values.
 */
function generateMockTranscript(noteId: string): string {
  return `[Mock transcript for ${noteId}] This is a placeholder transcription generated in mock mode. Add DEEPGRAM_API_KEY to .env to enable real transcription.`;
}

/**
 * Mock transcription adapter — used when DEEPGRAM_API_KEY is absent.
 *
 * Returns a deterministic placeholder transcript and stores it in
 * MOCK_TRANSCRIPTIONS for test inspection. No external calls.
 */
export class MockTranscriptionAdapter implements TranscriptionAdapter {
  readonly mode = "mock" as const;

  async transcribe(
    input: TranscribeInput,
  ): Promise<TranscribeResult> {
    if (!input.audioUrl || input.audioUrl.trim().length === 0) {
      return {
        success: false,
        transcript: null,
        provider: "mock",
        mode: "mock",
        error: "audioUrl is required",
      };
    }
    if (!input.noteId || input.noteId.trim().length === 0) {
      return {
        success: false,
        transcript: null,
        provider: "mock",
        mode: "mock",
        error: "noteId is required",
      };
    }

    const transcript = generateMockTranscript(input.noteId);

    const entry: MockTranscription = {
      audioUrl: input.audioUrl,
      submissionId: input.submissionId,
      noteId: input.noteId,
      transcript,
      transcribedAt: Date.now(),
    };
    MOCK_TRANSCRIPTIONS.push(entry);

    console.log(
      `[transcription:mock] transcribed note ${input.noteId} ` +
        `(submission: ${input.submissionId})`,
    );

    return {
      success: true,
      transcript,
      provider: "mock",
      mode: "mock",
    };
  }
}
