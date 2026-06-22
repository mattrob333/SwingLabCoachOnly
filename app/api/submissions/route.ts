import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import {
  createSubmission,
  validateSubmissionInput,
  type SubmissionInput,
} from "@/lib/submissions";
import { getCoachBySlug } from "@/lib/coaches";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

function safeVideoExtension(fileName: string, type: string): string {
  const ext = extname(fileName).toLowerCase();
  if ([".mp4", ".mov", ".m4v", ".webm"].includes(ext)) return ext;
  if (type === "video/mp4") return ".mp4";
  if (type === "video/quicktime") return ".mov";
  if (type === "video/webm") return ".webm";
  return ".mp4";
}

async function saveUploadedVideo(file: File): Promise<{
  videoUrl: string;
  videoFileName: string;
}> {
  if (!file.type.startsWith("video/")) {
    throw new Error("Please upload a video file");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("Video file is too large for this local demo");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const extension = safeVideoExtension(file.name, file.type);
  const storedName = `${randomUUID()}${extension}`;
  await writeFile(join(UPLOAD_DIR, storedName), Buffer.from(await file.arrayBuffer()));

  return {
    videoUrl: `/uploads/${storedName}`,
    videoFileName: file.name,
  };
}

async function parseSubmissionRequest(request: NextRequest): Promise<SubmissionInput> {
  const contentType = request.headers?.get?.("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const video = form.get("video");
    const videoFields = video instanceof File ? await saveUploadedVideo(video) : {};

    return {
      coachSlug: String(form.get("coachSlug") ?? ""),
      parentEmail: String(form.get("parentEmail") ?? ""),
      playerAge: Number(form.get("playerAge") ?? 0),
      swingType: String(form.get("swingType") ?? "baseball"),
      notes: String(form.get("notes") ?? ""),
      ...videoFields,
      ...(typeof form.get("followUpFor") === "string" && form.get("followUpFor")
        ? { followUpFor: String(form.get("followUpFor")) }
        : {}),
    };
  }

  const body = (await request.json()) as Record<string, unknown>;
  return {
    coachSlug: String(body.coachSlug ?? ""),
    parentEmail: String(body.parentEmail ?? ""),
    playerAge: Number(body.playerAge ?? 0),
    swingType: String(body.swingType ?? "baseball"),
    notes: String(body.notes ?? ""),
    ...(typeof body.videoUrl === "string" && body.videoUrl
      ? { videoUrl: body.videoUrl }
      : {}),
    ...(typeof body.videoFileName === "string" && body.videoFileName
      ? { videoFileName: body.videoFileName }
      : {}),
    ...(typeof body.followUpFor === "string" && body.followUpFor
      ? { followUpFor: body.followUpFor }
      : {}),
  };
}

/**
 * Phase 3 — Create a new swing review submission.
 *
 * POST /api/submissions
 * Accepts a SubmissionInput JSON body from the parent upload form.
 * Validates that the coach exists and the input is well-formed.
 * Returns the new submission id + status (pending_payment).
 *
 * Guardrail: payment before review — the submission starts as pending_payment
 * and only advances after the payment flow (Phase 3 #4).
 */
export async function POST(request: NextRequest) {
  let input: SubmissionInput;
  try {
    input = await parseSubmissionRequest(request);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid submission body" },
      { status: 400 },
    );
  }

  // Verify the coach exists before creating a submission.
  if (input.coachSlug && !await getCoachBySlug(input.coachSlug)) {
    return NextResponse.json(
      { error: "Selected coach not found" },
      { status: 404 },
    );
  }

  const errors = validateSubmissionInput(input);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", errors },
      { status: 422 },
    );
  }

  try {
    const submission = await createSubmission(input);
    return NextResponse.json(
      {
        id: submission.id,
        status: submission.status,
        coachSlug: submission.coachSlug,
        videoUrl: submission.videoUrl,
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create submission" },
      { status: 500 },
    );
  }
}
