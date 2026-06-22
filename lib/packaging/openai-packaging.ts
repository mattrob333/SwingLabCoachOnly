import type {
  PackagingAdapter,
  PackageInput,
  PackageResult,
  NoteTitle,
} from "./types";
import type { FreezeFrameNote } from "@/lib/lesson/playback";

const OPENAI_API_BASE = "https://api.openai.com/v1/chat/completions";

/**
 * Returns the effective transcript text for a note, preferring the
 * coach-edited transcript, then the raw transcript, then the legacy
 * `transcript` field. (Mirrors the mock adapter's logic.)
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
 * Builds the system prompt enforcing the SwingLab guardrail: the AI
 * summarizes and organizes coach feedback — it NEVER invents technical
 * diagnosis or new coaching content.
 */
function buildSystemPrompt(): string {
  return [
    "You are a lesson packaging assistant for SwingLab, a youth swing-analysis platform.",
    "A coach has recorded voice notes over a video of a young athlete's swing.",
    "Each note has a transcript of what the coach said.",
    "",
    "Your job:",
    "1. Write a concise 'moment title' (3-7 words) for each note, derived ONLY from the coach's own words.",
    "2. Write a short, parent-friendly summary (2-4 sentences) that organizes the coach's points into a readable overview.",
    "",
    "GUARDRAIL (critical):",
    "- You are summarizing and organizing the coach's feedback. You are NOT coaching.",
    "- NEVER invent technical diagnosis, new advice, or content the coach did not say.",
    "- Keep the coach's wording where possible. Only remove obvious filler (um, uh, like) and organize for readability.",
    "- Write for a parent (non-expert), not for the coach.",
    "",
    'Respond with ONLY a JSON object of the form: {"noteTitles":[{"noteId":"...","title":"..."}],"summary":"..."}',
    "Do not include any text outside the JSON object.",
  ].join("\n");
}

/**
 * Builds the user message containing the notes with their transcripts.
 */
function buildUserMessage(input: PackageInput): string {
  const lines: string[] = [];
  if (input.coachName && input.coachName.trim().length > 0) {
    lines.push(`Coach: ${input.coachName}`);
  }
  lines.push(`Number of notes: ${input.manifest.notes.length}`);
  lines.push("");
  lines.push("Notes:");
  for (const note of input.manifest.notes) {
    const transcript = effectiveTranscript(note).trim();
    lines.push(`- noteId: ${note.id} (timecode: ${note.timecode}s)`);
    lines.push(`  transcript: ${transcript || "(no transcript)"}`);
  }
  return lines.join("\n");
}

/**
 * Parses the OpenAI JSON response into noteTitles + summary.
 * Throws on malformed JSON or missing fields.
 */
function parsePackageResponse(content: string): {
  noteTitles: NoteTitle[];
  summary: string;
} {
  const trimmed = content.trim();
  // The model should return pure JSON, but defensively extract the first
  // {...} block if it wrapped the JSON in prose / markdown fences.
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error("OpenAI response did not contain a JSON object");
  }
  const jsonStr = trimmed.slice(jsonStart, jsonEnd + 1);
  const parsed = JSON.parse(jsonStr) as {
    noteTitles?: unknown;
    summary?: unknown;
  };

  if (!Array.isArray(parsed.noteTitles)) {
    throw new Error("OpenAI response missing 'noteTitles' array");
  }
  if (typeof parsed.summary !== "string") {
    throw new Error("OpenAI response missing 'summary' string");
  }

  const noteTitles: NoteTitle[] = parsed.noteTitles.map((item, i) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`noteTitles[${i}] is not an object`);
    }
    const obj = item as { noteId?: unknown; title?: unknown };
    if (typeof obj.noteId !== "string" || typeof obj.title !== "string") {
      throw new Error(`noteTitles[${i}] missing noteId or title string`);
    }
    return { noteId: obj.noteId, title: obj.title };
  });

  return { noteTitles, summary: parsed.summary };
}

/**
 * OpenAI packaging adapter — used when OPENAI_API_KEY is present.
 * Uses fetch() directly (no SDK dependency) for consistency with the
 * Deepgram, Stripe, and Resend email adapter patterns.
 *
 * Calls the Chat Completions API with a gpt-4o-mini model and a
 * JSON-response system prompt enforcing the SwingLab guardrail
 * (summarize/organize coach feedback; never invent diagnosis).
 */
export class OpenAIPackagingAdapter implements PackagingAdapter {
  readonly mode = "live" as const;
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY ?? "";
    // Defense-in-depth: the factory already gates on isLive("ai"), but
    // constructing directly without a key should fail fast.
    if (!this.apiKey) {
      throw new Error("OpenAIPackagingAdapter requires OPENAI_API_KEY");
    }
  }

  async package(input: PackageInput): Promise<PackageResult> {
    if (!input.submissionId || input.submissionId.trim().length === 0) {
      return {
        success: false,
        noteTitles: null,
        summary: null,
        provider: "openai",
        mode: "live",
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
        provider: "openai",
        mode: "live",
        error: "manifest must contain at least one note",
      };
    }

    try {
      const res = await fetch(OPENAI_API_BASE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: buildSystemPrompt() },
            { role: "user", content: buildUserMessage(input) },
          ],
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          success: false,
          noteTitles: null,
          summary: null,
          provider: "openai",
          mode: "live",
          error: `OpenAI API error: ${res.status} ${text}`,
        };
      }

      const data = (await res.json()) as {
        choices?: Array<{
          message?: { content?: string };
        }>;
      };

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          noteTitles: null,
          summary: null,
          provider: "openai",
          mode: "live",
          error: "OpenAI returned an empty response",
        };
      }

      const { noteTitles, summary } = parsePackageResponse(content);

      console.log(
        `[packaging:openai] packaged ${noteTitles.length} notes ` +
          `(submission: ${input.submissionId})`,
      );

      return {
        success: true,
        noteTitles,
        summary,
        provider: "openai",
        mode: "live",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        noteTitles: null,
        summary: null,
        provider: "openai",
        mode: "live",
        error: `OpenAI packaging failed: ${message}`,
      };
    }
  }
}
