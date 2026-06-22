import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { getSubmissionById } from "@/lib/submissions";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "audio");
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

function safeAudioExtension(fileName: string, type: string): string {
  const ext = extname(fileName).toLowerCase();
  if ([".webm", ".mp4", ".m4a", ".ogg", ".wav"].includes(ext)) return ext;
  if (type.includes("ogg")) return ".ogg";
  if (type.includes("wav")) return ".wav";
  if (type.includes("mp4") || type.includes("m4a")) return ".m4a";
  return ".webm";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form body" }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }
  if (!audio.type.startsWith("audio/") && !audio.type.includes("webm")) {
    return NextResponse.json({ error: "audio file must be audio" }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "audio file is too large" }, { status: 400 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const extension = safeAudioExtension(audio.name, audio.type);
  const fileName = `${randomUUID()}${extension}`;
  await writeFile(join(UPLOAD_DIR, fileName), Buffer.from(await audio.arrayBuffer()));

  return NextResponse.json({
    audioUrl: `/uploads/audio/${fileName}`,
    fileName: audio.name,
  });
}
