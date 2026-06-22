import type {
  TranscriptionAdapter,
  TranscribeInput,
  TranscribeResult,
} from "./types";

const DEEPGRAM_API_BASE = "https://api.deepgram.com/v1/listen";

/**
 * Deepgram transcription adapter — used when DEEPGRAM_API_KEY is present.
 * Uses fetch() directly (no SDK dependency) for consistency with the
 * Supabase PostgREST, Stripe, and Resend email adapter patterns.
 *
 * Sends the audio URL to Deepgram's REST /v1/listen endpoint using the
 * nova-2 model with smart formatting. The response is parsed to extract
 * the transcript from the first channel's first alternative.
 */
export class DeepgramTranscriptionAdapter implements TranscriptionAdapter {
  readonly mode = "live" as const;
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.DEEPGRAM_API_KEY ?? "";
    // Defense-in-depth: the factory already gates on isLive("transcription"),
    // but constructing directly without a key should fail fast.
    if (!this.apiKey) {
      throw new Error("DeepgramTranscriptionAdapter requires DEEPGRAM_API_KEY");
    }
  }

  async transcribe(input: TranscribeInput): Promise<TranscribeResult> {
    if (!input.audioUrl || input.audioUrl.trim().length === 0) {
      return {
        success: false,
        transcript: null,
        provider: "deepgram",
        mode: "live",
        error: "audioUrl is required",
      };
    }
    if (!input.noteId || input.noteId.trim().length === 0) {
      return {
        success: false,
        transcript: null,
        provider: "deepgram",
        mode: "live",
        error: "noteId is required",
      };
    }

    const language = input.language ?? "en";
    const url = `${DEEPGRAM_API_BASE}?model=nova-2&smart_format=true&language=${encodeURIComponent(language)}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: input.audioUrl }),
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          success: false,
          transcript: null,
          provider: "deepgram",
          mode: "live",
          error: `Deepgram API error: ${res.status} ${text}`,
        };
      }

      const data = (await res.json()) as {
        results?: {
          channels?: Array<{
            alternatives?: Array<{ transcript?: string }>;
          }>;
        };
      };

      const transcript =
        data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

      if (!transcript) {
        return {
          success: false,
          transcript: null,
          provider: "deepgram",
          mode: "live",
          error: "Deepgram returned an empty transcript",
        };
      }

      console.log(
        `[transcription:deepgram] transcribed note ${input.noteId} ` +
          `(submission: ${input.submissionId}, ${transcript.length} chars)`,
      );

      return {
        success: true,
        transcript,
        provider: "deepgram",
        mode: "live",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        transcript: null,
        provider: "deepgram",
        mode: "live",
        error: `Deepgram request failed: ${message}`,
      };
    }
  }
}
