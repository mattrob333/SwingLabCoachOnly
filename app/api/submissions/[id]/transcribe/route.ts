import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { rateLimitOr429 } from "@/lib/auth/rate-limit";
import { getSubmissionById } from "@/lib/submissions";
import {
  getPlaybackManifestForSubmission,
  savePlaybackManifest,
} from "@/lib/lesson/playback-store";
import { getTranscriptionAdapter } from "@/lib/transcription";
import type { TranscribeInput } from "@/lib/transcription";
import type { FreezeFrameNote } from "@/lib/lesson/playback";

type TranscribeRequestBody = {
  noteId?: string;
  audioUrl?: string;
  language?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Rate limit: 20 transcribe calls per 10 minutes per IP.
  const blocked = rateLimitOr429(request, {
    limit: 20,
    windowMs: 600_000,
    keyPrefix: "transcribe",
  });
  if (blocked) return blocked;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const submission = await getSubmissionById(id);
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (submission.coachSlug !== session.coachSlug) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: TranscribeRequestBody;
  try {
    body = (await request.json()) as TranscribeRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { noteId, audioUrl, language } = body;
  if (!noteId || noteId.trim().length === 0) {
    return NextResponse.json({ error: "noteId is required" }, { status: 400 });
  }
  if (!audioUrl || audioUrl.trim().length === 0) {
    return NextResponse.json({ error: "audioUrl is required" }, { status: 400 });
  }

  const transcribeInput: TranscribeInput = {
    audioUrl,
    submissionId: id,
    noteId,
    language,
  };

  const adapter = getTranscriptionAdapter();
  const result = await adapter.transcribe(transcribeInput);

  // If a manifest exists, update the note with transcript fields
  const manifest = await getPlaybackManifestForSubmission(id);
  if (manifest) {
    const note = manifest.notes.find((n: FreezeFrameNote) => n.id === noteId);
    if (note) {
      if (result.success && result.transcript) {
        note.transcriptRaw = result.transcript;
        note.transcriptStatus = "ready";
        note.transcriptProvider = result.provider;
        note.transcriptError = undefined;
      } else {
        note.transcriptStatus = "error";
        note.transcriptProvider = result.provider;
        note.transcriptError = result.error ?? "Transcription failed";
      }
      // Save the updated manifest back
      const { ...manifestData } = manifest;
      await savePlaybackManifest(id, manifestData);
    }
  }

  return NextResponse.json(result);
}
